const express = require("express");
const router = express.Router();
const db = require("../db");
const logAudit = require("../middleware/auditLogger");

// POST /api/refunds/request — member submits refund request
router.post("/refunds/request", async (req, res) => {
  const { member_id, admin_id, member_transaction_id, amount, reason } = req.body;

  if (!member_id || !admin_id || !member_transaction_id || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Validate transaction exists and belongs to this member
    const [txnRows] = await db.promise().query(
      `SELECT id, transaction_type, amount 
       FROM AdminMembersTransactions 
       WHERE id = ? AND member_id = ?
       LIMIT 1`,
      [member_transaction_id, member_id]
    );

    if (txnRows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (txnRows[0].transaction_type !== "session_deduction") {
      return res.status(400).json({ error: "Only session deductions can be refunded" });
    }

    // Check no existing refund request for this transaction
    const [existingRows] = await db.promise().query(
      `SELECT id FROM RefundRequests 
       WHERE member_transaction_id = ?
       LIMIT 1`,
      [member_transaction_id]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({ error: "A refund request already exists for this transaction" });
    }

    // Insert refund request
    const [result] = await db.promise().query(
      `INSERT INTO RefundRequests 
       (member_id, admin_id, member_transaction_id, amount, reason, status, requested_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
      [member_id, admin_id, member_transaction_id, amount, reason || null]
    );

    return res.status(201).json({
      message: "Refund request submitted successfully",
      refund_id: result.insertId
    });

  } catch (err) {
    console.error("Refund request error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/refunds/admin/:admin_id — admin and staff fetch refund list
router.get("/refunds/admin/:admin_id", async (req, res) => {
  const { admin_id } = req.params;

  try {
    const [rows] = await db.promise().query(
      `SELECT 
        r.id,
        r.member_id,
        r.member_transaction_id,
        r.amount,
        r.reason,
        r.status,
        r.requested_at,
        r.resolved_at,
        r.resolved_by,
        ma.full_name AS member_name,
        ma.rfid_tag,
        t.timestamp AS transaction_date,
        t.amount AS original_amount
       FROM RefundRequests r
       JOIN MembersAccounts ma ON ma.id = r.member_id
       JOIN AdminMembersTransactions t ON t.id = r.member_transaction_id
       WHERE r.admin_id = ?
       ORDER BY r.requested_at DESC`,
      [admin_id]
    );

    return res.json({ refunds: rows });

  } catch (err) {
    console.error("Fetch refunds error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/refunds/:id/resolve — admin approves or denies
router.patch("/refunds/:id/resolve", async (req, res) => {
  const { id } = req.params;
  const { status, resolved_by } = req.body;

  if (!["approved", "denied"].includes(status)) {
    return res.status(400).json({ error: "Status must be approved or denied" });
  }

  if (!resolved_by) {
    return res.status(400).json({ error: "resolved_by is required" });
  }

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    // Get refund request
    const [[refund]] = await conn.query(
      `SELECT * FROM RefundRequests WHERE id = ? AND status = 'pending' LIMIT 1`,
      [id]
    );

    if (!refund) {
      await conn.rollback();
      return res.status(404).json({ error: "Refund request not found or already resolved" });
    }

    if (status === "approved") {
      // 1. Credit balance back to member
      await conn.query(
        `UPDATE MembersAccounts 
         SET current_balance = current_balance + ?
         WHERE id = ?`,
        [refund.amount, refund.member_id]
      );

      // 2. Get new balance for logging
      const [[memberRow]] = await conn.query(
        `SELECT current_balance FROM MembersAccounts WHERE id = ?`,
        [refund.member_id]
      );

      // 3. Get member details for transaction log
      const [[memberDetails]] = await conn.query(
        `SELECT full_name, rfid_tag FROM MembersAccounts WHERE id = ?`,
        [refund.member_id]
      );

      // 4. Log refund in AdminMembersTransactions (positive amount)
      await conn.query(
        `INSERT INTO AdminMembersTransactions
         (member_id, rfid_tag, full_name, admin_id, transaction_type,
          amount, new_balance, payment_method, processed_by, timestamp)
         VALUES (?, ?, ?, ?, 'refund', ?, ?, 'system', ?, NOW())`,
        [
          refund.member_id,
          memberDetails.rfid_tag,
          memberDetails.full_name,
          refund.admin_id,
          refund.amount,
          memberRow.current_balance,
          resolved_by
        ]
      );
    }

    // 5. Update refund request status
    await conn.query(
      `UPDATE RefundRequests
       SET status = ?, resolved_at = NOW(), resolved_by = ?
       WHERE id = ?`,
      [status, resolved_by, id]
    );

await conn.commit();

    await logAudit({
      req,
      action: status === "approved" ? "APPROVE" : "DENY",
      module: "Reimbursements",
      target: refund.member_id,
      target_id: refund.id,
      description: `Refund request ${status} by ${resolved_by} — amount ₱${refund.amount}`,
      payload: { status, resolved_by, refund_id: id },
    });

    return res.json({
      message: `Refund ${status} successfully`,
      status
    });

  } catch (err) {
    await conn.rollback();
    console.error("Resolve refund error:", err);
    return res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

module.exports = router;