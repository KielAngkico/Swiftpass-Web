const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const dbSuperAdmin = require("../db");
const upload = require("../middleware/upload");

// Add Prepaid Member
router.post("/add-member", upload.single("member_image"), async (req, res) => {
  console.log("Received req.body:", req.body);
  console.log("Received req.file:", req.file);

  const {
    full_name,
    gender,
    age,
    rfid_tag,
    phone_number,
    address,
    email,
    password,
    payment,
    plan_name,
    staff_name,
    payment_method,
    reference,
    admin_id,
    initial_balance,
  } = req.body;

  const profileImage = req.file ? `uploads/members/${req.file.filename}` : null;

  // Basic validation
  if (!full_name || !gender || !age || !rfid_tag || !phone_number || !address || !email ||
      !password || !payment || !staff_name || !payment_method || !admin_id) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const ageNumber = parseInt(age, 10);
  const paymentNumber = parseFloat(payment);
  const initialBalance = parseFloat(initial_balance) || 0;

  if (isNaN(ageNumber) || isNaN(paymentNumber)) {
    return res.status(400).json({ message: "Age and payment must be valid numbers." });
  }

  if (!email.endsWith("@gmail.com")) {
    return res.status(400).json({ message: "Email must be a Gmail address." });
  }

  if (payment_method.toLowerCase() === "gcash" && !reference) {
    return res.status(400).json({ message: "Reference is required for GCash payments." });
  }

  if (initialBalance < 0) {
    return res.status(400).json({ message: "Payment exceeds the initial balance limit." });
  }

  try {
    // Check for duplicate RFID
    const [existing] = await dbSuperAdmin.promise().query(
      "SELECT 1 FROM MembersAccounts WHERE rfid_tag = ? LIMIT 1", 
      [rfid_tag]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "RFID tag already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert member
    const insertMemberSql = `
      INSERT INTO MembersAccounts 
      (rfid_tag, full_name, gender, age, phone_number, address, email, password, profile_image_url, admin_id, staff_name, initial_balance, current_balance, subscription_type, payment, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `;
    const [insertResult] = await dbSuperAdmin.promise().query(insertMemberSql, [
      rfid_tag, full_name, gender, ageNumber, phone_number, address, email, hashedPassword,
      profileImage, admin_id, staff_name, initialBalance, initialBalance, plan_name, paymentNumber
    ]);
    const memberId = insertResult.insertId;

    // Insert transaction
    const insertTransactionSql = `
      INSERT INTO AdminTransactions 
      (admin_id, member_id, member_name, rfid_tag, amount, payment_method, reference, staff_name, transaction_type, plan_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new_membership', ?)
    `;
    await dbSuperAdmin.promise().query(insertTransactionSql, [
      admin_id, memberId, full_name, rfid_tag, paymentNumber,
      payment_method.charAt(0).toUpperCase() + payment_method.slice(1).toLowerCase(),
      reference || null, staff_name, plan_name || null
    ]);

    // Insert member transaction
    const insertMemberTxnSql = `
      INSERT INTO AdminMembersTransactions 
      (admin_id, rfid_tag, full_name, transaction_type, amount, balance_added, new_balance, payment_method, reference, tax, processed_by, subscription_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await dbSuperAdmin.promise().query(insertMemberTxnSql, [
      admin_id, rfid_tag, full_name, "new_member", paymentNumber, initialBalance, initialBalance,
      payment_method.charAt(0).toUpperCase() + payment_method.slice(1).toLowerCase(),
      reference || null, 1.0, staff_name, plan_name || null
    ]);

    return res.status(200).json({
      message: "✅ Member and transaction added successfully!",
      rfid_tag, full_name, age: ageNumber, phone_number, address, email, staff_name,
      profile_image_url: profileImage, initial_balance: initialBalance, balance_after: initialBalance, payment: paymentNumber
    });
  } catch (err) {
    console.error("❌ Error adding member:", err);
    return res.status(500).json({ message: "Server error while adding member." });
  }
});

// Add Subscription Member
router.post("/add-subscription-member", upload.single("member_image"), async (req, res) => {
  console.log("Received req.body:", req.body);
  console.log("Received req.file:", req.file);

  const {
    full_name, gender, age, rfid_tag, phone_number, address, email, password,
    payment, staff_name, payment_method, reference, admin_id,
    subscription_type, subscription_start, subscription_expiry, plan_name
  } = req.body;

  const profileImage = req.file ? `uploads/members/${req.file.filename}` : null;

  // Validation
  if (!full_name || !gender || !age || !rfid_tag || !phone_number || !address || !email ||
      !password || !payment || !staff_name || !payment_method || !admin_id ||
      !subscription_type || !subscription_start || !subscription_expiry) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (!email.endsWith("@gmail.com")) {
    return res.status(400).json({ message: "Email must be a Gmail address." });
  }

  if (payment_method.toLowerCase() === "gcash" && !reference) {
    return res.status(400).json({ message: "Reference is required for GCash payments." });
  }

  const ageNumber = parseInt(age, 10);
  const paymentNumber = parseFloat(payment);
  if (isNaN(ageNumber) || isNaN(paymentNumber)) {
    return res.status(400).json({ message: "Invalid numeric input." });
  }

  try {
    const [existing] = await dbSuperAdmin.promise().query(
      "SELECT 1 FROM MembersAccounts WHERE rfid_tag = ? LIMIT 1", [rfid_tag]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "RFID tag already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert subscription member
    const insertSql = `
      INSERT INTO MembersAccounts 
      (rfid_tag, full_name, gender, age, phone_number, address, email, password, profile_image_url,
       admin_id, staff_name, payment, status,
       subscription_type, subscription_fee, subscription_start, subscription_expiry, system_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 'subscription')
    `;
    const [memberInsertResult] = await dbSuperAdmin.promise().query(insertSql, [
      rfid_tag, full_name, gender, ageNumber, phone_number, address, email, hashedPassword,
      profileImage, admin_id, staff_name, paymentNumber, subscription_type, paymentNumber,
      subscription_start, subscription_expiry
    ]);
    const memberId = memberInsertResult.insertId;

    // Insert transaction
    const insertTxnSql = `
      INSERT INTO AdminTransactions 
      (admin_id, member_id, member_name, rfid_tag, amount, payment_method, reference, staff_name,
       transaction_type, plan_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new_membership', ?)
    `;
    await dbSuperAdmin.promise().query(insertTxnSql, [
      admin_id, memberId, full_name, rfid_tag, paymentNumber,
      payment_method.charAt(0).toUpperCase() + payment_method.slice(1).toLowerCase(),
      reference || null, staff_name, plan_name || null
    ]);

    // Insert member transaction
    const insertMemberTxnSql = `
      INSERT INTO AdminMembersTransactions 
      (admin_id, rfid_tag, full_name, transaction_type, amount, balance_added, new_balance, 
       payment_method, reference, tax, processed_by, subscription_type, subscription_start, subscription_expiry)
      VALUES (?, ?, ?, ?, ?, 0.00, 0.00, ?, ?, 1.00, ?, ?, ?, ?)
    `;
    await dbSuperAdmin.promise().query(insertMemberTxnSql, [
      admin_id, rfid_tag, full_name, "new_subscription", paymentNumber,
      payment_method.charAt(0).toUpperCase() + payment_method.slice(1).toLowerCase(),
      reference || null, staff_name, plan_name || subscription_type || null,
      subscription_start, subscription_expiry
    ]);

    return res.status(200).json({
      message: "✅ Subscription member added successfully!",
      rfid_tag, full_name, subscription_type, subscription_start, subscription_expiry, payment: paymentNumber
    });
  } catch (err) {
    console.error("❌ Subscription add error:", err);
    return res.status(500).json({ message: "Server error while adding subscription member." });
  }
});

module.exports = router;
