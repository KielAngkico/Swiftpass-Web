
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

function broadcastToClients(data, arduinoOnly = false) {
  if (arduinoOnly === true) {
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.clientType === "arduino") {
      // Optional: match by location if included
      if (!data.data?.location || client.location?.toUpperCase() === data.data.location?.toUpperCase()) {
        client.send(JSON.stringify(data));
        console.log(`📡 Sent Arduino-only message to ${client.location}`);
      }
    }
  });
  return; // stop here — don't send to dashboards
}
  // Handle SuperAdmin RFID registration checks
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

  // Handle staff scan mode messages
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

  // ✅ Handle member-update messages (ENTRY/EXIT logs)
 // ✅ Handle member-update messages (ENTRY/EXIT logs)
if (data.type === "member-update") {
  if (!data.data || !data.data.admin_id) {
    console.log("⚠️ member-update missing admin_id, broadcasting to all");
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.clientType === "dashboard") {
        client.send(JSON.stringify(data));
      }
    });
    return;
  }

  const targetAdminId = data.data.admin_id;
  const messageLocation = data.data.location; // ENTRY or EXIT
  
  console.log(`📡 Broadcasting member-update to admin: ${targetAdminId}`);
  console.log(`   Location: ${messageLocation}`);

  let sentCount = 0;
  
  connectedClients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;

    // ✅ Send to dashboard clients (Staff/Admin viewing)
    if (client.clientType === "dashboard" && client.admin_id === targetAdminId) {
      client.send(JSON.stringify(data));
      sentCount++;
      console.log(`   ✅ Sent to dashboard client (admin_id: ${client.admin_id})`);
    }
    
    // ✅ NEW: Send to Arduino clients at the same location
    if (client.clientType === "arduino") {
      // Send to ENTRY/EXIT arduinos regardless of admin_id (they need to control door/buzzer)
      if (["ENTRY", "EXIT"].includes(client.location?.toUpperCase()) && 
          client.location?.toUpperCase() === messageLocation?.toUpperCase()) {
        client.send(JSON.stringify(data));
        sentCount++;
        console.log(`   ✅ Sent to Arduino at ${client.location}`);
      }
    }
  });

  if (sentCount === 0) {
    console.log(`   ⚠️ No connected clients for admin ${targetAdminId} at ${messageLocation}`);
  } else {
    console.log(`   📊 Sent to ${sentCount} client(s)`);
  }
  return;
}

  // Default handler for other message types
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
    console.log("\n🔵 ===== RECEIVED MESSAGE =====");
    console.log("Raw message:", message.toString());
    
    const parsed = JSON.parse(message);
    console.log("Parsed:", JSON.stringify(parsed, null, 2));

    // ============= SCAN MODE TOGGLES =============
    if (parsed.type === "toggle-scan-mode") {
      console.log("📍 Handling toggle-scan-mode");
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
      console.log("📍 Handling toggle-replacement-scan-mode");
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

    // ✅ ADD THIS CHECK - Is this an RFID scan?
    const { rfid_tag, location } = parsed;
    
    console.log("📍 Extracted from message:");
    console.log("   rfid_tag:", rfid_tag);
    console.log("   location:", location);
    
    if (!rfid_tag || !location) {
      console.log("❌ Missing rfid_tag or location - sending error");
      ws.send(JSON.stringify({ type: "error", message: "Missing rfid_tag or location" }));
      return;
    }

    console.log("✅ Valid RFID scan detected");
    console.log("   Location:", location.toUpperCase());
    console.log("   RFID Tag:", rfid_tag);

    const scanner_admin_id = ws.admin_id;
    console.log("   Scanner Admin ID:", scanner_admin_id);

    // Check authentication for non-STAFF/non-ENTRY/non-EXIT locations
    if (location.toUpperCase() !== "SUPERADMIN" && 
        location.toUpperCase() !== "STAFF" && 
        location.toUpperCase() !== "ENTRY" &&
        location.toUpperCase() !== "EXIT" &&
        !scanner_admin_id) {
      console.log("❌ Authentication required for this location");
      ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
      return;
    }

    console.log("✅ Authentication check passed");
    
    // ============= ENTRY/EXIT LOCATION =============
    if (["ENTRY", "EXIT"].includes(location.toUpperCase())) {
      console.log(`\n📍 ===== ENTRY/EXIT SCAN =====`);
      console.log(`   RFID Tag: ${rfid_tag}`);
      console.log(`   Location: ${location}`);
      console.log(`   Scanner Admin ID: ${scanner_admin_id}`);

      // ✅ ALWAYS get allocation first for ENTRY/EXIT
      console.log("🔍 Getting RFID allocation...");
      const allocation = await getRfidAllocation(rfid_tag);
      console.log("Allocation result:", allocation);
      
      if (!allocation || !allocation.isValid) {
        console.log(`❌ RFID not found or invalid`);
        broadcastToClients({
          type: "member-update",
          data: {
            rfid_tag,
            status: "unregistered",
            reason: allocation ? allocation.reason : "RFID not registered with SwiftPass",
            location,
            timestamp: new Date().toISOString()
          }
        });
        console.log(`===== END ENTRY/EXIT SCAN =====\n`);
        return;
      }

      // ✅ USE ALLOCATION'S ADMIN_ID (not scanner's admin_id)
      const target_admin_id = allocation.allocated_to_admin;
      
      console.log(`✅ RFID Allocated to Admin: ${target_admin_id}`);
      console.log(`   Role: ${allocation.role}`);
      console.log(`   RFID Type: ${allocation.rfid_type}`);
      console.log(`   Status: ${allocation.status}`);

      // ✅ Call handler with correct admin_id from allocation
      console.log("📞 Calling handleEntryExit...");
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
      
      console.log(`===== END ENTRY/EXIT SCAN =====\n`);
      return;
    }

    // ============= STAFF LOCATION =============
    if (location.toUpperCase() === "STAFF") {
      console.log(`\n📍 ===== STAFF SCAN =====`);
      console.log(`   RFID Tag: ${rfid_tag}`);
      console.log(`   Scanner Admin ID: ${scanner_admin_id}`);

      // ✅ Get RFID allocation first
      console.log("🔍 Getting RFID allocation...");
      const allocation = await getRfidAllocation(rfid_tag);
      console.log("Allocation result:", allocation);
      
      // ✅ Use allocation's admin_id (the gym that owns this RFID)
      const target_admin_id = allocation?.allocated_to_admin || scanner_admin_id;
      
      console.log(`   Target Admin ID: ${target_admin_id}`);
      console.log(`   Role: ${allocation?.role || 'Unknown'}`);
      console.log(`   RFID Type: ${allocation?.rfid_type || 'Unknown'}`);

      // ✅ Call handleStaffScan from handlers.js
      await handleStaffScan(rfid_tag, location, target_admin_id, allocation, {
        isRfidRegistered,
        getStaffByRfid,
        getAdminByRfid,
        getMemberByRfid,
        broadcastToClients,
        dbSuperAdmin
      });
      // ✅ Send RFID info back to the dashboard for Add Employee form
if (allocation && allocation.isValid) {
  broadcastToClients({
    type: "rfid-scanned-for-staff",
    data: {
      status: "success",
      rfid_tag,
      role: allocation.role?.toLowerCase() || "staff",
      admin_id: target_admin_id,
      location
    }
  });
} else {
  broadcastToClients({
    type: "rfid-scanned-for-staff",
    data: {
      status: "error",
      rfid_tag,
      reason: allocation?.reason || "Invalid or unregistered RFID",
      admin_id: target_admin_id,
      location
    }
  });
}

      
      console.log(`===== END STAFF SCAN =====\n`);
      return;
    }
// ============= SUPERADMIN LOCATION =============
if (location.toUpperCase() === "SUPERADMIN") {
  const allocation = await getRfidAllocation(rfid_tag);

  console.log("🔍 SUPERADMIN allocation check result:", allocation);

  // ✅ RFID NOT FOUND -> Go to ADD PARTNER
  if (!allocation) {
    broadcastToClients({
      type: "rfid-registration-check",
      data: {
        rfid_tag,
        is_registered: false,
        next_action: "add_partner",
        message: "RFID not found. Ready for new Partner registration.",
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // ✅ RFID FOUND -> Go to INVENTORY
  if (allocation.isValid) {
    broadcastToClients({
      type: "rfid-registration-check",
      data: {
        rfid_tag,
        is_registered: true,
        next_action: "open_inventory",
        role: allocation.role,
        admin_id: allocation.admin_id,
        message: "RFID already registered. Opening inventory details.",
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // ⚠️ If RFID exists but invalid status
  broadcastToClients({
    type: "rfid-registration-check",
    data: {
      rfid_tag,
      is_registered: false,
      next_action: "error",
      message: allocation.reason || "Invalid RFID status",
      timestamp: new Date().toISOString()
    }
  });
  return;
}


    console.log("⚠️ Location not handled:", location);

  } catch (err) {
    console.error("❌ Message error:", err.message);
    console.error("Stack trace:", err.stack);
    ws.send(JSON.stringify({ type: "error", message: err.message }));
  }
}

module.exports = { setupWebSocket, broadcastToClients };