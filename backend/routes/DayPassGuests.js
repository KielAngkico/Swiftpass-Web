const express = require("express");
const router = express.Router();
const db = require("../db");
const daypassUpload = require("../middleware/daypassUploads");

router.get("/session-fee", async (req, res) => {
  const { admin_id } = req.query;

  try {
    // Verify admin exists
    const [adminRows] = await db.promise().query(
      "SELECT id FROM AdminAccounts WHERE id = ?",
      [admin_id]
    );

    if (!adminRows.length) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Get Daily Session fee from AdminPricingOptions
    const [sessionRows] = await db.promise().query(
      "SELECT amount_to_pay FROM AdminPricingOptions WHERE admin_id = ? AND plan_name = 'Daily Session' AND is_active = 1 LIMIT 1",
      [admin_id]
    );

    const sessionFee = sessionRows.length > 0 ? sessionRows[0].amount_to_pay : 0;

    // Get Key Fob fee from AdminPricingOptions
    const [keyFobRows] = await db.promise().query(
      "SELECT amount_to_pay FROM AdminPricingOptions WHERE admin_id = ? AND plan_name = 'Key Fob' AND is_active = 1 LIMIT 1",
      [admin_id]
    );

    const keyFobFee = keyFobRows.length > 0 ? keyFobRows[0].amount_to_pay : 0;

    res.json({ 
      session_fee: sessionFee,
      key_fob_fee: keyFobFee
    });
  } catch (err) {
    console.error("Error fetching fees:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/register-session", daypassUpload.single("guest_image"), async (req, res) => {
  console.log("Received req.body:", req.body);
  console.log("Received req.file:", req.file);

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

    const profileImage = req.file ? `uploads/daypass/${req.file.filename}` : null;

    // ✅ FIXED: Get Daily Session fee from AdminPricingOptions instead of AdminAccounts
    const [sessionRows] = await conn.query(
      "SELECT amount_to_pay FROM AdminPricingOptions WHERE admin_id = ? AND plan_name = 'Daily Session' AND is_active = 1 LIMIT 1",
      [admin_id]
    );

    if (sessionRows.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: "Daily Session pricing not found for this admin" });
    }
    
    const sessionFee = parseFloat(sessionRows[0].amount_to_pay);
    const keyFobFee = parseFloat(rfid_keyfob_fee || 0);
    const totalAmount = sessionFee + keyFobFee;

    console.log(`💰 Pricing: Session Fee = ${sessionFee}, Key Fob = ${keyFobFee}, Total = ${totalAmount}`);

    const [guestRows] = await conn.query(
      "SELECT * FROM DayPassGuests WHERE rfid_tag = ? AND status = 'active'",
      [rfid_tag]
    );

    let guestId;

    if (guestRows.length === 0) {
      // ✅ Insert new guest with profile image
const [insertResult] = await conn.query(
  `INSERT INTO DayPassGuests
  (guest_name, gender, mobile_number, email, profile_image_url, rfid_tag, system_type, staff_name, admin_id, paid_amount, expires_at, renewed_at, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
  [
    guest_name,
    gender,
    mobile_number,
    email,
    profileImage,
    rfid_tag,
    system_type,
    staff_name,
    admin_id,
    totalAmount,
    expires_at,
    formattedNow
  ]
);
      guestId = insertResult.insertId;
    } else {
      // ✅ Update existing guest with profile image
      guestId = guestRows[0].id;
      await conn.query(
        "UPDATE DayPassGuests SET expires_at = ?, admin_id = ?, profile_image_url = ? WHERE rfid_tag = ? AND status = 'active'",
        [expires_at, admin_id, profileImage, rfid_tag]
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
      key_fob_fee: keyFobFee,
      total_amount: totalAmount,
      profile_image_url: profileImage,
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error registering day pass session:", error);
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

// Add this new endpoint after the existing /register-session route

router.post("/renew-daypass", async (req, res) => {
  console.log("🔥🔥🔥 RENEW-DAYPASS ENDPOINT HIT!");
  console.log("Received renewal req.body:", req.body);

  const conn = await db.promise().getConnection();
  
  try {
    await conn.beginTransaction();

    const {
      rfid_tag,
      full_name,
      admin_id,
      staff_name,
      system_type,
      expires_at,
      payment_method,
      cashless_reference,
      session_fee,
    } = req.body;

    console.log("📋 Parsed data:", {
      rfid_tag,
      full_name,
      admin_id,
      staff_name,
      payment_method,
      expires_at
    });

    // ✅ Verify the guest exists - accept both subscription and prepaid_entry types, and both active and expired statuses
    const [guestRows] = await conn.query(
      "SELECT * FROM DayPassGuests WHERE rfid_tag = ? AND system_type IN ('prepaid_entry', 'subscription') AND status IN ('active', 'expired')",
      [rfid_tag]
    );

    if (guestRows.length === 0) {
      console.log("❌ Guest not found with RFID:", rfid_tag);
      await conn.rollback();
      return res.status(404).json({ error: "Day pass guest not found. Guest must have a subscription or prepaid entry system type." });
    }

    const guestId = guestRows[0].id;
    const guestName = guestRows[0].guest_name;

    console.log("✅ Guest found:", { guestId, guestName });

    // ✅ Get Daily Session fee from AdminPricingOptions
    const [sessionRows] = await conn.query(
      "SELECT amount_to_pay FROM AdminPricingOptions WHERE admin_id = ? AND plan_name = 'Daily Session' AND is_active = 1 LIMIT 1",
      [admin_id]
    );

    if (sessionRows.length === 0) {
      console.log("❌ No Daily Session pricing found for admin_id:", admin_id);
      await conn.rollback();
      return res.status(400).json({ error: "Daily Session pricing not found for this admin" });
    }
    
    const sessionFeeAmount = parseFloat(sessionRows[0].amount_to_pay);

    console.log(`💰 Renewal Pricing: Session Fee = ${sessionFeeAmount}, No Key Fob Fee`);

    // ✅ Update guest's expiry date, status, AND renewed_at
    const now = new Date();
    await conn.query(
      "UPDATE DayPassGuests SET expires_at = ?, admin_id = ?, status = 'active', renewed_at = ? WHERE id = ?",
      [expires_at, admin_id, now, guestId]
    );

    console.log("✅ Guest expiry and renewed_at updated");

    // ✅ Insert transaction record for the renewal
    await conn.query(
      `INSERT INTO AdminTransactions
      (admin_id, member_name, rfid_tag, amount, payment_method, staff_name, transaction_type, transaction_date, cashless_reference)
      VALUES (?, ?, ?, ?, ?, ?, 'day_pass_renewal', NOW(), ?)`,
      [admin_id, guestName, rfid_tag, sessionFeeAmount, payment_method, staff_name, cashless_reference || null]
    );

    console.log("✅ Transaction recorded");

    await conn.commit();

    console.log("✅ Day pass renewal completed successfully");

    return res.status(200).json({
      message: "Day pass renewed successfully",
      session_fee: sessionFeeAmount,
      expires_at: expires_at,
      renewed_at: now,
    });
  } catch (error) {
    await conn.rollback();
    console.error("❌ Error renewing day pass:", error);
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

router.get("/daypass-guest/:rfid", async (req, res) => {

  const { rfid } = req.params;
  const { admin_id } = req.query;

  try {
    const [rows] = await db.promise().query(
      `SELECT id, guest_name, gender, profile_image_url, rfid_tag, system_type, 
              paid_amount, expires_at, status, staff_name, admin_id
       FROM DayPassGuests 
       WHERE rfid_tag = ? AND admin_id = ? AND status IN ('active', 'expired')
       LIMIT 1`,
      [rfid, admin_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Guest not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching day pass guest:", err);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;