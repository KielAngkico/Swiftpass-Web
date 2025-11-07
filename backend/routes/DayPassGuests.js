const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/session-fee", async (req, res) => {
  const { admin_id } = req.query;

  try {
    const [adminRows] = await db.promise().query(
      "SELECT session_fee FROM AdminAccounts WHERE id = ?",
      [admin_id]
    );

    if (!adminRows.length) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const [keyFobRows] = await db.promise().query(
      "SELECT amount_to_pay FROM AdminPricingOptions WHERE admin_id = ? AND plan_name = 'Key Fob' LIMIT 1",
      [admin_id]
    );

    const keyFobFee = keyFobRows.length > 0 ? keyFobRows[0].amount_to_pay : 0;

    res.json({ 
      session_fee: adminRows[0].session_fee,
      key_fob_fee: keyFobFee
    });
  } catch (err) {
    console.error("Error fetching fees:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/register-session", async (req, res) => {
  const conn = await db.promise().getConnection();
  
  try {
    await conn.beginTransaction();

    const {
      guest_name,
      gender,
      rfid_tag,
      system_type,
      staff_name,
      admin_id,
      mobile_number,
      email,
      expires_at,
      payment_method,
      cashless_reference,
      rfid_keyfob_fee,
    } = req.body;

    const [adminRows] = await conn.query(
      "SELECT session_fee FROM AdminAccounts WHERE id = ?",
      [admin_id]
    );

    if (adminRows.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: "Admin not found" });
    }
    
    const sessionFee = adminRows[0].session_fee;
    const totalAmount = parseFloat(sessionFee) + parseFloat(rfid_keyfob_fee || 0);

    const [guestRows] = await conn.query(
      "SELECT * FROM DayPassGuests WHERE rfid_tag = ? AND status = 'active'",
      [rfid_tag]
    );

    let guestId;

    if (guestRows.length === 0) {
      // ✅ Insert new guest
      const [insertResult] = await conn.query(
        `INSERT INTO DayPassGuests
        (guest_name, gender, rfid_tag, system_type, staff_name, admin_id, paid_amount, expires_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          guest_name,
          gender,
          rfid_tag,
          system_type,
          staff_name,
          admin_id,
          totalAmount,
          expires_at,
        ]
      );
      guestId = insertResult.insertId;
    } else {
      // ✅ Update existing guest
      guestId = guestRows[0].id;
      await conn.query(
        "UPDATE DayPassGuests SET expires_at = ?, admin_id = ? WHERE rfid_tag = ? AND status = 'active'",
        [expires_at, admin_id, rfid_tag]
      );
    }

    // ✅ UPDATE RegisteredRfid table
    await conn.query(
      `UPDATE RegisteredRfid 
       SET assigned_to_id = ?,
           assigned_to_name = ?,
           status = 'in_use',
           assignment_date = NOW()
       WHERE rfid_tag = ? AND role = 'DayPass'`,
      [guestId, guest_name, rfid_tag]
    );

    // Insert transaction
    await conn.query(
      `INSERT INTO AdminTransactions
      (admin_id, member_name, rfid_tag, amount, payment_method, staff_name, transaction_type, transaction_date, cashless_reference)
      VALUES (?, ?, ?, ?, ?, ?, 'day_pass_session', NOW(), ?)`,
      [admin_id, guest_name, rfid_tag, totalAmount, payment_method, staff_name, cashless_reference || null]
    );

    await conn.commit();

    return res.status(201).json({
      message: "Day pass session registered successfully",
      session_fee: sessionFee,
      key_fob_fee: rfid_keyfob_fee,
      total_amount: totalAmount,
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error registering day pass session:", error);
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

module.exports = router;