const express = require("express");
const router = express.Router();
const db = require("../db");


router.get("/session-fee", async (req, res) => {
  const { admin_id } = req.query;

  try {
    const [rows] = await db.promise().query(
      "SELECT session_fee FROM AdminAccounts WHERE id = ?",
      [admin_id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({ session_fee: rows[0].session_fee });
  } catch (err) {
    console.error("Error fetching session fee:", err);
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
          sessionFee,
          expires_at,
        ]
      );
    } else {
      await db.promise().query(
        "UPDATE DayPassGuests SET expires_at = ?, admin_id = ? WHERE rfid_tag = ? AND status = 'active'",
        [expires_at, admin_id, rfid_tag]
      );
    }
    await db.promise().query(
      `INSERT INTO AdminTransactions 
      (admin_id, member_name, rfid_tag, amount, payment_method, staff_name, transaction_type, transaction_date)
      VALUES (?, ?, ?, ?, ?, ?, 'day_pass_session', NOW())`,
      [admin_id, guest_name, rfid_tag, sessionFee, payment_method, staff_name]
    );

    return res.status(201).json({
      message: "Day pass session registered successfully",
      session_fee: sessionFee,
    });
  } catch (error) {
    console.error("Error registering day pass session:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
