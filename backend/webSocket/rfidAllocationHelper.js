

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

    console.log(`RFID Allocation Found:`, {
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


/**
 * Get all RFIDs allocated to a specific admin
 * @param {number} adminId - The admin ID
 * @returns {Array} - Array of allocated RFIDs
 */


/**
 * Determine routing destination based on RFID allocation
 * @param {Object} allocation - RFID allocation data
 * @param {string} location - Scan location (STAFF, ENTRY, EXIT)
 * @returns {Object} - Routing instructions
 */


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
          silent: true
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

    // ✅ NEW: Check if already assigned to a staff member
if (allocation.status === 'in_use') {
      return {
        valid: false,
        reason: 'This RFID card is already in use'
      };
    }

    const [staffRows] = await dbSuperAdmin.promise().query(
      `SELECT staff_name FROM StaffAccounts WHERE rfid_tag = ? AND admin_id = ? LIMIT 1`,
      [rfidTag, requestingAdminId]
    );

    if (staffRows.length > 0) {
      return {
        valid: false,
        reason: `RFID already assigned to Staff: ${staffRows[0].staff_name}`
      };
    }

    const [adminRows] = await dbSuperAdmin.promise().query(
      `SELECT admin_name FROM AdminAccounts WHERE rfid_tag = ? OR rfid_tag_2 = ? LIMIT 1`,
      [rfidTag, rfidTag]
    );

    if (adminRows.length > 0) {
      return {
        valid: false,
        reason: `RFID already assigned to Admin: ${adminRows[0].admin_name}`
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

async function validateReplacementRfid(rfidTag, requestingAdminId) {
  try {
    const allocation = await getRfidAllocation(rfidTag);

    if (!allocation) {
      return {
        valid: false,
        reason: 'RFID not registered with SwiftPass'
      };
    }

    if (!allocation.isValid) {
      return {
        valid: false,
        reason: allocation.reason
      };
    }

    // Must be allocated to the same admin
    if (allocation.allocated_to_admin !== requestingAdminId) {
      return {
        valid: false,
        reason: 'This RFID is allocated to a different gym'
      };
    }

    // Must be a Member wristband
    if (allocation.role !== 'Member') {
      return {
        valid: false,
        reason: `This is a ${allocation.role} card — only Member wristbands can be replaced here`
      };
    }

    // Must not already be in use
    if (allocation.status === 'in_use') {
      return {
        valid: false,
        reason: 'This RFID card is already assigned to a member'
      };
    }

    return {
      valid: true,
      allocation
    };

  } catch (error) {
    console.error("❌ Replacement RFID validation error:", error.message);
    return {
      valid: false,
      reason: 'System error during validation'
    };
  }
}
module.exports = {
  getRfidAllocation,
  validateScanModeRfid,
  validateReplacementRfid
};
