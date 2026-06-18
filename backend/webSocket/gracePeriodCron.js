const cron = require("node-cron");
const dbSuperAdmin = require("../db");
const { broadcastToClients } = require("./websocket");

cron.schedule("* * * * *", async () => {
  console.log("Grace period cron fired");

  try {
    const db = dbSuperAdmin.promise();

    // Fetch all open, non-closed parent sessions where grace window has expired
    // No payment_pending filter — we re-evaluate every tick regardless of debt state
    const [parentSessions] = await db.query(
      `SELECT
        el.id,
        el.member_id,
        el.rfid_tag,
        el.full_name,
        el.admin_id,
        el.grace_expires_at,
        el.sessions_deducted,
        el.deducted_amount,
        el.payment_pending,
        ma.current_balance,
        aa.grace_period_minutes,
        ap.amount_to_pay AS session_fee
       FROM AdminEntryLogs el
       JOIN MembersAccounts ma ON ma.id = el.member_id
       JOIN AdminAccounts aa ON aa.id = el.admin_id
       JOIN AdminPricingOptions ap
         ON ap.admin_id = aa.id
         AND ap.plan_name = 'Daily Session'
         AND ap.is_active = 1
       WHERE el.grace_expires_at <= NOW()
         AND el.session_closed = 0
         AND el.is_grace_reentry = 0
         AND el.system_type = 'prepaid_entry'
         AND el.visitor_type = 'Member'
       FOR UPDATE`
    );

    if (parentSessions.length === 0) {
      console.log("No expired parent sessions to process");
      return;
    }

    console.log(`Found ${parentSessions.length} expired parent session(s)`);

    for (const session of parentSessions) {
      const sessionFee = parseFloat(session.session_fee || 0);
      const currentBalance = parseFloat(session.current_balance || 0);
      const gracePeriodMs = session.grace_period_minutes * 60 * 1000;
      const graceExpiresAt = new Date(session.grace_expires_at);
      const now = new Date();

      console.log(`\nProcessing parent: ${session.full_name} (Log ID: ${session.id})`);
      console.log(`   Balance: ₱${currentBalance} | Fee: ₱${sessionFee}`);

      // Find the latest grace re-entry row for this parent
      const [latestGraceRows] = await db.query(
        `SELECT id, member_status, exit_time
         FROM AdminEntryLogs
         WHERE parent_session_id = ?
           AND is_grace_reentry = 1
         ORDER BY id DESC LIMIT 1`,
        [session.id]
      );
      const latestGrace = latestGraceRows[0] || null;

      // Determine actual current status:
      // - If a grace row exists, its exit_time tells us inside/outside
      // - If no grace row exists, fall back to parent's own member_status
      const isOutside = latestGrace
        ? latestGrace.exit_time !== null
        : session.member_status === 'outside';

      console.log(`   Latest grace row: ${latestGrace ? `ID ${latestGrace.id}, exit_time=${latestGrace.exit_time}` : 'none'}`);
      console.log(`   Resolved status: ${isOutside ? 'outside' : 'inside'}`);

      if (isOutside) {
        // Member is outside — exit was already balance-checked so we know
        // balance covers the full owed amount. Deduct all missed windows.
        const missedWindows = Math.max(1, Math.floor((now - graceExpiresAt) / gracePeriodMs) + 1);
        const totalOwed = missedWindows * sessionFee;

        console.log(`   Outside — deducting ${missedWindows} window(s), total ₱${totalOwed}`);

        const newBalance = currentBalance - totalOwed;
        const newDeductedAmount = parseFloat(session.deducted_amount || 0) + totalOwed;
        const newSessionsDeducted = session.sessions_deducted + missedWindows;

        // 1. Deduct from balance
        await db.query(
          `UPDATE MembersAccounts SET current_balance = ? WHERE id = ?`,
          [newBalance, session.member_id]
        );

        // 2. Log each window as a separate transaction
        for (let i = 0; i < missedWindows; i++) {
          const balanceAfterThisWindow = currentBalance - ((i + 1) * sessionFee);
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
              balanceAfterThisWindow
            ]
          );
        }

// 3. Close parent session, clear payment_pending, reflect final exit
        await db.query(
          `UPDATE AdminEntryLogs
           SET session_closed = 1,
               payment_pending = 0,
               sessions_deducted = ?,
               deducted_amount = ?,
               member_status = 'outside',
               exit_time = (
                 SELECT exit_time FROM (
                   SELECT exit_time FROM AdminEntryLogs 
                   WHERE parent_session_id = ? 
                     AND is_grace_reentry = 1 
                     AND exit_time IS NOT NULL
                   ORDER BY id DESC LIMIT 1
                 ) AS last_grace
               )
           WHERE id = ?`,
          [newSessionsDeducted, newDeductedAmount, session.id, session.id]
        );

// 4. Close ALL grace rows for this parent session
        await db.query(
          `UPDATE AdminEntryLogs SET session_closed = 1 
           WHERE parent_session_id = ?
             AND is_grace_reentry = 1`,
          [session.id]
        );

        console.log(`   Session closed — ₱${totalOwed} deducted across ${missedWindows} window(s)`);

        broadcastToClients({
          type: "grace-period-deduction",
          data: {
            member_id: session.member_id,
            full_name: session.full_name,
            rfid_tag: session.rfid_tag,
            deducted_amount: totalOwed,
            new_balance: newBalance,
            sessions_deducted: newSessionsDeducted,
            session_closed: true,
            admin_id: session.admin_id,
            timestamp: now.toISOString()
          }
        });

      } else {
        // Member is inside — check balance for this window only
        if (currentBalance < sessionFee) {
          console.log(`   Inside — insufficient balance, setting payment_pending`);

          await db.query(
            `UPDATE AdminEntryLogs SET payment_pending = 1 WHERE id = ?`,
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
              timestamp: now.toISOString()
            }
          });

        } else {
          // Balance sufficient — deduct 1 window, advance grace, clear any pending
          const newBalance = currentBalance - sessionFee;
          const newDeductedAmount = parseFloat(session.deducted_amount || 0) + sessionFee;
          const newSessionsDeducted = session.sessions_deducted + 1;
          const newGraceExpiresAt = new Date(graceExpiresAt.getTime() + gracePeriodMs);

          console.log(`   Inside — deducting ₱${sessionFee}, next window: ${newGraceExpiresAt}`);

          // 1. Deduct from balance
          await db.query(
            `UPDATE MembersAccounts SET current_balance = ? WHERE id = ?`,
            [newBalance, session.member_id]
          );

          // 2. Log transaction
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

          // 3. Advance grace window on parent, clear payment_pending
          await db.query(
            `UPDATE AdminEntryLogs
             SET sessions_deducted = ?,
                 deducted_amount = ?,
                 grace_expires_at = ?,
                 payment_pending = 0
             WHERE id = ?`,
            [newSessionsDeducted, newDeductedAmount, newGraceExpiresAt, session.id]
          );

          // 4. Sync grace window on the latest open grace row if exists
          if (latestGrace && latestGrace.exit_time === null) {
            await db.query(
              `UPDATE AdminEntryLogs SET grace_expires_at = ? WHERE id = ?`,
              [newGraceExpiresAt, latestGrace.id]
            );
          }

          console.log(`   Window advanced — ₱${sessionFee} deducted, new window: ${newGraceExpiresAt}`);

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
              timestamp: now.toISOString()
            }
          });
        }
      }
    }

  } catch (error) {
    console.error("Grace period cron error:", error.message);
    console.error(error.stack);
  }
});

console.log("Grace period cron registered");