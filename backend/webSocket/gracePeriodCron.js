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
        ap.amount_to_pay AS session_fee
       FROM AdminEntryLogs el
       JOIN MembersAccounts ma ON ma.id = el.member_id
       JOIN AdminAccounts aa ON aa.id = el.admin_id
       JOIN AdminPricingOptions ap ON ap.admin_id = aa.id
         AND ap.plan_name = 'Daily Session'
         AND ap.is_active = 1
WHERE el.grace_expires_at <= NOW()
         AND el.session_closed = 0
         AND el.payment_pending = 0
         AND el.system_type = 'prepaid_entry'
         AND el.visitor_type = 'Member'
         AND el.is_grace_reentry = 0
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

// Check balance — outside+insufficient cannot happen (exit check prevents it)
      if (currentBalance < sessionFee) {
        console.log(`Insufficient balance for ${session.full_name} — member is inside, blocking`);

        await db.query(
          `UPDATE AdminEntryLogs 
           SET payment_pending = 1
           WHERE id = ?`,
          [session.id]
        );

        broadcastToClients({
          type: "balance-alert",
          data: {
            member_id: session.member_id,
            full_name: session.full_name,
            rfid_tag: session.rfid_tag,
            current_balance: currentBalance,
            session_fee: sessionFee,
            admin_id: session.admin_id,
            reason: "Insufficient balance — entry and exit blocked until topped up",
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

// ---- STEP 2: Process grace re-entry rows ----
    const [expiredGraceSessions] = await db.query(
      `SELECT 
        el.id,
        el.member_id,
        el.rfid_tag,
        el.full_name,
        el.admin_id,
        el.member_status,
        el.grace_expires_at,
        el.parent_session_id,
        ma.current_balance,
        aa.grace_period_minutes,
        ap.amount_to_pay AS session_fee
       FROM AdminEntryLogs el
       JOIN MembersAccounts ma ON ma.id = el.member_id
       JOIN AdminAccounts aa ON aa.id = el.admin_id
       JOIN AdminPricingOptions ap ON ap.admin_id = aa.id
         AND ap.plan_name = 'Daily Session'
         AND ap.is_active = 1
       WHERE el.grace_expires_at <= NOW()
         AND el.session_closed = 0
         AND el.system_type = 'prepaid_entry'
         AND el.visitor_type = 'Member'
         AND el.is_grace_reentry = 1`
    );

    for (const session of expiredGraceSessions) {
      const sessionFee = parseFloat(session.session_fee || 0);
      const currentBalance = parseFloat(session.current_balance || 0);

      console.log(`\nGrace re-entry: ${session.full_name} (Log ID: ${session.id})`);
      console.log(`   Status: ${session.member_status} | Balance: ₱${currentBalance}`);

      // Member outside — just close the grace row, parent already deducted
      if (session.member_status === 'outside') {
        await db.query(
          `UPDATE AdminEntryLogs SET session_closed = 1 WHERE id = ?`,
          [session.id]
        );
        console.log(`Grace re-entry closed (outside) for ${session.full_name}`);
        continue;
      }

      // Member inside — check balance
      if (currentBalance < sessionFee) {
        // Set payment_pending on PARENT row
        if (session.parent_session_id) {
          await db.query(
            `UPDATE AdminEntryLogs SET payment_pending = 1 WHERE id = ?`,
            [session.parent_session_id]
          );
        }
        broadcastToClients({
          type: "balance-alert",
          data: {
            member_id: session.member_id,
            full_name: session.full_name,
            rfid_tag: session.rfid_tag,
            current_balance: currentBalance,
            session_fee: sessionFee,
            admin_id: session.admin_id,
            reason: "Insufficient balance — entry and exit blocked until topped up",
            timestamp: new Date().toISOString()
          }
        });
        console.log(`Payment pending set on parent for ${session.full_name}`);
        continue;
      }

      // Balance sufficient — deduct and advance window
      const newBalance = currentBalance - sessionFee;
      const newGraceExpiresAt = new Date(
        new Date(session.grace_expires_at).getTime() +
        session.grace_period_minutes * 60 * 1000
      );

      await db.query(
        `UPDATE MembersAccounts SET current_balance = ? WHERE id = ?`,
        [newBalance, session.member_id]
      );

      await db.query(
        `INSERT INTO AdminMembersTransactions
         (member_id, rfid_tag, full_name, admin_id, transaction_type,
          amount, new_balance, payment_method, processed_by, timestamp)
         VALUES (?, ?, ?, ?, 'session_deduction', ?, ?, 'balance', 'system', NOW())`,
        [session.member_id, session.rfid_tag, session.full_name, session.admin_id, -sessionFee, newBalance]
      );

      // Advance grace window on both grace row and parent row
      await db.query(
        `UPDATE AdminEntryLogs SET grace_expires_at = ? WHERE id = ?`,
        [newGraceExpiresAt, session.id]
      );
      if (session.parent_session_id) {
        await db.query(
          `UPDATE AdminEntryLogs SET grace_expires_at = ? WHERE id = ?`,
          [newGraceExpiresAt, session.parent_session_id]
        );
      }

      console.log(`Grace re-entry window advanced for ${session.full_name} — ₱${sessionFee} deducted`);

      broadcastToClients({
        type: "grace-period-deduction",
        data: {
          member_id: session.member_id,
          full_name: session.full_name,
          rfid_tag: session.rfid_tag,
          deducted_amount: sessionFee,
          new_balance: newBalance,
          session_closed: false,
          next_window: newGraceExpiresAt,
          admin_id: session.admin_id,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error("Grace period cron error:", error.message);
    console.error(error.stack);
  }
});

console.log("Grace period cron registered");