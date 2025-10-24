const express = require("express");
const router = express.Router();
const db = require("../db");

// Fetch session fee and key fob fee
router.get("/session-fee", async (req, res) => {
  const { admin_id } = req.query;

  try {
    // Get session fee from AdminAccounts
    const [adminRows] = await db.promise().query(
      "SELECT session_fee FROM AdminAccounts WHERE id = ?",
      [admin_id]
    );

    if (!adminRows.length) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Get key fob fee from AdminPricingOptions
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

  try {
    const [adminRows] = await db.promise().query(
      "SELECT session_fee FROM AdminAccounts WHERE id = ?",
      [admin_id]
    );

    if (adminRows.length === 0) {
      return res.status(400).json({ error: "Admin not found" });
    }
    const sessionFee = adminRows[0].session_fee;
    const totalAmount = parseFloat(sessionFee) + parseFloat(rfid_keyfob_fee || 0);

    const [guestRows] = await db.promise().query(
      "SELECT * FROM DayPassGuests WHERE rfid_tag = ? AND status = 'active'",
      [rfid_tag]
    );

    if (guestRows.length === 0) {
      await db.promise().query(
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
    } else {
      await db.promise().query(
        "UPDATE DayPassGuests SET expires_at = ?, admin_id = ? WHERE rfid_tag = ? AND status = 'active'",
        [expires_at, admin_id, rfid_tag]
      );
    }

    // Insert transaction with reference if cashless
    await db.promise().query(
      `INSERT INTO AdminTransactions
      (admin_id, member_name, rfid_tag, amount, payment_method, staff_name, transaction_type, transaction_date, cashless_reference)
      VALUES (?, ?, ?, ?, ?, ?, 'day_pass_session', NOW(), ?)`,
      [admin_id, guest_name, rfid_tag, totalAmount, payment_method, staff_name, cashless_reference || null]
    );

    return res.status(201).json({
      message: "Day pass session registered successfully",
      session_fee: sessionFee,
      key_fob_fee: rfid_keyfob_fee,
      total_amount: totalAmount,
    });
  } catch (error) {
    console.error("Error registering day pass session:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
