
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
  validateScanModeRfid
} = require("./rfidAllocationHelper");

let connectedClients = [];
let adminScanModes = {};

function setupWebSocket(server) {
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  
  // Log the connection attempt so you can see it in your terminal
  console.log(`🔍 WebSocket upgrade attempt for path: ${pathname}`);

  const allowedPaths = ['/ws', '/ws/', '/arduino-ws'];

  if (allowedPaths.includes(pathname)) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    console.log(`🚫 Rejected connection at: ${pathname}`);
    socket.destroy();
  }
});
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

async function getSuperAdminByRfid(rfidTag) {
  try {
    const [rows] = await dbSuperAdmin.promise().query(
      "SELECT id, superadmin_name FROM SuperAdminAccounts WHERE rfid_tag = ? LIMIT 1",
      [rfidTag]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("❌ SuperAdmin check error:", error.message);
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
// Handle SuperAdmin RFID registration checks + partner slot results
if (data.type === "rfid-registration-check" || data.type === "partner-slot-scan-result") {
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN &&
          client.clientType === "dashboard" &&
          client.isSuperAdmin === true) {
        client.send(JSON.stringify(data));
      }
    });
    return;
  }

  if (data.type === "dashboard-alert") {
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

  if (data.type === "staff-scan") {
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
    console.log("member-update dropped - missing admin_id");
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
// ✅ NEW: Send to Arduino clients at the same location
if (client.clientType === "arduino") {
  // ✅ Send to ENTRY/EXIT arduinos matching the location
  if (["ENTRY", "EXIT"].includes(client.location?.toUpperCase()) && 
      client.location?.toUpperCase() === messageLocation?.toUpperCase()) {
    client.send(JSON.stringify(data));
    sentCount++;
    console.log(`   ✅ Sent to Arduino at ${client.location}`);
  }
  
  // ✅ ALSO send to LOCK arduino for ALL entry/exit events
  if (client.location?.toUpperCase() === "LOCK" && 
      ["ENTRY", "EXIT"].includes(messageLocation?.toUpperCase())) {
    client.send(JSON.stringify(data));
    sentCount++;
    console.log(`   ✅ Sent to LOCK Arduino`);
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
if (parsed.type === "toggle-partner-slot-mode") {
      if (!adminScanModes.partnerSlot) {
        adminScanModes.partnerSlot = {};
      }
      if (!adminScanModes.partnerSlotTimers) {
        adminScanModes.partnerSlotTimers = {};
      }
      if (parsed.enabled) {
        adminScanModes.partnerSlot[parsed.admin_id] = { slot: parsed.slot };
        adminScanModes.partnerSlotTimers[parsed.admin_id] = setTimeout(() => {
          delete adminScanModes.partnerSlot[parsed.admin_id];
          delete adminScanModes.partnerSlotTimers[parsed.admin_id];
          broadcastToClients({
            type: "partner-slot-scan-result",
            data: {
              status: "timeout",
              slot: parsed.slot,
              reason: "Partner slot scan timed out",
              admin_id: parsed.admin_id
            }
          });
        }, 60000);
      } else {
        delete adminScanModes.partnerSlot[parsed.admin_id];
        if (adminScanModes.partnerSlotTimers[parsed.admin_id]) {
          clearTimeout(adminScanModes.partnerSlotTimers[parsed.admin_id]);
          delete adminScanModes.partnerSlotTimers[parsed.admin_id];
        }
      }
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

  // ✅ CHECK SUPERADMIN FIRST
  const superAdminMember = await getSuperAdminByRfid(rfid_tag);
  if (superAdminMember) {
    console.log(`✅ SuperAdmin Found: ${superAdminMember.superadmin_name}`);

const payload = JSON.stringify({
      type: "member-update",
      data: {
        rfid_tag,
        full_name: superAdminMember.superadmin_name,
        visitor_type: "Admin",
        status: "admin_granted",
        reason: "System access",
        location,
        timestamp: new Date().toISOString()
      }
    });

    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.clientType === "arduino") {
        if (client.location?.toUpperCase() === location.toUpperCase() ||
            client.location?.toUpperCase() === "LOCK") {
          client.send(payload);
          console.log(`   ✅ Sent to Arduino at ${client.location}`);
        }
      }
    });

    console.log(`===== END ENTRY/EXIT SCAN =====\n`);
    return;
  }

  // ✅ CHECK ADMIN SECOND
  const adminMember = await getAdminByRfid(rfid_tag);
  if (adminMember) {
    console.log(`✅ Admin Found: ${adminMember.admin_name}`);

const payload = JSON.stringify({
      type: "member-update",
      data: {
        rfid_tag,
        full_name: adminMember.admin_name,
        visitor_type: "Admin",
        status: "admin_granted",
        reason: "Admin access - door open",
        location,
        timestamp: new Date().toISOString()
      }
    });

    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.clientType === "arduino") {
        if (client.location?.toUpperCase() === location.toUpperCase() ||
            client.location?.toUpperCase() === "LOCK") {
          client.send(payload);
          console.log(`   ✅ Sent to Arduino at ${client.location}`);
        }
      }
    });

    console.log(`===== END ENTRY/EXIT SCAN =====\n`);
    return;
  }

  // NOW check allocation (only for regular members/staff/daypass)
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
        admin_id: scanner_admin_id || null,
        timestamp: new Date().toISOString()
      }
    });
    console.log(`===== END ENTRY/EXIT SCAN =====\n`);
    return;
  }

  const target_admin_id = allocation.allocated_to_admin;

  console.log(`✅ RFID Allocated to Admin: ${target_admin_id}`);
  console.log(`   Role: ${allocation.role}`);
  console.log(`   RFID Type: ${allocation.rfid_type}`);
  console.log(`   Status: ${allocation.status}`);

if (allocation.role === 'Partner') {
    broadcastToClients({
      type: "member-update",
      data: {
        rfid_tag,
        visitor_type: "Partner",
        status: "denied",
        reason: "Partner card not permitted at entry/exit",
        location,
        admin_id: target_admin_id,
        timestamp: new Date().toISOString()
      }
    }, true);
    return;
  }

  console.log("Calling handleEntryExit...");
await handleEntryExit(rfid_tag, location, target_admin_id, allocation, {
    getStaffByRfid,
    getAdminByRfid,
    getSuperAdminByRfid,
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

  const allocation = await getRfidAllocation(rfid_tag);
  
  if (!allocation || !allocation.isValid) {
    broadcastToClients({
      type: "staff-scan",
      data: {
        rfid_tag,
        status: "unregistered",
        reason: allocation ? allocation.reason : "RFID not registered with SwiftPass company",
        location,
        timestamp: new Date().toISOString()
      }
    });
    console.log(`===== END STAFF SCAN =====\n`);
    return;
  }

  const targetAdminId = allocation.allocated_to_admin;

  // CHECK REPLACEMENT MODE
  if (targetAdminId && adminScanModes.replacement?.[targetAdminId]) {
    console.log("🔄 REPLACEMENT SCAN MODE ACTIVE");

    const validation = await validateScanModeRfid(rfid_tag, targetAdminId);

    if (!validation.valid) {
      broadcastToClients({
        type: "rfid-replacement-scanned",
        data: {
          status: "error",
          rfid_tag,
          reason: validation.reason,
          admin_id: targetAdminId
        }
      });
      console.log(`===== END REPLACEMENT SCAN =====\n`);
      return;
    }

    const [staffCheck, adminCheck, memberCheck] = await Promise.all([
      getStaffByRfid(rfid_tag, targetAdminId),
      getAdminByRfid(rfid_tag),
      getMemberByRfid(rfid_tag, targetAdminId)
    ]);

    if (staffCheck || adminCheck || memberCheck) {
      const assignedTo = staffCheck ? `Staff: ${staffCheck.staff_name}` :
                        adminCheck ? `Admin: ${adminCheck.admin_name}` :
                        `Member: ${memberCheck.full_name}`;

      broadcastToClients({
        type: "rfid-replacement-scanned",
        data: {
          status: "error",
          rfid_tag,
          reason: `RFID already assigned to ${assignedTo}`,
          admin_id: targetAdminId
        }
      });
      console.log(`===== END REPLACEMENT SCAN =====\n`);
      return;
    }

    broadcastToClients({
      type: "rfid-replacement-scanned",
      data: {
        status: "success",
        rfid_tag,
        role: allocation.role,
        rfid_type: allocation.rfid_type,
        admin_id: targetAdminId
      }
    });

    console.log(`===== END REPLACEMENT SCAN =====\n`);
    return;
  }

  // NORMAL STAFF SCAN
  console.log("🔍 Normal STAFF scan");
  
  // Check if DayPass guest already exists
  if (allocation.role === 'DayPass') {
    const [guestRows] = await dbSuperAdmin.promise().query(
`SELECT id, guest_name, gender, mobile_number, email, profile_image_url, expires_at, status, paid_amount
 FROM DayPassGuests 
 WHERE rfid_tag = ? AND admin_id = ? AND status IN ('active', 'expired')
 LIMIT 1`,
      [rfid_tag, targetAdminId]
    );

    if (guestRows.length > 0) {
      const guest = guestRows[0];
      console.log("✅ Found existing DayPass guest:", guest.guest_name);
      
      broadcastToClients({
        type: "staff-scan",
        data: {
          rfid_tag,
          status: "daypass_renewal",
          full_name: guest.guest_name,
          guest_data: guest,
          rfid_type: allocation.rfid_type,
          role: allocation.role,
          location,
          admin_id: targetAdminId,
          timestamp: new Date().toISOString()
        }
      });
      console.log(`===== END STAFF SCAN =====\n`);
      return;
    }
  
    // ✅ NEW: No existing DayPass guest — new registration
    console.log("🆕 New DayPass registration");
    broadcastToClients({
      type: "staff-scan",
      data: {
        rfid_tag,
        status: "unregistered",
        reason: "Ready for new DayPass registration",
        rfid_type: allocation.rfid_type,
        role: allocation.role,
        location,
        admin_id: targetAdminId,
        timestamp: new Date().toISOString()
      }
    });
    console.log(`===== END STAFF SCAN =====\n`);
    return;
  }
  // Check if Member already exists
  if (allocation.role === 'Member') {
    const memberCheck = await getMemberByRfid(rfid_tag, targetAdminId);
    
    if (memberCheck) {
      console.log("✅ Found existing Member:", memberCheck.full_name);
      broadcastToClients({
        type: "staff-scan",
        data: {
          rfid_tag,
          status: "member_found",
          full_name: memberCheck.full_name,
          rfid_type: allocation.rfid_type,
          role: allocation.role,
          location,
          admin_id: targetAdminId,
          timestamp: new Date().toISOString()
        }
      });
      console.log(`===== END STAFF SCAN =====\n`);
      return;
    }
 // ✅ NEW: No existing member — new registration
    console.log("🆕 New Member registration");
    broadcastToClients({
      type: "staff-scan",
      data: {
        rfid_tag,
        status: "unregistered",
        reason: "Ready for new Member registration",
        rfid_type: allocation.rfid_type,
        role: allocation.role,
        location,
        admin_id: targetAdminId,
        timestamp: new Date().toISOString()
      }
    });
    console.log(`===== END STAFF SCAN =====\n`);
    return;
  }
  
// Check if Partner card
if (allocation.role === 'Partner') {

  // ✅ Scan mode active — owner is assigning RFID to a staff member
  if (adminScanModes[targetAdminId]) {
    console.log("✅ Scan mode active — validating Partner card for staff assignment");

    const validation = await validateScanModeRfid(rfid_tag, targetAdminId);

    if (!validation.valid) {
      console.log("❌ Validation failed:", validation.reason);
      broadcastToClients({
        type: "rfid-scanned-for-staff",
        data: {
          status: "error",
          rfid_tag,
          reason: validation.reason,
          admin_id: targetAdminId
        }
      });
      console.log(`===== END STAFF SCAN =====\n`);
      return;
    }

    // ✅ All checks passed
    console.log("✅ Partner card valid for staff RFID assignment:", rfid_tag);
    broadcastToClients({
      type: "rfid-scanned-for-staff",
      data: {
        status: "success",
        rfid_tag,
        role: allocation.role,
        rfid_type: allocation.rfid_type,
        admin_id: targetAdminId
      }
    });

    console.log(`===== END STAFF SCAN =====\n`);
    return;
  }

  // Scan mode not active — block Partner card as before
  console.log("🚫 Partner card detected, scan mode not active");
  broadcastToClients({
    type: "staff-scan",
    data: {
      rfid_tag,
      status: "partner_card",
      reason: "This is a Partner card - for admin use only",
      rfid_type: allocation.rfid_type,
      role: allocation.role,
      location,
      admin_id: targetAdminId,
      timestamp: new Date().toISOString()
	}
      });
  console.log(`===== END STAFF SCAN =====\n`);
  return;
}
} // closes STAFF if-block
// ============= SUPERADMIN LOCATION =============
if (location.toUpperCase() === "SUPERADMIN") {
  const allocation = await getRfidAllocation(rfid_tag);

  if (!adminScanModes.partnerSlot) {
    adminScanModes.partnerSlot = {};
  }

  const partnerSlotEntries = adminScanModes.partnerSlot || {};
  const partnerSlotAdminId = Object.keys(partnerSlotEntries)[0];

  if (partnerSlotAdminId) {
    const targetAdminId = parseInt(partnerSlotAdminId);
    const { slot } = partnerSlotEntries[partnerSlotAdminId];

    if (!allocation) {
      broadcastToClients({
        type: "partner-slot-scan-result",
        data: { status: "error", slot, reason: "RFID not registered in SwiftPass inventory", admin_id: targetAdminId }
      });
      delete adminScanModes.partnerSlot[partnerSlotAdminId];
      if (adminScanModes.partnerSlotTimers?.[partnerSlotAdminId]) {
        clearTimeout(adminScanModes.partnerSlotTimers[partnerSlotAdminId]);
        delete adminScanModes.partnerSlotTimers[partnerSlotAdminId];
      }
      return;
    }

    if (allocation.role !== 'Partner') {
      broadcastToClients({
        type: "partner-slot-scan-result",
        data: { status: "error", slot, reason: "This is not a Partner card", admin_id: targetAdminId }
      });
      delete adminScanModes.partnerSlot[partnerSlotAdminId];
      if (adminScanModes.partnerSlotTimers?.[partnerSlotAdminId]) {
        clearTimeout(adminScanModes.partnerSlotTimers[partnerSlotAdminId]);
        delete adminScanModes.partnerSlotTimers[partnerSlotAdminId];
      }
      return;
    }

    if (allocation.allocated_to_admin && allocation.allocated_to_admin !== targetAdminId) {
      broadcastToClients({
        type: "partner-slot-scan-result",
        data: { status: "error", slot, reason: "This card belongs to a different partner", admin_id: targetAdminId }
      });
      delete adminScanModes.partnerSlot[partnerSlotAdminId];
      if (adminScanModes.partnerSlotTimers?.[partnerSlotAdminId]) {
        clearTimeout(adminScanModes.partnerSlotTimers[partnerSlotAdminId]);
        delete adminScanModes.partnerSlotTimers[partnerSlotAdminId];
      }
      return;
    }

    if (allocation.status === 'in_use') {
      broadcastToClients({
        type: "partner-slot-scan-result",
        data: { status: "error", slot, reason: "This card is already assigned to a slot", admin_id: targetAdminId }
      });
      delete adminScanModes.partnerSlot[partnerSlotAdminId];
      if (adminScanModes.partnerSlotTimers?.[partnerSlotAdminId]) {
        clearTimeout(adminScanModes.partnerSlotTimers[partnerSlotAdminId]);
        delete adminScanModes.partnerSlotTimers[partnerSlotAdminId];
      }
      return;
    }

    broadcastToClients({
      type: "partner-slot-scan-result",
      data: { status: "success", slot, rfid_tag, admin_id: targetAdminId }
    });
    delete adminScanModes.partnerSlot[partnerSlotAdminId];
    if (adminScanModes.partnerSlotTimers?.[partnerSlotAdminId]) {
      clearTimeout(adminScanModes.partnerSlotTimers[partnerSlotAdminId]);
      delete adminScanModes.partnerSlotTimers[partnerSlotAdminId];
    }
    return;
  }

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

  if (!allocation.isValid && allocation.status === 'in_stock') {
    broadcastToClients({
      type: "rfid-registration-check",
      data: {
        rfid_tag,
        is_registered: false,
        next_action: "in_stock_error",
        message: "This RFID is in stock and has not been allocated to any gym yet.",
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

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
} // closes SUPERADMIN if-block

console.log("⚠️ Location not handled:", location);

  } catch (err) {
    console.error("❌ Message error:", err.message);
    console.error("Stack trace:", err.stack);
    ws.send(JSON.stringify({ type: "error", message: err.message }));
  }
}
module.exports = { setupWebSocket, broadcastToClients };
