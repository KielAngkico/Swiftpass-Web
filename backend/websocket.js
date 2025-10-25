const WebSocket = require("ws");
const dbSuperAdmin = require("./db");
const jwt = require("jsonwebtoken");

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

async function isRfidRegistered(rfidTag) {
  try {
    const [rows] = await dbSuperAdmin.promise().query(
      "SELECT id FROM RegisteredRfid WHERE rfid_tag = ? LIMIT 1",
      [rfidTag]
    );
    return rows.length > 0;
  } catch (error) {
    console.error("❌ RFID check error:", error.message);
    return false;
  }
}

// ✅ Only checks ACTIVE staff (in StaffAccounts, not archived)
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

// ✅ Checks both rfid_tag and rfid_tag_2 for admins
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

// ✅ Gets member with status
async function getMemberByRfid(rfidTag) {
  try {
    const [rows] = await dbSuperAdmin.promise().query(
      "SELECT id, full_name, status FROM MembersAccounts WHERE rfid_tag = ? LIMIT 1",
      [rfidTag]
    );
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

    const admin_id = ws.admin_id;

    if (location.toUpperCase() !== "SUPERADMIN" && !admin_id) {
      ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
      return;
    }

    // ✅ PRIORITY 1: REPLACEMENT SCAN MODE
    if (adminScanModes.replacement && adminScanModes.replacement[admin_id] === true) {
      broadcastToClients({
        type: "rfid-replacement-scanned",
        data: {
          rfid_tag,
          admin_id,
          timestamp: new Date().toISOString()
        }
      });

      adminScanModes.replacement[admin_id] = false;

      broadcastToClients({
        type: "replacement-scan-mode-updated",
        data: {
          enabled: false,
          admin_id
        }
      });
      return;
    }

    // ✅ PRIORITY 2: STAFF REGISTRATION SCAN MODE
    if (adminScanModes[admin_id] === true) {
      const isRegistered = await isRfidRegistered(rfid_tag);
      if (!isRegistered) {
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
          data: { enabled: false, admin_id }
        });
        return;
      }

      const staffMemberCheck = await getStaffByRfid(rfid_tag, admin_id);
      if (staffMemberCheck) {
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
          data: { enabled: false, admin_id }
        });
        return;
      }

      const adminMemberCheck = await getAdminByRfid(rfid_tag);
      if (adminMemberCheck) {
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
          data: { enabled: false, admin_id }
        });
        return;
      }

      const memberCheckScan = await getMemberByRfid(rfid_tag);
      if (memberCheckScan) {
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
          data: { enabled: false, admin_id }
        });
        return;
      }

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
        data: { enabled: false, admin_id }
      });
      return;
    }

    // ✅ SUPERADMIN RFID REGISTRATION CHECK
    if (location.toUpperCase() === "SUPERADMIN") {
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

    // ✅ LOCATION = STAFF
    if (location.toUpperCase() === "STAFF") {
      const isRegistered = await isRfidRegistered(rfid_tag);
      if (!isRegistered) {
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

      const staffMember = await getStaffByRfid(rfid_tag, admin_id);
      if (staffMember) {
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

    // ✅ LOCATION = ENTRY / EXIT
    if (["ENTRY", "EXIT"].includes(location.toUpperCase())) {
      const isRegistered = await isRfidRegistered(rfid_tag);
      if (!isRegistered) {
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

      // ✅ Check if ACTIVE staff (only in StaffAccounts)
      const staffMember = await getStaffByRfid(rfid_tag, admin_id);
      if (staffMember) {
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

      // ✅ Check if admin (both RFID tags)
      const adminMember = await getAdminByRfid(rfid_tag);
      if (adminMember) {
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

      // ✅ Check member with status
      const [memberRows] = await dbSuperAdmin.promise().query(
        `SELECT id, full_name, profile_image_url, system_type, current_balance, subscription_expiry, admin_id, status
         FROM MembersAccounts
         WHERE rfid_tag = ? AND admin_id = ?
         LIMIT 1`,
        [rfid_tag, admin_id]
      );

      if (memberRows.length > 0) {
        const member = memberRows[0];
        
        // ✅ Check if member is inactive
        if (member.status === 'inactive') {
          broadcastToClients({
            type: "member-update",
            data: {
              rfid_tag,
              full_name: member.full_name,
              profile_image_url: member.profile_image_url,
              status: "denied",
              reason: "Member account is inactive",
              location,
              admin_id: member.admin_id,
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        await handleMember(member, rfid_tag, location);
        return;
      }

      await handleDayPassGuest(rfid_tag, location, admin_id);
      return;
    }

  } catch (err) {
    console.error("❌ Message error:", err.message);
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
          profile_image_url: null,
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
          profile_image_url: null,
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
          profile_image_url: null,
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
    console.error(`❌ Guest error: ${error.message}`);
    broadcastToClients({
      type: "member-update",
      data: {
        rfid_tag,
        visitor_type: "Unknown",
        status: "error",
        profile_image_url: null,
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
        // ✅ Check if member exited within last 1 minute (grace period)
        const [recentExitRows] = await dbSuperAdmin.promise().query(
          `SELECT id, exit_time, deducted_amount FROM AdminEntryLogs
           WHERE rfid_tag = ? AND member_status = 'outside' AND exit_time IS NOT NULL
           ORDER BY id DESC LIMIT 1`,
          [rfid_tag]
        );

        let isGracePeriod = false;
        if (recentExitRows.length > 0) {
          const lastExit = recentExitRows[0];
          const exitTime = new Date(lastExit.exit_time);
          const now = new Date();
          const timeDiff = (now - exitTime) / 1000; // seconds

          if (timeDiff <= 60) {
            isGracePeriod = true;
            deductedAmount = 0; // No charge during grace period
          }
        }

        if (!isGracePeriod && remainingBalance < price) {
          reason = "Insufficient balance";
        } else {
          accessGranted = true;
          
          if (!isGracePeriod) {
            deductedAmount = price;
            remainingBalance -= price;

            await dbSuperAdmin.promise().query(
              `UPDATE MembersAccounts SET current_balance = ? WHERE id = ?`,
              [remainingBalance, member.id]
            );
          }

          const [logResult] = await dbSuperAdmin.promise().query(
            `INSERT INTO AdminEntryLogs
             (rfid_tag, full_name, admin_id, staff_name, visitor_type, system_type, deducted_amount, member_status, entry_time, location)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [rfid_tag, member.full_name, member.admin_id, staff_name, "Member", admin.system_type, deductedAmount, "inside", new Date(), location]
          );
          logId = logResult.insertId;

          if (isGracePeriod) {
            reason = "Grace period - no charge";
          }
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
      profile_image_url: member.profile_image_url,
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