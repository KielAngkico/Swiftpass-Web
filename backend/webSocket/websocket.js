
const WebSocket = require("ws");
const dbSuperAdmin = require("../db");
const jwt = require("jsonwebtoken");
const {
  handleStaffScan,
  handleEntryExit,
  handleDayPassGuest,
  handleMember
} = require("./handlers");
const {
  getRfidAllocation,
  validateScanModeRfid,
  isRfidRegistered
} = require("./rfidAllocationHelper");

let connectedClients = [];
let adminScanModes = {};

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    const authTimeout = setTimeout(() => {
      if (!ws.clientType) ws.close();
    }, 10000);

    ws.once("message", async (message) => {
      clearTimeout(authTimeout);

      try {
        const authMsg = JSON.parse(message);

        if (authMsg.type === "auth-dashboard") {
          try {
            const decoded = jwt.verify(authMsg.token, process.env.JWT_SECRET);
            ws.clientType = "dashboard";

            if (decoded.role === "superadmin") {
              ws.isSuperAdmin = true;
              ws.admin_id = null;
              ws.user_id = decoded.id;
            } else {
              ws.isSuperAdmin = false;
              ws.admin_id = decoded.adminId || decoded.admin_id || decoded.id;
              ws.user_id = decoded.id;
            }

            ws.send(JSON.stringify({
              type: "auth-success",
              admin_id: ws.admin_id,
              isSuperAdmin: ws.isSuperAdmin
            }));
          } catch (err) {
            console.error("❌ Dashboard auth failed:", err.message);
            ws.send(JSON.stringify({ type: "auth-failed", reason: "Invalid token" }));
            ws.close();
            return;
          }

        } else if (authMsg.type === "auth-arduino") {
          if (authMsg.secret === process.env.ARDUINO_SECRET) {
            ws.clientType = "arduino";

            if (authMsg.admin_id) {
              ws.admin_id = authMsg.admin_id;
              ws.location = authMsg.location || "UNKNOWN";
              ws.isSuperAdmin = false;
            } else {
              ws.admin_id = null;
              ws.location = authMsg.location || "SUPERADMIN";
              ws.isSuperAdmin = true;
            }

            ws.send(JSON.stringify({ type: "auth-success" }));
          } else {
            ws.send(JSON.stringify({ type: "auth-failed", reason: "Invalid secret" }));
            ws.close();
            return;
          }

        } else {
          ws.send(JSON.stringify({ type: "error", message: "Unknown client type" }));
          ws.close();
          return;
        }

        connectedClients.push(ws);
        ws.on("message", (msg) => handleMessage(ws, msg));

        ws.on("close", () => {
          connectedClients = connectedClients.filter((client) => client !== ws);
          if (ws.clientType === "dashboard" && ws.admin_id) {
            delete adminScanModes[ws.admin_id];
            if (adminScanModes.replacement) {
              delete adminScanModes.replacement[ws.admin_id];
            }
          }
        });

      } catch (err) {
        console.error("❌ Auth error:", err.message);
        ws.send(JSON.stringify({ type: "error", message: "Authentication failed" }));
        ws.close();
      }
    });

    ws.on("close", () => clearTimeout(authTimeout));
  });
}

async function getStaffByRfid(rfidTag, adminId = null) {
  try {
    let query = "SELECT id, staff_name, admin_id FROM StaffAccounts WHERE rfid_tag = ?";
    let params = [rfidTag];

    if (adminId !== null) {
      query += " AND admin_id = ?";
      params.push(adminId);
    }

    query += " LIMIT 1";

    const [rows] = await dbSuperAdmin.promise().query(query, params);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("❌ Staff check error:", error.message);
    return null;
  }
}

async function getAdminByRfid(rfidTag) {
  try {
    const [rows] = await dbSuperAdmin.promise().query(
      "SELECT id, admin_name FROM AdminAccounts WHERE rfid_tag = ? OR rfid_tag_2 = ? LIMIT 1",
      [rfidTag, rfidTag]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("❌ Admin check error:", error.message);
    return null;
  }
}

async function getMemberByRfid(rfidTag, adminId = null) {
  try {
    let query = "SELECT id, full_name, status, admin_id FROM MembersAccounts WHERE rfid_tag = ?";
    let params = [rfidTag];

    if (adminId !== null) {
      query += " AND admin_id = ?";
      params.push(adminId);
    }

    query += " LIMIT 1";

    const [rows] = await dbSuperAdmin.promise().query(query, params);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("❌ Member check error:", error.message);
    return null;
  }
}

async function logStaffActivity(rfidTag, staffData, location, activityType) {
  try {
    await dbSuperAdmin.promise().query(
      `INSERT INTO StaffActivityLogs
      (rfid_tag, staff_id, staff_name, admin_id, location, activity_type, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [rfidTag, staffData.id, staffData.staff_name, staffData.admin_id, location, activityType, new Date()]
    );
  } catch (error) {
    console.error("❌ Staff log error:", error.message);
  }
}

function broadcastToClients(data) {
  if (data.type === "rfid-registration-check") {
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN &&
          client.clientType === "dashboard" &&
          client.isSuperAdmin === true) {
        client.send(JSON.stringify(data));
      }
    });
    return;
  }

  if (data.type === "rfid-scanned-for-staff" ||
      data.type === "scan-mode-updated" ||
      data.type === "rfid-replacement-scanned" ||
      data.type === "replacement-scan-mode-updated") {
    if (!data.data || !data.data.admin_id) return;

    const targetAdminId = data.data.admin_id;
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN &&
          client.clientType === "dashboard" &&
          client.admin_id === targetAdminId) {
        client.send(JSON.stringify(data));
      }
    });
    return;
  }

  if (!data || !data.data || !data.data.admin_id) return;

  const targetAdminId = data.data.admin_id;

  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN &&
        client.admin_id === targetAdminId) {

      if (client.clientType === "dashboard") {
        client.send(JSON.stringify(data));
      } else if (client.clientType === "arduino") {
        if (client.location === "LOCK" || client.location === data.data.location) {
          client.send(JSON.stringify(data));
        }
      }
    }
  });
}

async function handleMessage(ws, message) {
  try {
    const parsed = JSON.parse(message);

    // ============= SCAN MODE TOGGLES =============
    if (parsed.type === "toggle-scan-mode") {
      const admin_id = ws.admin_id;
      if (!admin_id && !ws.isSuperAdmin) {
        ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
        return;
      }

      adminScanModes[admin_id] = parsed.enabled;

      broadcastToClients({
        type: "scan-mode-updated",
        data: {
          enabled: parsed.enabled,
          admin_id
        }
      });
      return;
    }

    if (parsed.type === "toggle-replacement-scan-mode") {
      const admin_id = ws.admin_id;
      if (!admin_id && !ws.isSuperAdmin) {
        ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
        return;
      }

      if (!adminScanModes.replacement) {
        adminScanModes.replacement = {};
      }
      adminScanModes.replacement[admin_id] = parsed.enabled;

      broadcastToClients({
        type: "replacement-scan-mode-updated",
        data: {
          enabled: parsed.enabled,
          admin_id
        }
      });
      return;
    }

    const { rfid_tag, location } = parsed;
    if (!rfid_tag || !location) {
      ws.send(JSON.stringify({ type: "error", message: "Missing rfid_tag or location" }));
      return;
    }

    const scanner_admin_id = ws.admin_id; // Admin ID from scanner/websocket

// ✅ NEW - Allow STAFF location without admin_id (will use allocation routing)
if (location.toUpperCase() !== "SUPERADMIN" && 
    location.toUpperCase() !== "STAFF" && 
    !scanner_admin_id) {
  ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
  return;
}

    // ============= REPLACEMENT SCAN MODE =============
    if (adminScanModes.replacement && adminScanModes.replacement[scanner_admin_id] === true) {
      // Get RFID allocation to verify ownership
      const allocation = await getRfidAllocation(rfid_tag);
      
      if (!allocation || !allocation.isValid) {
        broadcastToClients({
          type: "rfid-replacement-scanned",
          data: {
            rfid_tag,
            admin_id: scanner_admin_id,
            status: "error",
            reason: allocation ? allocation.reason : "RFID not found in system",
            timestamp: new Date().toISOString()
          }
        });
      } else if (allocation.allocated_to_admin !== scanner_admin_id) {
        // RFID belongs to different gym
        broadcastToClients({
          type: "rfid-replacement-scanned",
          data: {
            rfid_tag,
            admin_id: scanner_admin_id,
            status: "error",
            reason: "This RFID is allocated to a different gym",
            timestamp: new Date().toISOString()
          }
        });
      } else {
        // Valid replacement scan
        broadcastToClients({
          type: "rfid-replacement-scanned",
          data: {
            rfid_tag,
            admin_id: scanner_admin_id,
            rfid_type: allocation.rfid_type,
            role: allocation.role,
            status: "success",
            timestamp: new Date().toISOString()
          }
        });
      }

      adminScanModes.replacement[scanner_admin_id] = false;

      broadcastToClients({
        type: "replacement-scan-mode-updated",
        data: {
          enabled: false,
          admin_id: scanner_admin_id
        }
      });
      return;
    }

    // ============= STAFF REGISTRATION SCAN MODE =============
    if (adminScanModes[scanner_admin_id] === true) {
      const validation = await validateScanModeRfid(rfid_tag, scanner_admin_id);
      
      if (!validation.valid) {
        adminScanModes[scanner_admin_id] = false;
        
        // Silent fail for Partner RFIDs from other gyms
        if (!validation.silent) {
          broadcastToClients({
            type: "rfid-scanned-for-staff",
            data: {
              rfid_tag,
              admin_id: scanner_admin_id,
              status: "error",
              reason: validation.reason,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        broadcastToClients({
          type: "scan-mode-updated",
          data: { enabled: false, admin_id: scanner_admin_id }
        });
        return;
      }

      const allocation = validation.allocation;

      // Check for duplicates in StaffAccounts
      const staffMemberCheck = await getStaffByRfid(rfid_tag, scanner_admin_id);
      if (staffMemberCheck) {
        adminScanModes[scanner_admin_id] = false;
        broadcastToClients({
          type: "rfid-scanned-for-staff",
          data: {
            rfid_tag,
            admin_id: scanner_admin_id,
            status: "error",
            reason: `Duplicate RFID - already assigned to ${staffMemberCheck.staff_name}`,
            timestamp: new Date().toISOString()
          }
        });
        broadcastToClients({
          type: "scan-mode-updated",
          data: { enabled: false, admin_id: scanner_admin_id }
        });
        return;
      }

      // Check for duplicates in AdminAccounts
      const adminMemberCheck = await getAdminByRfid(rfid_tag);
      if (adminMemberCheck) {
        adminScanModes[scanner_admin_id] = false;
        broadcastToClients({
          type: "rfid-scanned-for-staff",
          data: {
            rfid_tag,
            admin_id: scanner_admin_id,
            status: "error",
            reason: `Duplicate RFID - already assigned to Admin ${adminMemberCheck.admin_name}`,
            timestamp: new Date().toISOString()
          }
        });
        broadcastToClients({
          type: "scan-mode-updated",
          data: { enabled: false, admin_id: scanner_admin_id }
        });
        return;
      }

      // Check for duplicates in MembersAccounts
      const memberCheckScan = await getMemberByRfid(rfid_tag, scanner_admin_id);
      if (memberCheckScan) {
        adminScanModes[scanner_admin_id] = false;
        broadcastToClients({
          type: "rfid-scanned-for-staff",
          data: {
            rfid_tag,
            admin_id: scanner_admin_id,
            status: "error",
            reason: `Duplicate RFID - already assigned to Member ${memberCheckScan.full_name}`,
            timestamp: new Date().toISOString()
          }
        });
        broadcastToClients({
          type: "scan-mode-updated",
          data: { enabled: false, admin_id: scanner_admin_id }
        });
        return;
      }

      // All checks passed - RFID is ready for registration
      broadcastToClients({
        type: "rfid-scanned-for-staff",
        data: {
          rfid_tag,
          admin_id: allocation.allocated_to_admin,
          rfid_type: allocation.rfid_type,
          role: allocation.role,
          status: "success",
          reason: "RFID ready for registration",
          timestamp: new Date().toISOString()
        }
      });

      adminScanModes[scanner_admin_id] = false;
      broadcastToClients({
        type: "scan-mode-updated",
        data: { enabled: false, admin_id: scanner_admin_id }
      });
      return;
    }

    // ============= SUPERADMIN LOCATION =============
// ============= SUPERADMIN LOCATION =============
if (location.toUpperCase() === "SUPERADMIN") {
  const allocation = await getRfidAllocation(rfid_tag);
  
  if (!allocation || !allocation.isValid) {
    broadcastToClients({
      type: "rfid-registration-check",
      data: {
        rfid_tag,
        is_registered: false,
        error: allocation ? allocation.reason : "RFID not found",
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Check if it's a Partner RFID
  if (allocation.role === 'Partner') {
    broadcastToClients({
      type: "rfid-registration-check",
      data: {
        rfid_tag,
        is_registered: true,
        role: 'Partner',
        timestamp: new Date().toISOString()
      }
    });
  } else {
    // Member or DayPass card
    broadcastToClients({
      type: "rfid-registration-check",
      data: {
        rfid_tag,
        is_registered: true,
        role: allocation.role,
        error: `This is a ${allocation.role} card, not for admin registration`,
        timestamp: new Date().toISOString()
      }
    });
  }
  return;
}

    // ============= GET RFID ALLOCATION FOR ROUTING =============
    const allocation = await getRfidAllocation(rfid_tag);
    
    // Use allocation admin_id if available, otherwise fallback to scanner admin_id
    const target_admin_id = allocation?.allocated_to_admin || scanner_admin_id;

    console.log(`📍 RFID Scan at ${location}:`, {
      rfid_tag,
      scanner_admin_id,
      allocated_to_admin: allocation?.allocated_to_admin,
      target_admin_id,
      role: allocation?.role,
      rfid_type: allocation?.rfid_type
    });

// ============= STAFF LOCATION HANDLER =============
// Replace this entire section in your websocket.js handleMessage function

// ============= STAFF LOCATION HANDLER =============
if (location.toUpperCase() === "STAFF") {
  console.log(`\n📍 ===== STAFF LOCATION SCAN =====`);
  console.log(`   RFID Tag: ${rfid_tag}`);
  console.log(`   Scanner Admin ID: ${scanner_admin_id}`);
  console.log(`   Target Admin ID: ${target_admin_id}`);
  console.log(`   Active Scan Modes:`, adminScanModes);
  
  // Get allocation first
  const allocation = await getRfidAllocation(rfid_tag);
  
  if (!allocation || !allocation.isValid) {
    broadcastToClients({
      type: "staff-scan",
      data: {
        rfid_tag,
        status: "unregistered",
        reason: allocation ? allocation.reason : "RFID not registered with SwiftPass company",
        location,
        admin_id: target_admin_id,
        timestamp: new Date().toISOString()
      }
    });
    console.log(`===== END STAFF SCAN =====\n`);
    return;
  }

  // ============= CHECK FOR ACTIVE SCAN MODE =============
  const activeScanModeAdmin = Object.keys(adminScanModes).find(
    adminId => adminScanModes[adminId] === true
  );
  
  if (activeScanModeAdmin) {
    console.log(`✅ SCAN MODE ACTIVE for admin: ${activeScanModeAdmin}`);
    console.log(`🔍 Processing employee registration scan...`);
    
    // MUST BE PARTNER RFID for employee registration
    if (allocation.role !== 'Partner') {
      console.log(`❌ Not a Partner RFID - role: ${allocation.role}`);
      adminScanModes[activeScanModeAdmin] = false;
      
      broadcastToClients({
        type: "rfid-scanned-for-staff",
        data: {
          rfid_tag,
          admin_id: parseInt(activeScanModeAdmin),
          status: "error",
          reason: `Use Partner RFID for employee registration. This is a ${allocation.role} card.`,
          timestamp: new Date().toISOString()
        }
      });
      
      broadcastToClients({
        type: "scan-mode-updated",
        data: { enabled: false, admin_id: parseInt(activeScanModeAdmin) }
      });
      console.log(`🔴 Scan mode disabled\n`);
      return;
    }
    
    // Validate RFID for scan mode
    const validation = await validateScanModeRfid(rfid_tag, parseInt(activeScanModeAdmin));
    
    if (!validation.valid) {
      console.log(`❌ Validation Failed: ${validation.reason}`);
      adminScanModes[activeScanModeAdmin] = false;
      
      if (!validation.silent) {
        broadcastToClients({
          type: "rfid-scanned-for-staff",
          data: {
            rfid_tag,
            admin_id: parseInt(activeScanModeAdmin),
            status: "error",
            reason: validation.reason,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      broadcastToClients({
        type: "scan-mode-updated",
        data: { enabled: false, admin_id: parseInt(activeScanModeAdmin) }
      });
      console.log(`🔴 Scan mode disabled\n`);
      return;
    }

    // ============= CHECK FOR DUPLICATES =============
    console.log(`🔍 Checking for duplicate RFID assignments...`);
    
    const staffCheck = await getStaffByRfid(rfid_tag, parseInt(activeScanModeAdmin));
    if (staffCheck) {
      console.log(`❌ DUPLICATE - Already assigned to Staff: ${staffCheck.staff_name}`);
      adminScanModes[activeScanModeAdmin] = false;
      
      broadcastToClients({
        type: "rfid-scanned-for-staff",
        data: {
          rfid_tag,
          admin_id: parseInt(activeScanModeAdmin),
          status: "error",
          reason: `Duplicate RFID - already assigned to Staff ${staffCheck.staff_name}`,
          timestamp: new Date().toISOString()
        }
      });
      
      broadcastToClients({
        type: "scan-mode-updated",
        data: { enabled: false, admin_id: parseInt(activeScanModeAdmin) }
      });
      console.log(`🔴 Scan mode disabled\n`);
      return;
    }

    const adminCheck = await getAdminByRfid(rfid_tag);
    if (adminCheck) {
      console.log(`❌ DUPLICATE - Already assigned to Admin: ${adminCheck.admin_name}`);
      adminScanModes[activeScanModeAdmin] = false;
      
      broadcastToClients({
        type: "rfid-scanned-for-staff",
        data: {
          rfid_tag,
          admin_id: parseInt(activeScanModeAdmin),
          status: "error",
          reason: `Duplicate RFID - already assigned to Admin ${adminCheck.admin_name}`,
          timestamp: new Date().toISOString()
        }
      });
      
      broadcastToClients({
        type: "scan-mode-updated",
        data: { enabled: false, admin_id: parseInt(activeScanModeAdmin) }
      });
      console.log(`🔴 Scan mode disabled\n`);
      return;
    }

    const memberCheck = await getMemberByRfid(rfid_tag, parseInt(activeScanModeAdmin));
    if (memberCheck) {
      console.log(`❌ DUPLICATE - Already assigned to Member: ${memberCheck.full_name}`);
      adminScanModes[activeScanModeAdmin] = false;
      
      broadcastToClients({
        type: "rfid-scanned-for-staff",
        data: {
          rfid_tag,
          admin_id: parseInt(activeScanModeAdmin),
          status: "error",
          reason: `Duplicate RFID - already assigned to Member ${memberCheck.full_name}`,
          timestamp: new Date().toISOString()
        }
      });
      
      broadcastToClients({
        type: "scan-mode-updated",
        data: { enabled: false, admin_id: parseInt(activeScanModeAdmin) }
      });
      console.log(`🔴 Scan mode disabled\n`);
      return;
    }

    // ============= ALL CHECKS PASSED - SUCCESS! =============
    console.log(`✅ All validation checks passed!`);
    console.log(`📤 Broadcasting SUCCESS to admin: ${allocation.allocated_to_admin}`);
    
    broadcastToClients({
      type: "rfid-scanned-for-staff",
      data: {
        rfid_tag,
        admin_id: allocation.allocated_to_admin,
        rfid_type: allocation.rfid_type,
        role: allocation.role,
        status: "success",
        reason: "RFID ready for registration",
        timestamp: new Date().toISOString()
      }
    });

    adminScanModes[activeScanModeAdmin] = false;
    broadcastToClients({
      type: "scan-mode-updated",
      data: { enabled: false, admin_id: parseInt(activeScanModeAdmin) }
    });
    
    console.log(`✅ Scan mode processing complete!`);
    console.log(`🔴 Scan mode disabled`);
    console.log(`===== END STAFF SCAN =====\n`);
    return;
  }
  
  // ============= NO SCAN MODE - NORMAL FLOW =============
  console.log(`ℹ️ No scan mode active - checking role-based routing`);
  
  // Partner RFID in normal scan
  if (allocation.role === 'Partner') {
    broadcastToClients({
      type: "staff-scan",
      data: {
        rfid_tag,
        status: "partner_card",
        reason: "This is a Partner card - for admin use only",
        location,
        admin_id: target_admin_id,
        timestamp: new Date().toISOString()
      }
    });
    console.log(`===== END STAFF SCAN =====\n`);
    return;
  }
  
  // Member RFID - always go to AddMember
  if (allocation.role === 'Member') {
    const memberCheck = await getMemberByRfid(rfid_tag, target_admin_id);
    if (memberCheck) {
      broadcastToClients({
        type: "staff-scan",
        data: {
          rfid_tag,
          status: "member_found",
          full_name: memberCheck.full_name,
          location,
          admin_id: target_admin_id,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      broadcastToClients({
        type: "staff-scan",
        data: {
          rfid_tag,
          status: "unregistered",
          reason: "Ready for new member registration",
          rfid_type: allocation.rfid_type,
          role: allocation.role,
          location,
          admin_id: target_admin_id,
          timestamp: new Date().toISOString()
        }
      });
    }
    console.log(`===== END STAFF SCAN =====\n`);
    return;
  }
  
  // DayPass RFID - always go to DayPass
  if (allocation.role === 'DayPass') {
    broadcastToClients({
      type: "staff-scan",
      data: {
        rfid_tag,
        status: "daypass_ready",
        reason: "Ready for day pass registration",
        rfid_type: allocation.rfid_type,
        role: allocation.role,
        location,
        admin_id: target_admin_id,
        timestamp: new Date().toISOString()
      }
    });
    console.log(`===== END STAFF SCAN =====\n`);
    return;
  }

  console.log(`===== END STAFF SCAN =====\n`);
  return;
}

    // ============= ENTRY/EXIT LOCATION =============
    if (["ENTRY", "EXIT"].includes(location.toUpperCase())) {
      await handleEntryExit(rfid_tag, location, target_admin_id, allocation, {
        isRfidRegistered,
        getStaffByRfid,
        getAdminByRfid,
        logStaffActivity,
        broadcastToClients,
        handleDayPassGuest,
        handleMember,
        dbSuperAdmin
      });
      return;
    }

  } catch (err) {
    console.error("❌ Message error:", err.message);
    ws.send(JSON.stringify({ type: "error", message: err.message }));
  }
}

module.exports = { setupWebSocket, broadcastToClients };