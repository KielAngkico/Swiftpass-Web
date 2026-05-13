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

  try {
    const [memberRows] = await dbSuperAdmin.promise().query(
      "SELECT * FROM MembersAccounts WHERE id = ? LIMIT 1",
      [memberId]
    );

    if (memberRows.length === 0) {
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
      return res.status(400).json({
        message: "New RFID must be different from current RFID"
      });
    }

    const [existingRfid] = await dbSuperAdmin.promise().query(
      "SELECT id, full_name FROM MembersAccounts WHERE rfid_tag = ? AND id != ?",
      [new_rfid_tag, memberId]
    );

    if (existingRfid.length > 0) {
      return res.status(400).json({
        message: `RFID tag "${new_rfid_tag}" is already assigned to ${existingRfid[0].full_name}`,
      });
    }

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
      oldRfid,
      new_rfid_tag,
      staff_name,
      memberId,
    ]);

    // Mark old RFID as replaced
    await dbSuperAdmin.promise().query(
      `UPDATE RegisteredRfid
       SET status = 'replaced',
           assignment_date = NOW()
       WHERE rfid_tag = ? AND role = 'Member'`,
      [oldRfid]
    );

    // Mark new RFID as in_use
    await dbSuperAdmin.promise().query(
      `UPDATE RegisteredRfid
       SET assigned_to_id = ?,
           assigned_to_name = ?,
           assigned_to_type = 'Member',
           status = 'in_use',
           assignment_date = NOW()
       WHERE rfid_tag = ? AND role = 'Member'`,
      [member.id, member.full_name, new_rfid_tag]
    );
    // Inherit customer number from old RFID to new RFID
    const [oldRfidRow] = await dbSuperAdmin.promise().query(
      `SELECT customer_number, customer_number_display FROM RegisteredRfid WHERE rfid_tag = ? AND role = 'Member' LIMIT 1`,
      [oldRfid]
    );
    if (oldRfidRow.length > 0 && oldRfidRow[0].customer_number != null) {
      await dbSuperAdmin.promise().query(
        `UPDATE RegisteredRfid
         SET customer_number = ?, customer_number_display = ?
         WHERE rfid_tag = ? AND role = 'Member'`,
        [oldRfidRow[0].customer_number, oldRfidRow[0].customer_number_display, new_rfid_tag]
      );
    }

    const txnSql = `
      INSERT INTO AdminTransactions
      (admin_id, member_id, member_name, rfid_tag, amount, payment_method, reference, staff_name, transaction_type, plan_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'rfid_replacement', 'RFID Replacement')
    `;
    await dbSuperAdmin.promise().query(txnSql, [
      admin_id,
      member.id,
      member.full_name,
      new_rfid_tag,
      replacement_fee || 0,
formatPaymentMethod(payment_method || "Cash"),
formatPaymentMethod(payment_method || "Cash") !== "Cash" ? reference : null,
      staff_name,
    ]);

const memberTxnSql = `
      INSERT INTO AdminMembersTransactions
      (member_id, admin_id, rfid_tag, full_name, transaction_type, amount, balance_added, new_balance,
       payment_method, reference, tax, processed_by, subscription_type)
      VALUES (?, ?, ?, ?, 'rfid_replacement', ?, 0.00, 0.00, ?, ?, 1.00, ?, ?)
    `;
    await dbSuperAdmin.promise().query(memberTxnSql, [
      member.id,
      admin_id,
      new_rfid_tag,
      member.full_name,
      replacement_fee || 0,
formatPaymentMethod(payment_method || "Cash"),
formatPaymentMethod(payment_method || "Cash") !== "Cash" ? reference : null,
      staff_name,
      member.subscription_type || null,
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

    res.status(200).json({
      message: " RFID replaced successfully.",
      old_rfid: oldRfid,
      new_rfid: new_rfid_tag,
      member_name: member.full_name,
      processed_by: staff_name,
    });
  } catch (err) {
    console.error("Error replacing RFID:", err);
    res.status(500).json({
      message: "Server error while replacing RFID.",
      error: err.message
    });
  }
});

module.exports = router;