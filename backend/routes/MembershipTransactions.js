const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db"); 

router.get("/member-by-rfid/:rfid", async (req, res) => {
  const { rfid } = req.params;

  try {
    const [rows] = await dbSuperAdmin.promise().query(
      "SELECT * FROM MembersAccounts WHERE rfid_tag = ? LIMIT 1",
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
    console.error("❌ Error fetching member by RFID:", err);
    return res.status(500).json({ message: "Server error." });
  }
});
router.post("/renew-subscription", async (req, res) => {
  const {
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
    !rfid_tag || !full_name || !admin_id || !staff_name || !plan_name ||
    !payment || !subscription_type || !subscription_start || !subscription_expiry || !payment_Method
  ) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const paymentMethodFormatted = payment_Method.charAt(0).toUpperCase() + payment_Method.slice(1).toLowerCase();
  const paymentNumber = parseFloat(payment);

  if (isNaN(paymentNumber)) {
    return res.status(400).json({ message: "Invalid payment amount." });
  }

  try {
    // ✅ FIRST: Fetch the member to get current subscription_expiry
    const [memberRows] = await dbSuperAdmin.promise().query(
      "SELECT id, subscription_expiry FROM MembersAccounts WHERE rfid_tag = ? AND system_type = 'subscription' LIMIT 1",
      [rfid_tag]
    );

    if (memberRows.length === 0) {
      return res.status(404).json({ message: "Member not found or not a subscription account." });
    }

    const memberId = memberRows[0].id;
    const currentExpiry = memberRows[0].subscription_expiry;

    // ✅ Calculate new dates based on current expiry (if valid and future) or today
    let startDate, expiryDate;
    const today = new Date();
    const currentExpiryDate = new Date(currentExpiry);

    if (!isNaN(currentExpiryDate.getTime()) && currentExpiryDate > today) {
      // Subscription is still valid - extend from current expiry
      startDate = currentExpiryDate;
    } else {
      // Subscription expired or invalid - start from today
      startDate = today;
    }

    // Get duration from the plan (fetch from AdminPricingOptions table)
    const [planRows] = await dbSuperAdmin.promise().query(
      "SELECT duration_in_days FROM AdminPricingOptions WHERE admin_id = ? AND plan_name = ? LIMIT 1",
      [admin_id, plan_name]
    );

    if (planRows.length === 0) {
      return res.status(404).json({ message: "Plan not found." });
    }

    const durationInDays = planRows[0].duration_in_days;

    // Calculate expiry date
    expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + durationInDays);

    // Format dates as YYYY-MM-DD
    const formattedStart = startDate.toISOString().split('T')[0];
    const formattedExpiry = expiryDate.toISOString().split('T')[0];

    console.log("📅 Renewal Dates:", {
      currentExpiry,
      startDate: formattedStart,
      expiryDate: formattedExpiry,
      durationInDays
    });

    // Update member with subscription details AND set status to 'active'
    const updateSql = `
      UPDATE MembersAccounts
      SET subscription_type = ?, 
          subscription_fee = ?, 
          subscription_start = ?, 
          subscription_expiry = ?,
          status = 'active'
      WHERE rfid_tag = ? AND system_type = 'subscription'
    `;

    const [updateResult] = await dbSuperAdmin.promise().query(updateSql, [
      subscription_type,
      paymentNumber,
      formattedStart,
      formattedExpiry,
      rfid_tag
    ]);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: "Failed to update member." });
    }

    // Insert into AdminTransactions
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
      paymentMethodFormatted.toLowerCase() === "gcash" ? reference : null,
      staff_name,
      plan_name
    ]);

    // Insert into AdminMembersTransactions
    const insertMemberTxnSql = `
      INSERT INTO AdminMembersTransactions 
      (admin_id, rfid_tag, full_name, transaction_type, amount, balance_added, new_balance, 
       payment_method, reference, tax, processed_by, subscription_type, subscription_start, subscription_expiry)
      VALUES (?, ?, ?, 'renew_subscription', ?, 0.00, 0.00, ?, ?, 1.00, ?, ?, ?, ?)
    `;

    await dbSuperAdmin.promise().query(insertMemberTxnSql, [
      admin_id,
      rfid_tag,
      full_name,
      paymentNumber,
      paymentMethodFormatted,
      paymentMethodFormatted.toLowerCase() === "gcash" ? reference : null,
      staff_name,
      subscription_type,
      formattedStart,
      formattedExpiry
    ]);

    return res.status(200).json({ 
      message: "✅ Subscription renewed successfully. Member is now active.",
      status: "active",
      subscription_start: formattedStart,
      subscription_expiry: formattedExpiry
    });

  } catch (err) {
    console.error("❌ Error renewing subscription:", err);
    return res.status(500).json({ message: "Server error during renewal." });
  }
});
router.post("/tapup-member", async (req, res) => {
  const {
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

  if (!rfid_tag || !admin_id || !plan_name || !amount_to_pay || !amount_to_credit || !payment_method) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const updateSql = `
      UPDATE MembersAccounts
      SET current_balance = current_balance + ?
      WHERE rfid_tag = ? AND system_type = 'prepaid_entry'
    `;
    const [updateResult] = await dbSuperAdmin.promise().query(updateSql, [
      parseFloat(amount_to_credit),
      rfid_tag
    ]);
    console.log("Update affected rows:", updateResult.affectedRows)

if (updateResult.affectedRows === 0) {
  console.warn("⚠️ Update succeeded but no rows changed. Possibly same values.");
}
    const [memberRow] = await dbSuperAdmin.promise().query(
      "SELECT id FROM MembersAccounts WHERE rfid_tag = ? LIMIT 1",
      [rfid_tag]
    );
    const memberId = memberRow[0]?.id;

    await dbSuperAdmin.promise().query(
      `INSERT INTO AdminTransactions 
       (admin_id, member_id, member_name, rfid_tag, amount, payment_method, reference, staff_name, transaction_type, plan_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Tapup', ?)`,
      [
        admin_id,
        memberId,
        full_name,
        rfid_tag,
        amount_to_pay,
        payment_method,
        payment_method.toLowerCase() === "gcash" ? reference : null,
        staff_name,
        plan_name
      ]
    );
    await dbSuperAdmin.promise().query(
      `INSERT INTO AdminMembersTransactions 
       (admin_id, rfid_tag, full_name, transaction_type, amount, balance_added, new_balance, 
        payment_method, reference, tax, processed_by, subscription_type)
       VALUES (?, ?, ?, 'top_up', ?, ?, 
         (SELECT current_balance FROM MembersAccounts WHERE rfid_tag = ?), ?, ?, 1.00, ?, ?)`,
      [
        admin_id,
        rfid_tag,
        full_name,
        amount_to_pay,
        amount_to_credit,
        rfid_tag,
        payment_method,
        payment_method.toLowerCase() === "gcash" ? reference : null,
        staff_name,
        plan_name
      ]
    );

    return res.status(200).json({ message: "✅ Tap-up successful." });
  } catch (err) {
    console.error("❌ Tap-up error:", err);
    return res.status(500).json({ message: "Server error during tap-up." });
  }
});

module.exports = router;
