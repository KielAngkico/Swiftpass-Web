const cron = require("node-cron");
const dbSuperAdmin = require("../db");
const { broadcastToClients } = require("./websocket");

cron.schedule("* * * * *", async () => {
  console.log("Grace period cron fired");

  try {
    const db = dbSuperAdmin.promise();

    // Get all expired, open, non-pending sessions
    const [expiredSessions] = await db.query(
      `SELECT 
        el.id,
        el.member_id,
        el.rfid_tag,
        el.full_name,
        el.admin_id,
        el.member_status,
        el.grace_expires_at,
        el.sessions_deducted,
        el.deducted_amount,
        ma.current_balance,
        aa.grace_period_minutes,
        aa.session_fee
       FROM AdminEntryLogs el
       JOIN MembersAccounts ma ON ma.id = el.member_id
       JOIN AdminAccounts aa ON aa.id = el.admin_id
       WHERE el.grace_expires_at <= NOW()
         AND el.session_closed = 0
         AND el.payment_pending = 0
         AND el.system_type = 'prepaid_entry'
         AND el.visitor_type = 'Member'
      FOR UPDATE`
    );

    if (expiredSessions.length === 0) {
      console.log("No expired sessions to process");
      return;
    }

    console.log(`Found ${expiredSessions.length} expired session(s) to process`);

    for (const session of expiredSessions) {
      const sessionFee = parseFloat(session.session_fee || 0);
      const currentBalance = parseFloat(session.current_balance || 0);

      console.log(`\nProcessing: ${session.full_name} (Log ID: ${session.id})`);
      console.log(`   Balance: ₱${currentBalance} | Fee: ₱${sessionFee}`);
      console.log(`   Status: ${session.member_status}`);

      // Check balance
      if (currentBalance < sessionFee) {
        console.log(`Insufficient balance for ${session.full_name}`);

        // Set payment_pending — keep session open
        await db.query(
          `UPDATE AdminEntryLogs 
           SET payment_pending = 1
           WHERE id = ?`,
          [session.id]
        );

        // Broadcast alert to admin dashboard
        broadcastToClients({
          type: "balance-alert",
          data: {
            member_id: session.member_id,
            full_name: session.full_name,
            rfid_tag: session.rfid_tag,
            current_balance: currentBalance,
            session_fee: sessionFee,
            admin_id: session.admin_id,
            reason: "Insufficient balance — RFID entry and exit blocked until topped up",
            timestamp: new Date().toISOString()
          }
        });

        continue;
      }

      // Balance sufficient — deduct
      const newBalance = currentBalance - sessionFee;
      const newDeductedAmount = parseFloat(session.deducted_amount || 0) + sessionFee;
      const newSessionsDeducted = session.sessions_deducted + 1;
      const newGraceExpiresAt = new Date(
        new Date(session.grace_expires_at).getTime() +
        session.grace_period_minutes * 60 * 1000
      );

      // 1. Deduct from MembersAccounts
      await db.query(
        `UPDATE MembersAccounts 
         SET current_balance = ?
         WHERE id = ?`,
        [newBalance, session.member_id]
      );

      // 2. Log in AdminMembersTransactions (negative amount)
      await db.query(
        `INSERT INTO AdminMembersTransactions
         (member_id, rfid_tag, full_name, admin_id, transaction_type, 
          amount, new_balance, payment_method, processed_by, timestamp)
         VALUES (?, ?, ?, ?, 'session_deduction', ?, ?, 'balance', 'system', NOW())`,
        [
          session.member_id,
          session.rfid_tag,
          session.full_name,
          session.admin_id,
          -sessionFee,
          newBalance
        ]
      );

      // 3. Member is outside — close session, stop
      if (session.member_status === 'outside') {
        await db.query(
          `UPDATE AdminEntryLogs
           SET session_closed = 1,
               sessions_deducted = ?,
               deducted_amount = ?
           WHERE id = ?`,
          [newSessionsDeducted, newDeductedAmount, session.id]
        );

        console.log(`Session closed for ${session.full_name} — ₱${sessionFee} deducted`);

        broadcastToClients({
          type: "grace-period-deduction",
          data: {
            member_id: session.member_id,
            full_name: session.full_name,
            rfid_tag: session.rfid_tag,
            deducted_amount: sessionFee,
            new_balance: newBalance,
            sessions_deducted: newSessionsDeducted,
            session_closed: true,
            admin_id: session.admin_id,
            timestamp: new Date().toISOString()
          }
        });

      } else {
        // Member is inside — advance window, keep session open
        await db.query(
          `UPDATE AdminEntryLogs
           SET sessions_deducted = ?,
               deducted_amount = ?,
               grace_expires_at = ?
           WHERE id = ?`,
          [newSessionsDeducted, newDeductedAmount, newGraceExpiresAt, session.id]
        );

        console.log(`Window advanced for ${session.full_name} — ₱${sessionFee} deducted, next window: ${newGraceExpiresAt}`);

        broadcastToClients({
          type: "grace-period-deduction",
          data: {
            member_id: session.member_id,
            full_name: session.full_name,
            rfid_tag: session.rfid_tag,
            deducted_amount: sessionFee,
            new_balance: newBalance,
            sessions_deducted: newSessionsDeducted,
            session_closed: false,
            next_window: newGraceExpiresAt,
            admin_id: session.admin_id,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

  } catch (error) {
    console.error("Grace period cron error:", error.message);
    console.error(error.stack);
  }
});

console.log("Grace period cron registered");