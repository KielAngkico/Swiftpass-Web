const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");
const logAudit = require("../middleware/auditLogger");
const formatPaymentMethod = require('../helpers/formatPaymentMethod');

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

  if (!new_rfid_tag || !admin_id || !staff_name) {
    return res.status(400).json({
      message: "Missing required fields: new_rfid_tag, admin_id, or staff_name"
    });
  }

  const conn = await dbSuperAdmin.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [memberRows] = await conn.query(
      "SELECT * FROM MembersAccounts WHERE id = ? LIMIT 1",
      [memberId]
    );
    if (memberRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Member not found." });
    }

    const member = memberRows[0];
    const oldRfid = member.rfid_tag;

    console.log("🔍 Member found:", {
      id: member.id,
      name: member.full_name,
      oldRfid: oldRfid,
      newRfid: new_rfid_tag
    });
    if (oldRfid === new_rfid_tag) {
      await conn.rollback();
      return res.status(400).json({
        message: "New RFID must be different from current RFID"
      });
    }

    // Validate new card in RegisteredRfid
    const [[newCard]] = await conn.query(
      `SELECT id, role, status, allocated_to_admin
       FROM RegisteredRfid WHERE rfid_tag = ? LIMIT 1`,
      [new_rfid_tag]
    );
    if (!newCard) {
      await conn.rollback();
      return res.status(400).json({ message: "New RFID not found in system." });
    }
    if (newCard.role !== 'Member') {
      await conn.rollback();
      return res.status(400).json({ message: `New card is a ${newCard.role} card. Only Member cards allowed.` });
    }
    if (newCard.status !== 'allocated') {
      await conn.rollback();
      return res.status(400).json({ message: `New card status is '${newCard.status}'. Must be 'allocated'.` });
    }
    if (newCard.allocated_to_admin !== parseInt(admin_id)) {
      await conn.rollback();
      return res.status(400).json({ message: "New card is not allocated to this gym." });
    }
    // Update MembersAccounts
    await conn.query(
      `UPDATE MembersAccounts
       SET previous_rfid = ?,
           rfid_tag = ?,
           replaced_by = ?,
           replaced_at = NOW()
       WHERE id = ?`,
      [oldRfid, new_rfid_tag, staff_name, memberId]
    );

    // Mark old card as replaced — dead forever
// Mark old card as replaced — dead forever
await conn.query(
  `UPDATE RegisteredRfid
   SET status = 'replaced',
       assigned_to_id = NULL,
       assigned_to_name = NULL,
       assigned_to_type = NULL,
       assignment_date = NULL
   WHERE rfid_tag = ? AND role = 'Member'`,
  [oldRfid]
);

    // Move WHO to new card — customer_number stays untouched (set at order time)
    await conn.query(
      `UPDATE RegisteredRfid
       SET assigned_to_id = ?,
           assigned_to_name = ?,
           assigned_to_type = 'Member',
           status = 'in_use',
           assignment_date = NOW()
       WHERE rfid_tag = ? AND role = 'Member'`,
      [member.id, member.full_name, new_rfid_tag]
    );

    await conn.query(`
      INSERT INTO AdminTransactions
      (admin_id, member_id, member_name, rfid_tag, amount, payment_method, reference, staff_name, transaction_type, plan_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'rfid_replacement', 'RFID Replacement')
    `, [
      admin_id, member.id, member.full_name, new_rfid_tag, replacement_fee || 0,
      formatPaymentMethod(payment_method || "Cash"),
      formatPaymentMethod(payment_method || "Cash") !== "Cash" ? reference : null,
      staff_name,
    ]);

    await conn.query(`
      INSERT INTO AdminMembersTransactions
      (member_id, admin_id, rfid_tag, full_name, transaction_type, amount, balance_added, new_balance,
       payment_method, reference, tax, processed_by, subscription_type)
      VALUES (?, ?, ?, ?, 'rfid_replacement', ?, 0.00, 0.00, ?, ?, 1.00, ?, ?)
    `, [
      member.id, admin_id, new_rfid_tag, member.full_name, replacement_fee || 0,
      formatPaymentMethod(payment_method || "Cash"),
      formatPaymentMethod(payment_method || "Cash") !== "Cash" ? reference : null,
      staff_name, member.subscription_type || null,
    ]);


    await logAudit({
      req,
      action: 'RFID_REPLACEMENT',
      module: 'RFID',
      target: member.full_name,
      target_id: member.id,
      description: `Replaced RFID of ${member.full_name}`,
      payload: req.body,
    });

    await conn.commit();

    res.status(200).json({
      message: "RFID replaced successfully.",
      old_rfid: oldRfid,
      new_rfid: new_rfid_tag,
      member_name: member.full_name,
      processed_by: staff_name,
    });
  } catch (err) {
    await conn.rollback();
    console.error("Error replacing RFID:", err);
    res.status(500).json({
      message: "Server error while replacing RFID.",
      error: err.message
    });
  } finally {
    conn.release();
  }
});

module.exports = router;