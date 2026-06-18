const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");
const logAudit = require("../middleware/auditLogger");
const formatPaymentMethod = require('../helpers/formatPaymentMethod');
router.get("/member-by-rfid/:rfid", async (req, res) => {
  const { rfid } = req.params;

  try {
const [rows] = await dbSuperAdmin.promise().query(
      `SELECT m.*, r.customer_number_display
       FROM MembersAccounts m
       LEFT JOIN RegisteredRfid r ON r.rfid_tag = m.rfid_tag AND r.role = 'Member'
       WHERE m.rfid_tag = ? LIMIT 1`,
      [rfid]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Member not found." });
    }

    let member = rows[0];

    if (member.profile_image_url && !member.profile_image_url.startsWith("/")) {
      member.profile_image_url = `/${member.profile_image_url}`;
    }

    return res.status(200).json(member);
  } catch (err) {
    console.error("Error fetching member by RFID:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

router.get("/member-by-id/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await dbSuperAdmin.promise().query(
      `SELECT m.*, r.customer_number_display
       FROM MembersAccounts m
       LEFT JOIN RegisteredRfid r ON r.rfid_tag = m.rfid_tag AND r.role = 'Member'
       WHERE m.id = ? OR r.customer_number = ? LIMIT 1`,
      [id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Member not found." });
    }

    let member = rows[0];

    if (member.profile_image_url && !member.profile_image_url.startsWith("/")) {
      member.profile_image_url = `/${member.profile_image_url}`;
    }

    return res.status(200).json(member);
  } catch (err) {
    console.error("Error fetching member by ID:", err);
    return res.status(500).json({ message: "Server error." });
  }
});


router.post("/renew-subscription", async (req, res) => {
const {
    member_id,
    rfid_tag,
    full_name,
    admin_id,
    staff_name,
    plan_name,
    payment,
    subscription_type,
    subscription_start,
    subscription_expiry,
    payment_Method,
    reference
  } = req.body;

if (
    !member_id || !full_name || !admin_id || !staff_name || !plan_name ||
    !payment || !subscription_type || !subscription_start || !subscription_expiry || !payment_Method
  ) {
    return res.status(400).json({ message: "All fields are required." });
  }

const paymentMethodFormatted = formatPaymentMethod(payment_Method);  const paymentNumber = parseFloat(payment);

  if (isNaN(paymentNumber)) {
    return res.status(400).json({ message: "Invalid payment amount." });
  }

  try {
const [memberRows] = await dbSuperAdmin.promise().query(
      "SELECT id, rfid_tag, subscription_expiry FROM MembersAccounts WHERE id = ? AND system_type = 'subscription' LIMIT 1",
      [member_id]
    );

    if (memberRows.length === 0) {
      return res.status(404).json({ message: "Member not found or not a subscription account." });
    }

    const memberId = memberRows[0].id;
    const currentRfid = memberRows[0].rfid_tag;
    const currentExpiry = memberRows[0].subscription_expiry;

    let startDate, expiryDate;
    const today = new Date();
    const currentExpiryDate = new Date(currentExpiry);

    if (!isNaN(currentExpiryDate.getTime()) && currentExpiryDate > today) {
      startDate = currentExpiryDate;
    } else {
      startDate = today;
    }

    const [planRows] = await dbSuperAdmin.promise().query(
      "SELECT duration_in_days FROM AdminPricingOptions WHERE admin_id = ? AND plan_name = ? LIMIT 1",
      [admin_id, plan_name]
    );

    if (planRows.length === 0) {
      return res.status(404).json({ message: "Plan not found." });
    }

    const durationInDays = planRows[0].duration_in_days;

    expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + durationInDays);

    const formattedStart = startDate.toISOString().split('T')[0];
    const formattedExpiry = expiryDate.toISOString().split('T')[0];

    console.log("📅 Renewal Dates:", {
      currentExpiry,
      startDate: formattedStart,
      expiryDate: formattedExpiry,
      durationInDays
    });
const updateSql = `
      UPDATE MembersAccounts
      SET subscription_type = ?, 
          subscription_fee = ?, 
          subscription_start = ?, 
          subscription_expiry = ?,
          status = 'active'
      WHERE id = ? AND system_type = 'subscription'
    `;

    const [updateResult] = await dbSuperAdmin.promise().query(updateSql, [
      subscription_type,
      paymentNumber,
      formattedStart,
      formattedExpiry,
      memberId
    ]);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: "Failed to update member." });
    }

    const insertTxnSql = `
      INSERT INTO AdminTransactions 
      (admin_id, member_id, member_name, rfid_tag, amount, payment_method, reference, staff_name, transaction_type, plan_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'renewal', ?)
    `;

    await dbSuperAdmin.promise().query(insertTxnSql, [
      admin_id,
      memberId,
      full_name,
      rfid_tag,
      paymentNumber,
      paymentMethodFormatted,
      paymentMethodFormatted !== "Cash" ? reference : null,
      staff_name,
      plan_name
    ]);

const insertMemberTxnSql = `
      INSERT INTO AdminMembersTransactions 
      (member_id, admin_id, rfid_tag, full_name, transaction_type, amount, balance_added, new_balance, 
       payment_method, reference, tax, processed_by, subscription_type, subscription_start, subscription_expiry)
      VALUES (?, ?, ?, ?, 'renew_subscription', ?, 0.00, 0.00, ?, ?, 1.00, ?, ?, ?, ?)
    `;

    await dbSuperAdmin.promise().query(insertMemberTxnSql, [
      memberId,
      admin_id,
      currentRfid,
      full_name,
      paymentNumber,
      paymentMethodFormatted,
      paymentMethodFormatted !== "Cash" ? reference : null,
      staff_name,
      subscription_type,
      formattedStart,
      formattedExpiry
    ]);

    await logAudit({
      req,
      action: 'UPDATE',
      module: 'Members',
      target: full_name,
      target_id: memberId,
      description: `Renewed membership of ${full_name}`,
      payload: req.body,
    });

    return res.status(200).json({
      message: "Subscription renewed successfully!",
      status: "active",
      subscription_start: formattedStart,
      subscription_expiry: formattedExpiry
    });

  } catch (err) {
    console.error("Error renewing subscription:", err);
    return res.status(500).json({ message: "Server error during renewal." });
  }
});

router.post("/tapup-member", async (req, res) => {
const {
    member_id,
    rfid_tag,
    full_name,
    admin_id,
    staff_name,
    plan_name,
    amount_to_pay,
    amount_to_credit,
    payment_method,
    reference
  } = req.body;

if (!member_id || !admin_id || !plan_name || !amount_to_pay || !amount_to_credit || !payment_method) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const [sessionRows] = await dbSuperAdmin.promise().query(
      "SELECT amount_to_pay FROM AdminPricingOptions WHERE admin_id = ? AND plan_name = 'Daily Session' AND is_active = 1 LIMIT 1",
      [admin_id]
    );

    const minimumSessionFee = sessionRows.length > 0 ? parseFloat(sessionRows[0].amount_to_pay) : 0;

    console.log(`💰 Minimum Session Fee from AdminPricingOptions: ₱${minimumSessionFee}`);

const updateSql = `
      UPDATE MembersAccounts
      SET current_balance = current_balance + ?
      WHERE id = ? AND system_type = 'prepaid_entry'
    `;
    const [updateResult] = await dbSuperAdmin.promise().query(updateSql, [
      parseFloat(amount_to_credit),
      member_id
    ]);
    console.log("Update affected rows:", updateResult.affectedRows);

    if (updateResult.affectedRows === 0) {
      console.warn("⚠️ Update succeeded but no rows changed. Possibly same values.");
    }

    const [memberRow] = await dbSuperAdmin.promise().query(
      "SELECT id, rfid_tag, current_balance FROM MembersAccounts WHERE id = ? LIMIT 1",
      [member_id]
    );
    const memberId = memberRow[0]?.id;
    const currentRfid = memberRow[0]?.rfid_tag;
    const newBalance = parseFloat(memberRow[0]?.current_balance || 0);

    const newStatus = newBalance >= minimumSessionFee ? 'active' : 'inactive';

    console.log(`📊 Balance Check: ₱${newBalance} ${newBalance >= minimumSessionFee ? '≥' : '<'} ₱${minimumSessionFee} → Status: ${newStatus}`);

await dbSuperAdmin.promise().query(
      "UPDATE MembersAccounts SET status = ? WHERE id = ?",
      [newStatus, memberId]
    );

    await dbSuperAdmin.promise().query(
      `INSERT INTO AdminTransactions 
       (admin_id, member_id, member_name, rfid_tag, amount, payment_method, reference, staff_name, transaction_type, plan_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Tapup', ?)`,
      [
        admin_id, memberId, full_name, rfid_tag, amount_to_pay, payment_method,
        formatPaymentMethod(payment_method) !== "Cash" ? reference : null,
        staff_name, plan_name
      ]
    );

await dbSuperAdmin.promise().query(
      `INSERT INTO AdminMembersTransactions 
       (member_id, admin_id, rfid_tag, full_name, transaction_type, amount, balance_added, new_balance, 
        payment_method, reference, tax, processed_by, subscription_type)
       VALUES (?, ?, ?, ?, 'top_up', ?, ?, ?, ?, ?, 1.00, ?, ?)`,
      [
        memberId, admin_id, currentRfid, full_name, amount_to_pay, amount_to_credit, newBalance,
formatPaymentMethod(payment_method),
formatPaymentMethod(payment_method) !== "Cash" ? reference : null,
        staff_name, plan_name
      ]
    );

    await logAudit({
      req,
      action: 'UPDATE',
      module: 'Members',
      target: full_name,
      target_id: memberId,
      description: `Renewed membership of ${full_name}`,
      payload: req.body,
    });

// Check if member has a payment_pending session that needs deduction
    try {
      const [pendingSessionRows] = await dbSuperAdmin.promise().query(
        `SELECT * FROM AdminEntryLogs 
         WHERE member_id = ? AND payment_pending = 1 AND session_closed = 0 
         ORDER BY id DESC LIMIT 1`,
        [member_id]
      );

      if (pendingSessionRows.length > 0) {
        const pendingSession = pendingSessionRows[0];

        // Get session fee
        const [feeRows] = await dbSuperAdmin.promise().query(
          `SELECT amount_to_pay AS session_fee 
           FROM AdminPricingOptions 
           WHERE admin_id = ? AND plan_name = 'Daily Session' AND is_active = 1 
           LIMIT 1`,
          [admin_id]
        );

        // Get grace period minutes
        const [adminRows] = await dbSuperAdmin.promise().query(
          `SELECT grace_period_minutes FROM AdminAccounts WHERE id = ? LIMIT 1`,
          [admin_id]
        );

        if (feeRows.length > 0 && adminRows.length > 0) {
          const sessionFee = parseFloat(feeRows[0].session_fee);
          const gracePeriodMs = adminRows[0].grace_period_minutes * 60 * 1000;
          const graceExpiresAt = new Date(pendingSession.grace_expires_at);
          const now = new Date();

          // Calculate missed windows — minimum 1 always owed
          const timePastExpiry = now - graceExpiresAt;
          const missedWindows = Math.max(1, Math.floor(timePastExpiry / gracePeriodMs) + 1);
          const totalOwed = missedWindows * sessionFee;

          console.log(`Payment pending recovery: ${missedWindows} window(s) owed — ₱${totalOwed}`);

          // Calculate how many sessions we can actually cover
          const coverableWindows = Math.floor(newBalance / sessionFee);
          const windowsToDeduct = Math.min(missedWindows, coverableWindows);
          const amountToDeduct = windowsToDeduct * sessionFee;

          if (windowsToDeduct > 0) {
            // Deduct from balance
            const balanceAfterDeduction = newBalance - amountToDeduct;

            await dbSuperAdmin.promise().query(
              `UPDATE MembersAccounts SET current_balance = ? WHERE id = ?`,
              [balanceAfterDeduction, member_id]
            );

            // Log each window as a separate session_deduction
            for (let i = 0; i < windowsToDeduct; i++) {
              const balanceAfterThisWindow = newBalance - ((i + 1) * sessionFee);
              await dbSuperAdmin.promise().query(
                `INSERT INTO AdminMembersTransactions
                 (member_id, rfid_tag, full_name, admin_id, transaction_type,
                  amount, new_balance, payment_method, processed_by, timestamp)
                 VALUES (?, ?, ?, ?, 'session_deduction', ?, ?, 'balance', 'system', NOW())`,
                [
                  member_id,
                  currentRfid,
                  full_name,
                  admin_id,
                  -sessionFee,
                  balanceAfterThisWindow
                ]
              );
            }

 const remainingMissed = missedWindows - windowsToDeduct;
            const stillPending = (remainingMissed > 0 || balanceAfterDeduction < sessionFee) ? 1 : 0;
            const newGraceExpiresAt = stillPending === 0
              ? new Date(Date.now() + gracePeriodMs)
              : pendingSession.grace_expires_at;

            await dbSuperAdmin.promise().query(
              `UPDATE AdminEntryLogs
               SET payment_pending = ?,
                   sessions_deducted = sessions_deducted + ?,
                   deducted_amount = deducted_amount + ?,
                   grace_expires_at = ?
               WHERE id = ?`,
              [
                stillPending,
                windowsToDeduct,
                amountToDeduct,
                newGraceExpiresAt,
                pendingSession.id
              ]
            );

            console.log(`Recovery complete — deducted ₱${amountToDeduct}, payment_pending = ${stillPending}`);
          }
        }
      }
} catch (recoveryError) {
      console.error("Payment pending recovery error:", recoveryError.message);
      // Do not fail the top-up if recovery fails — balance was already credited
    }

    return res.status(200).json({
      message: "Tap-up successful!",
      status: newStatus,
      new_balance: newBalance,
      minimum_session_fee: minimumSessionFee
    });

  } catch (err) {
    console.error("❌ Tap-up error:", err);
    return res.status(500).json({ message: "Server error during tap-up." });
  }
});

module.exports = router;