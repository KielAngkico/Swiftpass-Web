const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");

/**
 * Replace Member RFID
 */
router.put("/replace-member-rfid/:id", async (req, res) => {
  const memberId = req.params.id;
  const {
    new_rfid_tag,
    replacement_fee,
    payment_method,
    reference,
    admin_id,
    staff_name,
  } = req.body;

  // Validation
  if (!new_rfid_tag || !admin_id || !staff_name) {
    return res.status(400).json({ 
      message: "Missing required fields: new_rfid_tag, admin_id, or staff_name" 
    });
  }

  try {
    // 🔹 Fetch member data FIRST to get the OLD RFID
    const [memberRows] = await dbSuperAdmin.promise().query(
      "SELECT * FROM MembersAccounts WHERE id = ? LIMIT 1",
      [memberId]
    );

    if (memberRows.length === 0) {
      return res.status(404).json({ message: "Member not found." });
    }

    const member = memberRows[0];
    const oldRfid = member.rfid_tag; // ✅ Store the OLD RFID before updating

    console.log("🔍 Member found:", {
      id: member.id,
      name: member.full_name,
      oldRfid: oldRfid,
      newRfid: new_rfid_tag
    });

    // Validate that new RFID is different
    if (oldRfid === new_rfid_tag) {
      return res.status(400).json({
        message: "New RFID must be different from current RFID"
      });
    }

    // 🔹 Check if new RFID already exists on another member
    const [existingRfid] = await dbSuperAdmin.promise().query(
      "SELECT id, full_name FROM MembersAccounts WHERE rfid_tag = ? AND id != ?",
      [new_rfid_tag, memberId]
    );

    if (existingRfid.length > 0) {
      return res.status(400).json({
        message: `RFID tag "${new_rfid_tag}" is already assigned to ${existingRfid[0].full_name}`,
      });
    }

    // 🔹 Update RFID fields - OLD RFID goes to previous_rfid, NEW RFID goes to rfid_tag
    const updateSql = `
      UPDATE MembersAccounts
      SET previous_rfid = ?, 
          rfid_tag = ?, 
          replaced_by = ?, 
          replaced_at = NOW()
      WHERE id = ?
    `;
    
    console.log("📝 Updating with:", {
      previous_rfid: oldRfid,
      rfid_tag: new_rfid_tag,
      replaced_by: staff_name,
      member_id: memberId
    });

    await dbSuperAdmin.promise().query(updateSql, [
      oldRfid,        // ✅ OLD RFID → previous_rfid
      new_rfid_tag,   // ✅ NEW RFID → rfid_tag
      staff_name,
      memberId,
    ]);

    // 🔹 Record the replacement fee in AdminTransactions
    const txnSql = `
      INSERT INTO AdminTransactions
      (admin_id, member_id, member_name, rfid_tag, amount, payment_method, reference, staff_name, transaction_type, plan_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'rfid_replacement', 'RFID Replacement')
    `;
    await dbSuperAdmin.promise().query(txnSql, [
      admin_id,
      member.id,
      member.full_name,
      new_rfid_tag,  // ✅ Record the NEW RFID in transaction
      replacement_fee || 0,
      payment_method || "Cash",
      payment_method?.toLowerCase() === "gcash" ? reference : null,
      staff_name,
    ]);

    // 🔹 Record also in AdminMembersTransactions
    const memberTxnSql = `
      INSERT INTO AdminMembersTransactions
      (admin_id, rfid_tag, full_name, transaction_type, amount, balance_added, new_balance,
       payment_method, reference, tax, processed_by, subscription_type)
      VALUES (?, ?, ?, 'rfid_replacement', ?, 0.00, 0.00, ?, ?, 1.00, ?, ?)
    `;
    await dbSuperAdmin.promise().query(memberTxnSql, [
      admin_id,
      new_rfid_tag,  // ✅ Record the NEW RFID in transaction
      member.full_name,
      replacement_fee || 0,
      payment_method || "Cash",
      payment_method?.toLowerCase() === "gcash" ? reference : null,
      staff_name,
      member.subscription_type || null,
    ]);

    res.status(200).json({
      message: "✅ RFID replaced successfully.",
      old_rfid: oldRfid,
      new_rfid: new_rfid_tag,
      member_name: member.full_name,
      processed_by: staff_name,
    });
  } catch (err) {
    console.error("❌ Error replacing RFID:", err);
    res.status(500).json({ 
      message: "Server error while replacing RFID.",
      error: err.message 
    });
  }
});

module.exports = router;

