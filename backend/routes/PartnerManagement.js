const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");
const bcrypt = require("bcrypt");
const partnerUpload = require("../middleware/partnersUpload");

// ➕ Add client / partner
router.post("/add-client", partnerUpload.single("profile_image_url"), async (req, res) => {
  console.log("BODY:", req.body);
  console.log("FILE:", req.file);

  try {
    const {
      admin_name,
      age,
      email,
      password,
      address,
      gym_name,
      system_type,
      session_fee,
      package_id,
      rfid_tag, // ✅ Added RFID tag field
    } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const imagePath = req.file ? `/uploads/partners/${req.file.filename}` : null;

    let endDate = null;
    let pkgId = null;
    let pkgPrice = 0;

    // Only fetch package if system_type is subscription and package_id exists
    if (system_type === "subscription" && package_id) {
      const packageSql = `SELECT * FROM SubscriptionPackages WHERE id = ?`;
      const [pkgRows] = await dbSuperAdmin.promise().query(packageSql, [package_id]);

      if (pkgRows.length > 0) {
        const pkg = pkgRows[0];
        pkgId = pkg.id;
        pkgPrice = pkg.price;
        endDate = new Date();
        endDate.setDate(endDate.getDate() + pkg.duration_days);
      }
    }

    // ✅ Insert admin with RFID tag
    const insertAdminSql = `
      INSERT INTO AdminAccounts
      (admin_name, age, email, password, address, gym_name, system_type, session_fee, profile_image_url, rfid_tag, package_id, subscription_start_date, subscription_end_date, is_archived)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `;

    const [result] = await dbSuperAdmin.promise().query(insertAdminSql, [
      admin_name,
      age,
      email,
      hashedPassword,
      address,
      gym_name,
      system_type,
      session_fee,
      imagePath,
      rfid_tag || null, // ✅ store RFID here
      pkgId,
      endDate,
      endDate,
    ]);

    const admin_id = result.insertId;

    // Add default Cash payment method
    const cashMethodSql = `
      INSERT INTO AdminPaymentMethods (admin_id, name, is_default, is_enabled)
      VALUES (?, 'Cash', 1, 1)
    `;
    await dbSuperAdmin.promise().query(cashMethodSql, [admin_id]);

    // Add session fee option
    const pricingSql = `
      INSERT INTO AdminPricingOptions
      (admin_id, system_type, plan_name, amount_to_pay, amount_to_credit, duration_in_days, is_deletable)
      VALUES (?, ?, 'Daily Session', ?, NULL, NULL, FALSE)
    `;
    await dbSuperAdmin.promise().query(pricingSql, [admin_id, system_type, session_fee]);

    // Log subscription transaction if package exists
    if (pkgId) {
      const txnSql = `
        INSERT INTO SuperAdminTransactions (admin_id, transaction_type, total_amount)
        VALUES (?, 'Subscription Purchase', ?)
      `;
      const [txnResult] = await dbSuperAdmin.promise().query(txnSql, [admin_id, pkgPrice]);
      const txnId = txnResult.insertId;

      const txnItemSql = `
        INSERT INTO SuperAdminTransactionItems (transaction_id, item_name, quantity, price)
        VALUES (?, ?, 1, ?)
      `;
      await dbSuperAdmin.promise().query(txnItemSql, [txnId, pkgRows[0].name, pkgPrice]);
    }

    res.status(201).json({
      message: "Client added successfully",
      id: admin_id,
    });

  } catch (error) {
    console.error("Add partner error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ➕ Get all admins
router.get("/admins", (req, res) => {
  const sql = `
    SELECT id, admin_name, age, email, address, gym_name, system_type, session_fee, profile_image_url, rfid_tag, is_archived 
    FROM AdminAccounts 
    ORDER BY is_archived ASC, admin_name ASC
  `;
  dbSuperAdmin.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// ➕ Archive / Restore / Delete routes
router.put("/archive-admin/:id", (req, res) => {
  const adminId = req.params.id;
  const sql = `UPDATE AdminAccounts SET is_archived = 1 WHERE id = ? AND is_archived = 0`;
  dbSuperAdmin.query(sql, [adminId], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Admin not found or already archived" });
    res.json({ message: "Admin archived successfully" });
  });
});

router.put("/restore-admin/:id", (req, res) => {
  const adminId = req.params.id;
  const sql = `UPDATE AdminAccounts SET is_archived = 0 WHERE id = ? AND is_archived = 1`;
  dbSuperAdmin.query(sql, [adminId], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Admin not found or not archived" });
    res.json({ message: "Admin restored successfully" });
  });
});

// ➕ Get active admins
router.get("/admins/active", (req, res) => {
  const sql = "SELECT * FROM AdminAccounts WHERE is_archived = 0 ORDER BY admin_name ASC";
  dbSuperAdmin.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// ➕ Get archived admins
router.get("/admins/archived", (req, res) => {
  const sql = "SELECT * FROM AdminAccounts WHERE is_archived = 1 ORDER BY admin_name ASC";
  dbSuperAdmin.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

router.delete("/delete-admin/:id", async (req, res) => {
  const adminId = req.params.id;

  try {
    const [checkRows] = await dbSuperAdmin.promise().query(
      `SELECT id, is_archived FROM AdminAccounts WHERE id = ?`,
      [adminId]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    if (checkRows[0].is_archived === 0) {
      return res.status(400).json({ error: "Can only delete archived admins" });
    }

    // Delete related data
    await dbSuperAdmin.promise().query(`DELETE FROM SuperAdminTransactionItems WHERE transaction_id IN (SELECT id FROM SuperAdminTransactions WHERE admin_id = ?)`, [adminId]);
    await dbSuperAdmin.promise().query(`DELETE FROM SuperAdminTransactions WHERE admin_id = ?`, [adminId]);
    await dbSuperAdmin.promise().query(`DELETE FROM AdminPaymentMethods WHERE admin_id = ?`, [adminId]);
    await dbSuperAdmin.promise().query(`DELETE FROM AdminPricingOptions WHERE admin_id = ?`, [adminId]);
    await dbSuperAdmin.promise().query(`DELETE FROM StaffSessionLogs WHERE admin_id = ?`, [adminId]);
    await dbSuperAdmin.promise().query(`DELETE FROM AdminEntryLogs WHERE admin_id = ?`, [adminId]);
    await dbSuperAdmin.promise().query(`DELETE FROM MembersAccounts WHERE admin_id = ?`, [adminId]);
    await dbSuperAdmin.promise().query(`DELETE FROM DayPassGuests WHERE admin_id = ?`, [adminId]);
    await dbSuperAdmin.promise().query(`DELETE FROM AdminAccounts WHERE id = ?`, [adminId]);

    res.json({ message: "Admin and all related data deleted successfully" });
  } catch (error) {
    console.error("Delete admin error:", error);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
