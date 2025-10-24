
const WebSocket = require("ws");
const dbSuperAdmin = require("./db");
const jwt = require("jsonwebtoken");

let connectedClients = [];
let adminScanModes = {};

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("🔗 WebSocket client connected");

    const authTimeout = setTimeout(() => {
      if (!ws.clientType) {
        console.log("⏱ Authentication timeout - closing connection");
        ws.close();
      }
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
              console.log(`✅ Dashboard authenticated as SUPERADMIN (user_id: ${decoded.id})`);
            } else {
              ws.isSuperAdmin = false;
              ws.admin_id = decoded.adminId || decoded.admin_id || decoded.id;
              ws.user_id = decoded.id;
              console.log(`✅ Dashboard authenticated for Admin ID: ${ws.admin_id}`);
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
              console.log(`✅ Arduino authenticated for Admin ID: ${authMsg.admin_id}`);
            } else {
              ws.admin_id = null;
              ws.location = authMsg.location || "SUPERADMIN";
              ws.isSuperAdmin = true;
              console.log("✅ Arduino authenticated as SUPERADMIN");
            }

            ws.send(JSON.stringify({ type: "auth-success" }));
          } else {
            console.error("❌ Arduino auth failed: Invalid secret");
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
            // Also clean up replacement mode
            if (adminScanModes.replacement) {
              delete adminScanModes.replacement[ws.admin_id];
            }
          }
        });

      } catch (err) {
        console.error("❌ Authentication error:", err.message);
        ws.send(JSON.stringify({ type: "error", message: "Authentication failed" }));
        ws.close();
      }
    });

    ws.on("close", () => {
      clearTimeout(authTimeout);
    });
  });
}

// ✅ Check if RFID is registered
async function isRfidRegistered(rfidTag) {
  try {
    const [rows] = await dbSuperAdmin.promise().query(
      "SELECT id FROM RegisteredRfid WHERE rfid_tag = ? LIMIT 1",
      [rfidTag]
    );
    return rows.length > 0;
  } catch (error) {
    console.error("Error checking RFID registration:", error);
    return false;
  }
}

// ✅ Get staff by RFID + admin_id filter
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
    console.error("Error checking staff RFID:", error);
    return null;
  }
}

// ✅ Get admin by RFID
async function getAdminByRfid(rfidTag) {
  try {
    const [rows] = await dbSuperAdmin.promise().query(
      "SELECT id, admin_name FROM AdminAccounts WHERE rfid_tag = ? LIMIT 1",
      [rfidTag]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error checking admin RFID:", error);
    return null;
  }
}

// ✅ Get member by RFID
async function getMemberByRfid(rfidTag) {
  try {
    const [rows] = await dbSuperAdmin.promise().query(
      "SELECT id, full_name FROM MembersAccounts WHERE rfid_tag = ? LIMIT 1",
      [rfidTag]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error checking member RFID:", error);
    return null;
  }
}

// ✅ Log staff activity (ENTRY/EXIT only)
async function logStaffActivity(rfidTag, staffData, location, activityType) {
  try {
    await dbSuperAdmin.promise().query(
      `INSERT INTO StaffActivityLogs
       (rfid_tag, staff_id, staff_name, admin_id, location, activity_type, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [rfidTag, staffData.id, staffData.staff_name, staffData.admin_id, location, activityType, new Date()]
    );
    console.log(`✅ Logged staff activity: ${staffData.staff_name} - ${activityType}`);
  } catch (error) {
    console.error("Error logging staff activity:", error);
  }
}

function broadcastToClients(data) {
  console.log("📤 Broadcasting message:", JSON.stringify(data, null, 2));

  // ✅ Handle SUPERADMIN broadcasts
  if (data.type === "rfid-registration-check") {
    console.log("📡 SUPERADMIN broadcast - sending to ALL SuperAdmin dashboard clients");

    let sentCount = 0;
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN &&
          client.clientType === "dashboard" &&
          client.isSuperAdmin === true) {
        client.send(JSON.stringify(data));
        sentCount++;
        console.log(`   ✅ Sent to SuperAdmin dashboard (user_id: ${client.user_id})`);
      }
    });

    console.log(`📊 Broadcast complete. Sent to ${sentCount} SuperAdmin client(s)`);
    return;
  }

  // ✅ Handle scan mode updates (staff registration and replacement)
  if (data.type === "rfid-scanned-for-staff" ||
      data.type === "scan-mode-updated" ||
      data.type === "rfid-replacement-scanned" ||
      data.type === "replacement-scan-mode-updated") {
    if (!data.data || !data.data.admin_id) {
      console.log("❌ Missing admin_id in scan mode broadcast");
      return;
    }

    const targetAdminId = data.data.admin_id;
    console.log(`🎯 Broadcasting ${data.type} to admin_id: ${targetAdminId}`);

    let sentCount = 0;
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN &&
          client.clientType === "dashboard" &&
          client.admin_id === targetAdminId) {
        client.send(JSON.stringify(data));
        sentCount++;
        console.log(`   ✅ Sent to matching admin client`);
      }
    });

    console.log(`📊 Broadcast complete. Sent to ${sentCount} client(s)`);
    return;
  }

  // ✅ For all other messages (member-update, staff-scan, etc.)
  if (!data || !data.data || !data.data.admin_id) {
    console.log("❌ Missing admin_id in broadcast data - skipping");
    return;
  }

  const targetAdminId = data.data.admin_id;
  console.log(`🎯 Broadcasting to admin_id: ${targetAdminId}`);

  let dashboardCount = 0;
  let arduinoCount = 0;

  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN &&
        client.admin_id === targetAdminId) {

      // ✅ Send to dashboard clients (see everything)
      if (client.clientType === "dashboard") {
        client.send(JSON.stringify(data));
        dashboardCount++;
        console.log(`   ✅ Sent to dashboard client`);
      }
      // ✅ Send to Arduino clients with location filtering
      else if (client.clientType === "arduino") {
        // LOCK controller receives ALL messages (no location filter)
        if (client.location === "LOCK") {
          client.send(JSON.stringify(data));
          arduinoCount++;
          console.log(`   ✅ Sent to LOCK controller`);
        }
        // ENTRY/EXIT only receive messages for their own location
        else if (client.location === data.data.location) {
          client.send(JSON.stringify(data));
          arduinoCount++;
          console.log(`   ✅ Sent to ${client.location} ESP32`);
        }
      }
    }
  });

  console.log(`📊 Broadcast complete. Sent to ${dashboardCount} dashboard + ${arduinoCount} Arduino client(s)`);
}

async function handleMessage(ws, message) {
  try {
    const parsed = JSON.parse(message);

// ============================================================
// HANDLE: Staff Registration Scan Mode Toggle
// ============================================================
if (parsed.type === "toggle-scan-mode") {
  const admin_id = ws.admin_id;
  if (!admin_id && !ws.isSuperAdmin) {
    ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
    return;
  }

  adminScanModes[admin_id] = parsed.enabled;
  console.log(`🔄 Admin ${admin_id} staff registration scan mode: ${parsed.enabled ? "ENABLED" : "DISABLED"}`);

  // ✅ FIX: Use broadcastToClients instead of ws.send
  broadcastToClients({
    type: "scan-mode-updated",
    data: {
      enabled: parsed.enabled,
      admin_id  // ✅ Add admin_id to data
    }
  });
  return;
}
    // ============================================================
    // ✅ HANDLE: Replacement Scan Mode Toggle
    // ============================================================
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

      console.log(`🔄 Admin ${admin_id} replacement scan mode: ${parsed.enabled ? "ENABLED" : "DISABLED"}`);

      broadcastToClients({
        type: "replacement-scan-mode-updated",
        data: {
          enabled: parsed.enabled,
          admin_id
        }
      });
      return;
    }

    // ============================================================
    // Extract rfid_tag and location
    // ============================================================
    const { rfid_tag, location } = parsed;
    if (!rfid_tag || !location) {
      ws.send(JSON.stringify({ type: "error", message: "Missing rfid_tag or location" }));
      return;
    }

    const admin_id = ws.admin_id;

    if (location.toUpperCase() === "SUPERADMIN") {
      console.log("🔓 SUPERADMIN connection — skipping admin_id check");
    } else if (!admin_id) {
      ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
      return;
    }

    // ============================================================
    // ✅ PRIORITY 1: CHECK REPLACEMENT SCAN MODE FIRST
    // This MUST come before staff registration scan mode check
    // ============================================================
    if (adminScanModes.replacement && adminScanModes.replacement[admin_id] === true) {
      console.log(`📡 REPLACEMENT Scan Mode Active - Capturing tag: ${rfid_tag}`);

      // Just send the RFID tag - no validation needed for replacement
      broadcastToClients({
        type: "rfid-replacement-scanned",
        data: {
          rfid_tag,
          admin_id,
          timestamp: new Date().toISOString()
        }
      });

      // Turn off replacement scan mode
      adminScanModes.replacement[admin_id] = false;

      broadcastToClients({
        type: "replacement-scan-mode-updated",
        data: {
          enabled: false,
          admin_id
        }
      });

      console.log(`✅ Replacement RFID captured: ${rfid_tag} - STOPPING HERE (no staff-scan)`);
      return; // ⚠️ CRITICAL: STOP HERE - Don't continue to any other logic
    }

    // ============================================================
    // PRIORITY 2: Check if admin is in STAFF REGISTRATION scan mode
    // ============================================================
    if (adminScanModes[admin_id] === true) {
      console.log(`📡 Staff Registration Scan Mode Active - Validating tag: ${rfid_tag}`);

      // ✅ STEP 1: Check if RFID is registered in RegisteredRfid table
      const isRegistered = await isRfidRegistered(rfid_tag);
      if (!isRegistered) {
        console.log(`❌ RFID ${rfid_tag} NOT registered with SwiftPass - DENY`);
        adminScanModes[admin_id] = false;

        broadcastToClients({
          type: "rfid-scanned-for-staff",
          data: {
            rfid_tag,
            admin_id,
            status: "error",
            reason: "RFID not registered with SwiftPass company",
            timestamp: new Date().toISOString()
          }
        });

        broadcastToClients({
          type: "scan-mode-updated",
          data: {
            enabled: false,
            admin_id
          }
        });
        return;
      }

      // ✅ STEP 2: Check if RFID is already used by Staff in THIS admin
      const staffMemberCheck = await getStaffByRfid(rfid_tag, admin_id);
      if (staffMemberCheck) {
        console.log(`❌ RFID already assigned to Staff - DUPLICATE`);
        adminScanModes[admin_id] = false;

        broadcastToClients({
          type: "rfid-scanned-for-staff",
          data: {
            rfid_tag,
            admin_id,
            status: "error",
            reason: `Duplicate RFID - already assigned to ${staffMemberCheck.staff_name}`,
            timestamp: new Date().toISOString()
          }
        });

        broadcastToClients({
          type: "scan-mode-updated",
          data: {
            enabled: false,
            admin_id
          }
        });
        return;
      }

      // ✅ STEP 3: Check if RFID is already used by ANY Admin
      const adminMemberCheck = await getAdminByRfid(rfid_tag);
      if (adminMemberCheck) {
        console.log(`❌ RFID already assigned to Admin - DUPLICATE`);
        adminScanModes[admin_id] = false;

        broadcastToClients({
          type: "rfid-scanned-for-staff",
          data: {
            rfid_tag,
            admin_id,
            status: "error",
            reason: `Duplicate RFID - already assigned to Admin ${adminMemberCheck.admin_name}`,
            timestamp: new Date().toISOString()
          }
        });

        broadcastToClients({
          type: "scan-mode-updated",
          data: {
            enabled: false,
            admin_id
          }
        });
        return;
      }

      // ✅ STEP 4: Check if RFID is assigned to any Member
      const memberCheckScan = await getMemberByRfid(rfid_tag);
      if (memberCheckScan) {
        console.log(`❌ RFID already assigned to Member - DUPLICATE`);
        adminScanModes[admin_id] = false;

        broadcastToClients({
          type: "rfid-scanned-for-staff",
          data: {
            rfid_tag,
            admin_id,
            status: "error",
            reason: `Duplicate RFID - already assigned to Member ${memberCheckScan.full_name}`,
            timestamp: new Date().toISOString()
          }
        });

        broadcastToClients({
          type: "scan-mode-updated",
          data: {
            enabled: false,
            admin_id
          }
        });
        return;
      }

      // ✅ ALL CHECKS PASSED - RFID is valid and available
      console.log(`✅ RFID ${rfid_tag} is valid and available for staff registration`);

      broadcastToClients({
        type: "rfid-scanned-for-staff",
        data: {
          rfid_tag,
          admin_id,
          status: "success",
          reason: "RFID ready for registration",
          timestamp: new Date().toISOString()
        }
      });

      adminScanModes[admin_id] = false;

      broadcastToClients({
        type: "scan-mode-updated",
        data: {
          enabled: false,
          admin_id
        }
      });
      return;
    }

    // ============================================================
    // ✅ SUPERADMIN RFID Registration Check
    // ============================================================
    if (location.toUpperCase() === "SUPERADMIN") {
      console.log(`📡 SUPERADMIN RFID Scan: ${rfid_tag}`);

      const isRegistered = await isRfidRegistered(rfid_tag);

      broadcastToClients({
        type: "rfid-registration-check",
        data: {
          rfid_tag,
          is_registered: isRegistered,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // ============================================================
    // LOCATION = STAFF
    // ============================================================
    if (location.toUpperCase() === "STAFF") {
      console.log(`📍 STAFF Location - Checking RFID: ${rfid_tag}`);

      const isRegistered = await isRfidRegistered(rfid_tag);
      if (!isRegistered) {
        console.log(`❌ RFID ${rfid_tag} NOT registered with SwiftPass - DENY`);
        broadcastToClients({
          type: "staff-scan",
          data: {
            rfid_tag,
            status: "unregistered",
            reason: "RFID not registered with SwiftPass company",
            location,
            admin_id,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      console.log(`✅ RFID ${rfid_tag} is registered - checking accounts`);

      const staffMember = await getStaffByRfid(rfid_tag, admin_id);
      if (staffMember) {
        console.log(`❌ RFID already assigned to Staff - DUPLICATE`);
        broadcastToClients({
          type: "staff-scan",
          data: {
            rfid_tag,
            status: "unregistered",
            reason: "Duplicate RFID - already assigned to staff",
            location,
            admin_id,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const adminMember = await getAdminByRfid(rfid_tag);
      if (adminMember) {
        console.log(`❌ RFID already assigned to Admin - DUPLICATE`);
        broadcastToClients({
          type: "staff-scan",
          data: {
            rfid_tag,
            status: "unregistered",
            reason: "Duplicate RFID - already assigned to admin",
            location,
            admin_id,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const staffCheckAny = await getStaffByRfid(rfid_tag);
      if (staffCheckAny) {
        console.log(`❌ RFID already assigned to Staff - DUPLICATE`);
        broadcastToClients({
          type: "staff-scan",
          data: {
            rfid_tag,
            status: "unregistered",
            reason: "Duplicate RFID - already assigned to staff",
            location,
            admin_id,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const memberCheck = await getMemberByRfid(rfid_tag);
      if (memberCheck) {
        console.log(`✅ Found in Members - Go to Renewal`);
        broadcastToClients({
          type: "staff-scan",
          data: {
            rfid_tag,
            status: "member_found",
            full_name: memberCheck.full_name,
            location,
            admin_id,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      console.log(`✅ RFID ${rfid_tag} is registered and empty - Go to AddMember`);
      broadcastToClients({
        type: "staff-scan",
        data: {
          rfid_tag,
          status: "unregistered",
          reason: "Ready for new member registration",
          location,
          admin_id,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // ============================================================
    // LOCATION = ENTRY / EXIT
    // ============================================================
    if (["ENTRY", "EXIT"].includes(location.toUpperCase())) {
      console.log(`🚪 ${location.toUpperCase()} Location - Processing RFID: ${rfid_tag}`);

      const isRegistered = await isRfidRegistered(rfid_tag);
      if (!isRegistered) {
        console.log(`❌ RFID ${rfid_tag} NOT registered`);
        broadcastToClients({
          type: "member-update",
          data: {
            rfid_tag,
            status: "unregistered",
            reason: "RFID not registered with system",
            location,
            admin_id,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const staffMember = await getStaffByRfid(rfid_tag, admin_id);
      if (staffMember) {
        console.log(`👤 Staff member scanning: ${staffMember.staff_name}`);
        await logStaffActivity(rfid_tag, staffMember, location, location.toUpperCase());

        broadcastToClients({
          type: "member-update",
          data: {
            rfid_tag,
            full_name: staffMember.staff_name,
            status: "staff_granted",
            reason: "Staff access - door open",
            location,
            admin_id: staffMember.admin_id,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const adminMember = await getAdminByRfid(rfid_tag);
      if (adminMember) {
        console.log(`👨‍💼 Admin scanning: ${adminMember.admin_name}`);

        broadcastToClients({
          type: "member-update",
          data: {
            rfid_tag,
            full_name: adminMember.admin_name,
            status: "admin_granted",
            reason: "Admin access - door open",
            location,
            admin_id,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const [memberRows] = await dbSuperAdmin.promise().query(
        `SELECT id, full_name, profile_image_url, system_type, current_balance, subscription_expiry, admin_id
         FROM MembersAccounts
         WHERE rfid_tag = ? AND admin_id = ?
         LIMIT 1`,
        [rfid_tag, admin_id]
      );

      if (memberRows.length > 0) {
        console.log(`👥 Member scanning: ${memberRows[0].full_name}`);
        await handleMember(memberRows[0], rfid_tag, location);
        return;
      }

      console.log(`🎫 Checking for day pass guest: ${rfid_tag}`);
      await handleDayPassGuest(rfid_tag, location, admin_id);
      return;
    }

  } catch (err) {
    console.error("❌ Handle message error:", err.message);
    ws.send(JSON.stringify({ type: "error", message: err.message }));
  }
}

async function handleDayPassGuest(rfid_tag, location, admin_id) {
  try {
    const [guestRows] = await dbSuperAdmin.promise().query(
      `SELECT id, guest_name, gender, rfid_tag, system_type, expires_at, staff_name, paid_amount, admin_id, status
       FROM DayPassGuests
       WHERE rfid_tag = ? AND status = 'active' AND admin_id = ?
       LIMIT 1`,
      [rfid_tag, admin_id]
    );

    if (guestRows.length === 0) {
      broadcastToClients({
        type: "member-update",
        data: {
          rfid_tag,
          visitor_type: "Unknown",
          status: "unregistered",
          location,
          entry_time: null,
          exit_time: null,
          profile_image_url: null, // ✅ ADD THIS
          admin_id,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const guest = guestRows[0];
    const now = new Date();

    if (guest.expires_at && new Date(guest.expires_at) < now) {
      broadcastToClients({
        type: "member-update",
        data: {
          rfid_tag,
          full_name: guest.guest_name,
          profile_image_url: null, // ✅ ADD THIS (guests don't have images)
          visitor_type: "Day Pass",
          system_type: guest.system_type,
          status: "denied",
          reason: "Day pass expired",
          location,
          entry_time: null,
          exit_time: null,
          admin_id: guest.admin_id,
          timestamp: now.toISOString()
        }
      });
      return;
    }

    if (["ENTRY", "EXIT"].includes(location.toUpperCase())) {
      const isEntry = location.toUpperCase() === "ENTRY";

      const [lastLogRows] = await dbSuperAdmin.promise().query(
        `SELECT id, member_status, entry_time
         FROM AdminEntryLogs
         WHERE rfid_tag = ?
         ORDER BY id DESC LIMIT 1`,
        [rfid_tag]
      );

      const lastLog = lastLogRows[0] || {};
      const isCurrentlyInside = lastLogRows.length && lastLog.member_status === "inside";
      let accessGranted = false;
      let reason = "";

      if (isEntry && isCurrentlyInside) reason = "Already inside";
      else if (!isEntry && !isCurrentlyInside) reason = "Already outside";
      else accessGranted = true;

      const memberStatus = accessGranted ? (isEntry ? "inside" : "outside") : "denied";
      const entryTime = accessGranted && isEntry ? new Date() : lastLog.entry_time || null;
      const exitTime = accessGranted && !isEntry ? new Date() : null;

      if (accessGranted) {
        if (isEntry) {
          await dbSuperAdmin.promise().query(
            `INSERT INTO AdminEntryLogs
             (rfid_tag, full_name, admin_id, staff_name, visitor_type, system_type, deducted_amount, member_status, entry_time, location)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [rfid_tag, guest.guest_name, guest.admin_id, guest.staff_name, "Day Pass", guest.system_type, guest.paid_amount, memberStatus, entryTime, location]
          );
        } else {
          await dbSuperAdmin.promise().query(
            `UPDATE AdminEntryLogs
             SET member_status = ?, exit_time = ?, location = ?
             WHERE rfid_tag = ? AND member_status = 'inside'
             ORDER BY id DESC LIMIT 1`,
            [memberStatus, exitTime, location, rfid_tag]
          );
        }
      }

      broadcastToClients({
        type: "member-update",
        data: {
          rfid_tag,
          full_name: guest.guest_name,
          profile_image_url: null, // ✅ ADD THIS (guests don't have images)
          visitor_type: "Day Pass",
          system_type: guest.system_type,
          status: memberStatus,
          reason,
          entry_time: entryTime ? new Date(entryTime).toISOString() : null,
          exit_time: exitTime ? exitTime.toISOString() : null,
          location,
          admin_id: guest.admin_id,
          timestamp: now.toISOString()
        }
      });
    }

  } catch (error) {
    console.error(`❌ ERROR in handleDayPassGuest: ${error.message}`);
    broadcastToClients({
      type: "member-update",
      data: {
        rfid_tag,
        visitor_type: "Unknown",
        status: "error",
        profile_image_url: null, // ✅ ADD THIS
        location,
        admin_id,
        timestamp: new Date().toISOString(),
        error_message: error.message
      }
    });
  }
}

async function handleMember(member, rfid_tag, location) {
  const [adminRows] = await dbSuperAdmin.promise().query(
    `SELECT id, admin_name, system_type FROM AdminAccounts WHERE id = ? LIMIT 1`,
    [member.admin_id]
  );
  const admin = adminRows[0];

  const [staffRows] = await dbSuperAdmin.promise().query(
    `SELECT staff_name FROM StaffSessionLogs
     WHERE admin_id = ? AND status = 'online'
     ORDER BY login_time DESC LIMIT 1`,
    [admin.id]
  );
  const staff_name = staffRows.length ? staffRows[0].staff_name : null;

  const isEntry = location.toUpperCase() === "ENTRY";
  const [lastLogRows] = await dbSuperAdmin.promise().query(
    `SELECT * FROM AdminEntryLogs
     WHERE rfid_tag = ? AND system_type = ? AND member_status = 'inside'
     ORDER BY id DESC LIMIT 1`,
    [rfid_tag, admin.system_type]
  );
  const lastLog = lastLogRows[0];
  const isCurrentlyInside = !!lastLog;

  let accessGranted = false;
  let reason = "";
  let deductedAmount = null;
  let remainingBalance = member.current_balance ?? 0;
  let logId = null;

  if (isEntry && isCurrentlyInside) reason = "Already inside";
  else if (!isEntry && !isCurrentlyInside) reason = "Already outside";
  else {
    if (admin.system_type === "prepaid_entry") {
      const [pricingRows] = await dbSuperAdmin.promise().query(
        `SELECT amount_to_pay FROM AdminPricingOptions
         WHERE admin_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1`,
        [admin.id]
      );

      const price = pricingRows.length ? pricingRows[0].amount_to_pay : 0;

      if (isEntry) {
        if (remainingBalance < price) reason = "Insufficient balance";
        else {
          accessGranted = true;
          deductedAmount = price;
          remainingBalance -= price;

          await dbSuperAdmin.promise().query(
            `UPDATE MembersAccounts SET current_balance = ? WHERE id = ?`,
            [remainingBalance, member.id]
          );

          const [logResult] = await dbSuperAdmin.promise().query(
            `INSERT INTO AdminEntryLogs
             (rfid_tag, full_name, admin_id, staff_name, visitor_type, system_type, deducted_amount, member_status, entry_time, location)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [rfid_tag, member.full_name, member.admin_id, staff_name, "Member", admin.system_type, deductedAmount, "inside", new Date(), location]
          );
          logId = logResult.insertId;
        }
      } else {
        if (!isCurrentlyInside) reason = "Not inside";
        else {
          accessGranted = true;
          await dbSuperAdmin.promise().query(
            `UPDATE AdminEntryLogs SET member_status = ?, exit_time = ?, location = ? WHERE id = ?`,
            ["outside", new Date(), location, lastLog.id]
          );
          logId = lastLog.id;
        }
      }
    } else {
      accessGranted = true;
      if (isEntry) {
        const [logResult] = await dbSuperAdmin.promise().query(
          `INSERT INTO AdminEntryLogs
           (rfid_tag, full_name, admin_id, staff_name, visitor_type, system_type, member_status, entry_time, location)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [rfid_tag, member.full_name, member.admin_id, staff_name, "Member", admin.system_type, "inside", new Date(), location]
        );
        logId = logResult.insertId;
      } else {
        await dbSuperAdmin.promise().query(
          `UPDATE AdminEntryLogs SET member_status = ?, exit_time = ?, location = ? WHERE id = ?`,
          ["outside", new Date(), location, lastLog.id]
        );
        logId = lastLog.id;
      }
    }
  }

  const status = accessGranted ? (isEntry ? "inside" : "outside") : "denied";

  broadcastToClients({
    type: "member-update",
    data: {
      rfid_tag,
      full_name: member.full_name,
      profile_image_url: member.profile_image_url, // ✅ ADD THIS LINE
      visitor_type: "Member",
      system_type: admin.system_type,
      status,
      reason,
      deducted_amount: deductedAmount,
      current_balance: remainingBalance,
      entry_time: isEntry && accessGranted ? new Date().toISOString() : lastLog?.entry_time ? new Date(lastLog.entry_time).toISOString() : null,
      exit_time: !isEntry && accessGranted ? new Date().toISOString() : lastLog?.exit_time ? new Date(lastLog.exit_time).toISOString() : null,
      location,
      admin_id: member.admin_id,
      timestamp: new Date().toISOString()
    }
  });
}

module.exports = { setupWebSocket, broadcastToClients };

