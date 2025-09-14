
const WebSocket = require("ws");
const dbSuperAdmin = require("./db"); 
let connectedClients = [];

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("🔗 WebSocket client connected");
    connectedClients.push(ws);

    ws.on("message", (message) => handleMessage(ws, message));
    ws.on("close", () => {
      console.log("🔌 WebSocket client disconnected");
      connectedClients = connectedClients.filter((client) => client !== ws);
    });
  });
}

/**
 * Broadcast to all connected clients
 */
function broadcastToClients(data) {
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

/**
 * Handle incoming RFID WebSocket messages
 */
async function handleMessage(ws, message) {
  console.log("📥 Received message:", message.toString());

  try {
    const parsed = JSON.parse(message);
    const { rfid_tag, location } = parsed;
    if (!rfid_tag || !location) return;

    if (location.toUpperCase() === "STAFF") {
      const [memberRows] = await dbSuperAdmin.promise().query(
        `SELECT id, full_name, profile_image_url, system_type, current_balance, subscription_expiry, admin_id 
         FROM MembersAccounts WHERE rfid_tag = ? LIMIT 1`,
        [rfid_tag]
      );

      if (memberRows.length === 0) {
 
        broadcastToClients({
          type: "staff-scan",
          data: {
            rfid_tag,
            status: "unregistered",
            location,
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
            timestamp: new Date().toISOString()
          }
        });
      }
      return; 
    }

    const [memberRows] = await dbSuperAdmin.promise().query(
      `SELECT id, full_name, profile_image_url, system_type, current_balance, subscription_expiry, admin_id 
       FROM MembersAccounts WHERE rfid_tag = ? LIMIT 1`,
      [rfid_tag]
    );

    if (memberRows.length === 0) {
      await handleDayPassGuest(rfid_tag, location);
      return;
    }

    await handleMember(memberRows[0], rfid_tag, location);
  } catch (err) {
    console.error("❌ Error handling message:", err.message);
    ws.send(JSON.stringify({ type: "error", message: err.message }));
  }
}

/**
 * Handle Day Pass Guest Logic
 */
async function handleDayPassGuest(rfid_tag, location) {
  const [guestRows] = await dbSuperAdmin.promise().query(
    `SELECT id, guest_name, gender, rfid_tag, system_type, expires_at, staff_name, paid_amount, admin_id
     FROM DayPassGuests WHERE rfid_tag = ? AND status = 'active' LIMIT 1`,
    [rfid_tag]
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
        visitor_type: "Day Pass",
        system_type: guest.system_type,
        status: "denied",
        reason: "Day pass expired",
        location,
        entry_time: null,
        exit_time: null,
        timestamp: now.toISOString()
      }
    });
    return;
  }

  if (["ENTRY", "EXIT"].includes(location.toUpperCase())) {
    const isEntry = location.toUpperCase() === "ENTRY";

    const [lastLogRows] = await dbSuperAdmin.promise().query(
      `SELECT id, member_status, entry_time FROM AdminEntryLogs 
       WHERE rfid_tag = ? ORDER BY id DESC LIMIT 1`,
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
        timestamp: now.toISOString()
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

  if (isEntry && isCurrentlyInside) {
    reason = "Already inside";
  } else if (!isEntry && !isCurrentlyInside) {
    reason = "Already outside";
  } else {
    if (admin.system_type === "prepaid_entry") {
      const [pricingRows] = await dbSuperAdmin.promise().query(
        `SELECT amount_to_pay FROM adminpricingoptions 
         WHERE admin_id = ? AND plan_name = 'Daily Session' AND is_active = 1 
         ORDER BY id DESC LIMIT 1`,
        [admin.id]
      );
      const sessionCost = pricingRows.length ? parseFloat(pricingRows[0].amount_to_pay) : 0;

      if (isEntry && remainingBalance >= sessionCost) {
        accessGranted = true;
        deductedAmount = sessionCost;
        remainingBalance -= sessionCost;
        await dbSuperAdmin.promise().query(
          `UPDATE MembersAccounts SET current_balance = ? WHERE id = ?`,
          [remainingBalance, member.id]
        );
      } else if (isEntry) {
        reason = "Insufficient balance";
      } else {
        accessGranted = true; 
      }
    } else if (admin.system_type === "subscription") {
      const today = new Date().toISOString().slice(0, 10);
      const expiryDate = member.subscription_expiry
        ? new Date(member.subscription_expiry).toISOString().slice(0, 10)
        : null;

      if (expiryDate && expiryDate >= today) {
        accessGranted = true;
      } else {
        reason = "Subscription expired";
      }
    }
  }

  const memberStatus = accessGranted
    ? isEntry ? "inside" : "outside"
    : "denied";

  const entryTime = isEntry && accessGranted ? new Date() : lastLog?.entry_time || null;
  const exitTime = !isEntry && accessGranted ? new Date() : lastLog?.exit_time || null;
  if (accessGranted) {
    if (isEntry && !isCurrentlyInside) {
      const [result] = await dbSuperAdmin.promise().query(
        `INSERT INTO AdminEntryLogs 
         (rfid_tag, full_name, admin_id, staff_name, visitor_type, system_type, 
          deducted_amount, remaining_balance, subscription_expiry, member_status, 
          entry_time, location)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rfid_tag,
          member.full_name,
          member.admin_id,
          staff_name,
          "Member",
          admin.system_type,
          deductedAmount,
          remainingBalance,
          member.subscription_expiry || null,
          "inside",
          entryTime,
          location,
        ]
      );
      logId = result.insertId;
    } else if (!isEntry && isCurrentlyInside) {
      await dbSuperAdmin.promise().query(
        `UPDATE AdminEntryLogs
         SET member_status = 'outside', exit_time = ?, location = ?, 
             remaining_balance = ?, deducted_amount = ?
         WHERE id = ?`,
        [exitTime, location, remainingBalance, deductedAmount, lastLog.id]
      );
      logId = lastLog.id;
    }
  }

  broadcastToClients({
    type: "member-update",
    data: {
      id: logId,
      rfid_tag,
      full_name: member.full_name,
      profile_image_url: member.profile_image_url,
      visitor_type: "Member",
      system_type: admin.system_type,
      status: memberStatus,
      reason,
      entry_time: entryTime ? entryTime.toISOString() : null,
      exit_time: exitTime ? exitTime.toISOString() : null,
      deducted_amount: deductedAmount,
      remaining_balance: remainingBalance,
      subscription_expiry: member.subscription_expiry,
      staff_name,
      location,
      timestamp: new Date().toISOString(),
    },
  });
}






module.exports = { setupWebSocket, broadcastToClients };
