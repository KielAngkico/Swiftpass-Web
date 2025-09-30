
const WebSocket = require("ws");
const dbSuperAdmin = require("./db");
const jwt = require("jsonwebtoken");

let connectedClients = [];

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("🔗 WebSocket client connected");

    // Authentication timeout
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

        // Dashboard authentication
        if (authMsg.type === "auth-dashboard") {
          try {
            const decoded = jwt.verify(authMsg.token, process.env.JWT_SECRET);
            ws.clientType = "dashboard";
            ws.admin_id = decoded.admin_id || decoded.id;

            ws.send(JSON.stringify({ type: "auth-success", admin_id: ws.admin_id }));
          } catch (err) {
            ws.send(JSON.stringify({ type: "auth-failed", reason: "Invalid token" }));
            ws.close();
            return;
          }

        // Arduino authentication
        } else if (authMsg.type === "auth-arduino") {
          if (authMsg.secret === process.env.ARDUINO_SECRET) {
            ws.clientType = "arduino";
            ws.admin_id = authMsg.admin_id;

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

        // Add to connected clients
        connectedClients.push(ws);

        ws.on("message", (msg) => handleMessage(ws, msg));

        ws.on("close", () => {
          connectedClients = connectedClients.filter((client) => client !== ws);
        });

      } catch (err) {
        ws.send(JSON.stringify({ type: "error", message: "Authentication failed" }));
        ws.close();
      }
    });

    ws.on("close", () => {
      clearTimeout(authTimeout);
    });
  });
}

// Broadcast to all clients for this admin_id
function broadcastToClients(data) {
  if (!data || !data.data || !data.data.admin_id) return;

  const targetAdminId = data.data.admin_id;

  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.admin_id === targetAdminId) {
      client.send(JSON.stringify(data));
    }
  });
}

// Handle incoming messages
async function handleMessage(ws, message) {
  try {
    const parsed = JSON.parse(message);
    const { rfid_tag, location } = parsed;
    if (!rfid_tag || !location) {
      ws.send(JSON.stringify({ type: "error", message: "Missing rfid_tag or location" }));
      return;
    }

    const admin_id = ws.admin_id;
    if (!admin_id) {
      ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
      return;
    }

    // Staff scan
    if (location.toUpperCase() === "STAFF") {
      const [memberRows] = await dbSuperAdmin.promise().query(
        `SELECT id, full_name, profile_image_url, system_type, current_balance, subscription_expiry, admin_id
         FROM MembersAccounts 
         WHERE rfid_tag = ? AND admin_id = ? 
         LIMIT 1`,
        [rfid_tag, admin_id]
      );

      if (memberRows.length === 0) {
        broadcastToClients({
          type: "staff-scan",
          data: {
            rfid_tag,
            status: "unregistered",
            location,
            admin_id,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        const member = memberRows[0];
        broadcastToClients({
          type: "staff-scan",
          data: {
            rfid_tag,
            status: "member_found",
            full_name: member.full_name,
            system_type: member.system_type,
            current_balance: member.current_balance,
            subscription_expiry: member.subscription_expiry,
            profile_image_url: member.profile_image_url,
            location,
            admin_id: member.admin_id,
            timestamp: new Date().toISOString()
          }
        });
      }
      return;
    }

    // Member scan
    const [memberRows] = await dbSuperAdmin.promise().query(
      `SELECT id, full_name, profile_image_url, system_type, current_balance, subscription_expiry, admin_id
       FROM MembersAccounts 
       WHERE rfid_tag = ? AND admin_id = ? 
       LIMIT 1`,
      [rfid_tag, admin_id]
    );

    if (memberRows.length === 0) {
      await handleDayPassGuest(rfid_tag, location, admin_id);
      return;
    }

    await handleMember(memberRows[0], rfid_tag, location);

  } catch (err) {
    ws.send(JSON.stringify({ type: "error", message: err.message }));
  }
}

// Day Pass Guest handling
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

    // Check expiry
    if (guest.expires_at && new Date(guest.expires_at) < now) {
      broadcastToClients({
        type: "member-update",
        data: {
          rfid_tag,
          full_name: guest.guest_name,
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

    // Handle ENTRY/EXIT
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
        location,
        admin_id,
        timestamp: new Date().toISOString(),
        error_message: error.message
      }
    });
  }
}

// Handle Members
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

