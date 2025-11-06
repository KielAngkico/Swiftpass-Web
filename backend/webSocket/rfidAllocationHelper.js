

const dbSuperAdmin = require("../db");

/**
 * Get RFID allocation data from RegisteredRfid table
 * @param {string} rfidTag - The RFID tag to look up
 * @returns {Object|null} - Allocation data or null if not found
 */
async function getRfidAllocation(rfidTag) {
  try {
    const [rows] = await dbSuperAdmin.promise().query(
      `SELECT 
        rfid_tag,
        allocated_to_admin,
        rfid_type,
        role,
        status,
        warehouse_number,
        allocation_date,
        assigned_to_name,
        assignment_date
      FROM RegisteredRfid 
      WHERE rfid_tag = ? 
      LIMIT 1`,
      [rfidTag]
    );

    if (rows.length === 0) {
      console.log(`🔍 RFID not found in RegisteredRfid table: ${rfidTag}`);
      return null;
    }

    const allocation = rows[0];

    // Validate allocation status
    if (allocation.status === 'in_stock') {
      console.log(`⚠️ RFID is in_stock (not allocated): ${rfidTag}`);
      return {
        ...allocation,
        isValid: false,
        reason: 'RFID is available but not allocated to any gym'
      };
    }

    // allocated or in_use are both valid
    if (!['allocated', 'in_use'].includes(allocation.status)) {
      console.log(`⚠️ RFID has unexpected status '${allocation.status}': ${rfidTag}`);
      return {
        ...allocation,
        isValid: false,
        reason: `RFID status: ${allocation.status}`
      };
    }

    console.log(`✅ RFID Allocation Found:`, {
      rfid_tag: allocation.rfid_tag,
      allocated_to_admin: allocation.allocated_to_admin,
      rfid_type: allocation.rfid_type,
      role: allocation.role,
      status: allocation.status
    });

    return {
      ...allocation,
      isValid: true,
      admin_id: allocation.allocated_to_admin // Normalize for consistency
    };

  } catch (error) {
    console.error("❌ RFID allocation lookup error:", error.message);
    return null;
  }
}

/**
 * Check if RFID is allocated to a specific admin
 * @param {string} rfidTag - The RFID tag
 * @param {number} adminId - The admin ID to check against
 * @returns {boolean} - True if allocated to this admin
 */
async function isRfidAllocatedToAdmin(rfidTag, adminId) {
  try {
    const allocation = await getRfidAllocation(rfidTag);
    
    if (!allocation || !allocation.isValid) {
      return false;
    }

    // Partner RFIDs must match allocated_to_admin exactly
    if (allocation.role === 'Partner') {
      return allocation.allocated_to_admin === adminId;
    }

    // Member/DayPass RFIDs - check if allocated to this admin
    return allocation.allocated_to_admin === adminId;

  } catch (error) {
    console.error("❌ RFID admin check error:", error.message);
    return false;
  }
}

/**
 * Get all RFIDs allocated to a specific admin
 * @param {number} adminId - The admin ID
 * @returns {Array} - Array of allocated RFIDs
 */
async function getAdminAllocatedRfids(adminId) {
  try {
    const [rows] = await dbSuperAdmin.promise().query(
      `SELECT 
        rfid_tag,
        rfid_type,
        role,
        status,
        warehouse_number,
        allocation_date,
        assigned_to_name
      FROM RegisteredRfid 
      WHERE allocated_to_admin = ? AND status IN ('allocated', 'in_use')
      ORDER BY allocation_date DESC`,
      [adminId]
    );

    return rows;

  } catch (error) {
    console.error("❌ Admin RFIDs lookup error:", error.message);
    return [];
  }
}

/**
 * Determine routing destination based on RFID allocation
 * @param {Object} allocation - RFID allocation data
 * @param {string} location - Scan location (STAFF, ENTRY, EXIT)
 * @returns {Object} - Routing instructions
 */
function determineRouting(allocation, location) {
  if (!allocation || !allocation.isValid) {
    return {
      route: 'error',
      reason: allocation ? allocation.reason : 'RFID not found in system'
    };
  }

  const { role, rfid_type, allocated_to_admin } = allocation;

  // STAFF Location Routing
  if (location.toUpperCase() === 'STAFF') {
    if (role === 'Member') {
      return {
        route: 'check_member_exists',
        action: 'navigate_to_renewal_or_add',
        rfid_type,
        admin_id: allocated_to_admin
      };
    }

    if (role === 'DayPass') {
      return {
        route: 'daypass_registration',
        action: 'navigate_to_daypass_form',
        rfid_type,
        admin_id: allocated_to_admin
      };
    }

    if (role === 'Partner') {
      return {
        route: 'partner_check',
        action: 'verify_admin_match',
        rfid_type,
        admin_id: allocated_to_admin,
        requiresAdminMatch: true
      };
    }
  }

  // ENTRY/EXIT Location Routing
  if (['ENTRY', 'EXIT'].includes(location.toUpperCase())) {
    return {
      route: 'entry_exit_flow',
      action: 'check_member_staff_admin',
      rfid_type,
      admin_id: allocated_to_admin,
      role
    };
  }

  return {
    route: 'default',
    action: 'standard_flow',
    rfid_type,
    admin_id: allocated_to_admin,
    role
  };
}

/**
 * Validate RFID allocation for scan mode (Partner/Staff Registration)
 * @param {string} rfidTag - The RFID tag
 * @param {number} requestingAdminId - Admin who initiated scan mode
 * @returns {Object} - Validation result
 */
async function validateScanModeRfid(rfidTag, requestingAdminId) {
  try {
    const allocation = await getRfidAllocation(rfidTag);

    if (!allocation) {
      return {
        valid: false,
        reason: 'RFID not registered with SwiftPass company'
      };
    }

    if (!allocation.isValid) {
      return {
        valid: false,
        reason: allocation.reason
      };
    }

    // Partner RFIDs must be allocated to requesting admin
    if (allocation.role === 'Partner') {
      if (allocation.allocated_to_admin !== requestingAdminId) {
        return {
          valid: false,
          reason: 'This Partner RFID is allocated to another gym',
          silent: true // Don't broadcast to non-owner
        };
      }
    }

    // Check if RFID belongs to this admin
    if (allocation.allocated_to_admin !== requestingAdminId) {
      return {
        valid: false,
        reason: `This ${allocation.role} RFID is allocated to a different gym`,
        silent: false
      };
    }

    return {
      valid: true,
      allocation
    };

  } catch (error) {
    console.error("❌ Scan mode validation error:", error.message);
    return {
      valid: false,
      reason: 'System error during validation'
    };
  }
}

/**
 * Check if RFID exists in RegisteredRfid table (for SuperAdmin check)
 * @param {string} rfidTag - The RFID tag
 * @returns {boolean} - True if exists
 */
async function isRfidRegistered(rfidTag) {
  try {
    const [rows] = await dbSuperAdmin.promise().query(
      "SELECT id FROM RegisteredRfid WHERE rfid_tag = ? LIMIT 1",
      [rfidTag]
    );
    return rows.length > 0;
  } catch (error) {
    console.error("❌ RFID registration check error:", error.message);
    return false;
  }
}

module.exports = {
  getRfidAllocation,
  isRfidAllocatedToAdmin,
  getAdminAllocatedRfids,
  determineRouting,
  validateScanModeRfid,
  isRfidRegistered
};