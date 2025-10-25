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
      rfid_tag,
      rfid_tag_2,
    } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const imagePath = req.file ? `/uploads/partners/${req.file.filename}` : null;

    let endDate = null;
    let pkgId = null;
    let pkgPrice = 0;

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

    const insertAdminSql = `
      INSERT INTO AdminAccounts
      (admin_name, age, email, password, address, gym_name, system_type, session_fee, profile_image_url, rfid_tag, rfid_tag_2 ,package_id, subscription_start_date, subscription_end_date, is_archived)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, 0)
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
      rfid_tag || null,
      rfid_tag_2 || null,
      pkgId,
      endDate,
      endDate,
    ]);

    const admin_id = result.insertId;

    // Insert default Cash payment method
    const cashMethodSql = `
      INSERT INTO AdminPaymentMethods (admin_id, name, is_default, is_enabled)
      VALUES (?, 'Cash', 1, 1)
    `;
    await dbSuperAdmin.promise().query(cashMethodSql, [admin_id]);

    // Insert Daily Session pricing (undeletable)
    const pricingSql = `
      INSERT INTO AdminPricingOptions
      (admin_id, system_type, plan_name, amount_to_pay, amount_to_credit, duration_in_days, is_deletable)
      VALUES (?, ?, 'Daily Session', ?, NULL, NULL, FALSE)
    `;
    await dbSuperAdmin.promise().query(pricingSql, [admin_id, system_type, session_fee]);

    // Insert Key Fob pricing (undeletable)
    const keyFobSql = `
      INSERT INTO AdminPricingOptions
      (admin_id, system_type, plan_name, amount_to_pay, amount_to_credit, duration_in_days, is_deletable)
      VALUES (?, ?, 'Key Fob', 0.00, NULL, NULL, FALSE)
    `;
    await dbSuperAdmin.promise().query(keyFobSql, [admin_id, system_type]);

    // Insert Replacement Fee pricing (undeletable)
    const replacementFeeSql = `
      INSERT INTO AdminPricingOptions
      (admin_id, system_type, plan_name, amount_to_pay, amount_to_credit, duration_in_days, is_deletable)
      VALUES (?, ?, 'Replacement Fee', 0.00, NULL, NULL, FALSE)
    `;
    await dbSuperAdmin.promise().query(replacementFeeSql, [admin_id, system_type]);

    const membershipFeeSql = `
      INSERT INTO AdminPricingOptions
      (admin_id, system_type, plan_name, amount_to_pay, amount_to_credit, duration_in_days, is_deletable)
      VALUES (?, ?, 'Membership Fee', 0.00, NULL, NULL, FALSE)
    `;
    await dbSuperAdmin.promise().query(membershipFeeSql, [admin_id, system_type]);

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
router.put("/update-admin/:id", partnerUpload.single("profile_image_url"), async (req, res) => {
  const adminId = req.params.id;
  
  try {
    const {
      admin_name,
      age,
      email,
      address,
      gym_name,
      system_type,
      session_fee,
      password,
      rfid_tag_2,
    } = req.body;

    // Get current admin data
    const [currentAdmin] = await dbSuperAdmin.promise().query(
      `SELECT * FROM AdminAccounts WHERE id = ?`,
      [adminId]
    );

    if (currentAdmin.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    let imagePath = currentAdmin[0].profile_image_url;
    if (req.file) {
      imagePath = `/uploads/partners/${req.file.filename}`;
    }

    let hashedPassword = currentAdmin[0].password;
    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const updateSql = `
      UPDATE AdminAccounts 
      SET admin_name = ?, age = ?, email = ?, address = ?, gym_name = ?, 
          system_type = ?, session_fee = ?, profile_image_url = ?, password = ?, rfid_tag_2 = ?
      WHERE id = ?
    `;

    await dbSuperAdmin.promise().query(updateSql, [
      admin_name,
      age,
      email,
      address,
      gym_name,
      system_type,
      session_fee,
      imagePath,
      hashedPassword,
      rfid_tag_2 || null,
      adminId,
    ]);

    res.json({ 
      message: "Admin updated successfully",
      profile_image_url: imagePath 
    });

  } catch (error) {
    console.error("Update admin error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/replace-admin-rfid/:id", async (req, res) => {
  const adminId = req.params.id;
  const { new_rfid_tag, rfid_slot } = req.body; // ✅ ADD rfid_slot (1 or 2)

  try {
    const [currentAdmin] = await dbSuperAdmin.promise().query(
      "SELECT rfid_tag, rfid_tag_2 FROM AdminAccounts WHERE id = ?",
      [adminId]
    );

    if (currentAdmin.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    let updateSql, params;
    const oldRfid = rfid_slot === 2 ? currentAdmin[0].rfid_tag_2 : currentAdmin[0].rfid_tag;

    if (rfid_slot === 2) {
      updateSql = `
        UPDATE AdminAccounts 
        SET previous_rfid_2 = ?, rfid_tag_2 = ?, replaced_by = ?, replaced_at = NOW() 
        WHERE id = ?
      `;
      params = [oldRfid, new_rfid_tag, "SuperAdmin", adminId];
    } else {
      updateSql = `
        UPDATE AdminAccounts 
        SET previous_rfid = ?, rfid_tag = ?, replaced_by = ?, replaced_at = NOW() 
        WHERE id = ?
      `;
      params = [oldRfid, new_rfid_tag, "SuperAdmin", adminId];
    }
    
    await dbSuperAdmin.promise().query(updateSql, params);

    res.json({
      message: `RFID ${rfid_slot} replaced successfully`,
      old_rfid: oldRfid,
      new_rfid: new_rfid_tag,
      replaced_by: "SuperAdmin",
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/admins", (req, res) => {
  const sql = `
    SELECT id, admin_name, age, email, address, gym_name, system_type, session_fee, profile_image_url, rfid_tag, rfid_tag_2, is_archived 
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
    // Check if admin exists
    const [checkRows] = await dbSuperAdmin.promise().query(
      `SELECT id, is_archived, admin_name FROM AdminAccounts WHERE id = ?`,
      [adminId]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    if (checkRows[0].is_archived === 0) {
      return res.status(400).json({ 
        error: "Cannot delete active admin. Please archive first.",
        admin_name: checkRows[0].admin_name
      });
    }

    console.log(`Deleting admin: ${checkRows[0].admin_name} (ID: ${adminId})`);

    // Delete in correct order to handle foreign keys
    
    // 1. Delete SuperAdmin transaction items first (child of transactions)
    const txItemResult = await dbSuperAdmin.promise().query(
      `DELETE FROM SuperAdminTransactionItems 
       WHERE transaction_id IN (SELECT id FROM SuperAdminTransactions WHERE admin_id = ?)`,
      [adminId]
    );
    console.log(`Deleted ${txItemResult[0].affectedRows} SuperAdmin transaction items`);

    // 2. Delete SuperAdmin transactions
    const txResult = await dbSuperAdmin.promise().query(
      `DELETE FROM SuperAdminTransactions WHERE admin_id = ?`,
      [adminId]
    );
    console.log(`Deleted ${txResult[0].affectedRows} SuperAdmin transactions`);

    // 3. Delete Admin transactions
    const adminTxResult = await dbSuperAdmin.promise().query(
      `DELETE FROM AdminTransactions WHERE admin_id = ?`,
      [adminId]
    );
    console.log(`Deleted ${adminTxResult[0].affectedRows} Admin transactions`);

    // 4. Delete Admin member transactions
    const memberTxResult = await dbSuperAdmin.promise().query(
      `DELETE FROM AdminMembersTransactions WHERE admin_id = ?`,
      [adminId]
    );
    console.log(`Deleted ${memberTxResult[0].affectedRows} Admin member transactions`);

    // 5. Delete payment methods
    const pmResult = await dbSuperAdmin.promise().query(
      `DELETE FROM AdminPaymentMethods WHERE admin_id = ?`,
      [adminId]
    );
    console.log(`Deleted ${pmResult[0].affectedRows} payment methods`);

    // 6. Delete pricing options
    const priceResult = await dbSuperAdmin.promise().query(
      `DELETE FROM AdminPricingOptions WHERE admin_id = ?`,
      [adminId]
    );
    console.log(`Deleted ${priceResult[0].affectedRows} pricing options`);

    // 7. Delete RFID cards
    const rfidResult = await dbSuperAdmin.promise().query(
      `DELETE FROM AdminRFIDCards WHERE admin_id = ?`,
      [adminId]
    );
    console.log(`Deleted ${rfidResult[0].affectedRows} RFID cards`);

    // 8. Delete staff session logs
    const staffResult = await dbSuperAdmin.promise().query(
      `DELETE FROM StaffSessionLogs WHERE admin_id = ?`,
      [adminId]
    );
    console.log(`Deleted ${staffResult[0].affectedRows} staff session logs`);

    // 9. Delete staff activity logs
    const activityResult = await dbSuperAdmin.promise().query(
      `DELETE FROM StaffActivityLogs WHERE admin_id = ?`,
      [adminId]
    );
    console.log(`Deleted ${activityResult[0].affectedRows} staff activity logs`);

    // 10. Delete staff accounts
    const staffAccResult = await dbSuperAdmin.promise().query(
      `DELETE FROM StaffAccounts WHERE admin_id = ?`,
      [adminId]
    );
    console.log(`Deleted ${staffAccResult[0].affectedRows} staff accounts`);

    // 11. Delete entry logs
    const entryResult = await dbSuperAdmin.promise().query(
      `DELETE FROM AdminEntryLogs WHERE admin_id = ?`,
      [adminId]
    );
    console.log(`Deleted ${entryResult[0].affectedRows} entry logs`);

    // 12. Delete member-related records (workout, meal, assessments)
    const workoutProgressResult = await dbSuperAdmin.promise().query(
      `DELETE FROM membersworkoutprogress WHERE member_id IN (SELECT id FROM MembersAccounts WHERE admin_id = ?)`,
      [adminId]
    );
    console.log(`Deleted ${workoutProgressResult[0].affectedRows} workout progress records`);

    const workoutSessionResult = await dbSuperAdmin.promise().query(
      `DELETE FROM membersworkoutsessionlogs WHERE member_id IN (SELECT id FROM MembersAccounts WHERE admin_id = ?)`,
      [adminId]
    );
    console.log(`Deleted ${workoutSessionResult[0].affectedRows} workout session logs`);

    const mealLogsResult = await dbSuperAdmin.promise().query(
      `DELETE FROM membersmeallogs WHERE member_id IN (SELECT id FROM MembersAccounts WHERE admin_id = ?)`,
      [adminId]
    );
    console.log(`Deleted ${mealLogsResult[0].affectedRows} meal logs`);

    const mealAssessResult = await dbSuperAdmin.promise().query(
      `DELETE FROM adminmembermealassessment WHERE member_id IN (SELECT id FROM MembersAccounts WHERE admin_id = ?)`,
      [adminId]
    );
    console.log(`Deleted ${mealAssessResult[0].affectedRows} meal assessments`);

    const nutritionResult = await dbSuperAdmin.promise().query(
      `DELETE FROM MemberNutritionResult WHERE member_id IN (SELECT id FROM MembersAccounts WHERE admin_id = ?)`,
      [adminId]
    );
    console.log(`Deleted ${nutritionResult[0].affectedRows} nutrition results`);

    const exerciseAssessResult = await dbSuperAdmin.promise().query(
      `DELETE FROM ExerciseAssessments WHERE member_id IN (SELECT id FROM MembersAccounts WHERE admin_id = ?)`,
      [adminId]
    );
    console.log(`Deleted ${exerciseAssessResult[0].affectedRows} exercise assessments`);

    const initialAssessResult = await dbSuperAdmin.promise().query(
      `DELETE FROM InitialAssessment WHERE member_id IN (SELECT id FROM MembersAccounts WHERE admin_id = ?)`,
      [adminId]
    );
    console.log(`Deleted ${initialAssessResult[0].affectedRows} initial assessments`);

    // 13. Delete members
    const membersResult = await dbSuperAdmin.promise().query(
      `DELETE FROM MembersAccounts WHERE admin_id = ?`,
      [adminId]
    );
    console.log(`Deleted ${membersResult[0].affectedRows} members`);

    // 14. Delete day pass guests
    const guestsResult = await dbSuperAdmin.promise().query(
      `DELETE FROM DayPassGuests WHERE admin_id = ?`,
      [adminId]
    );
    console.log(`Deleted ${guestsResult[0].affectedRows} day pass guests`);

    // 15. Finally delete the admin account
    const adminResult = await dbSuperAdmin.promise().query(
      `DELETE FROM AdminAccounts WHERE id = ?`,
      [adminId]
    );
    console.log(`Deleted admin account`);

    res.json({ 
      message: "Admin and all related data deleted successfully",
      admin_name: checkRows[0].admin_name,
      deleted_records: {
        superadmin_transaction_items: txItemResult[0].affectedRows,
        superadmin_transactions: txResult[0].affectedRows,
        admin_transactions: adminTxResult[0].affectedRows,
        admin_member_transactions: memberTxResult[0].affectedRows,
        payment_methods: pmResult[0].affectedRows,
        pricing_options: priceResult[0].affectedRows,
        rfid_cards: rfidResult[0].affectedRows,
        staff_session_logs: staffResult[0].affectedRows,
        staff_activity_logs: activityResult[0].affectedRows,
        staff_accounts: staffAccResult[0].affectedRows,
        entry_logs: entryResult[0].affectedRows,
        workout_progress: workoutProgressResult[0].affectedRows,
        workout_sessions: workoutSessionResult[0].affectedRows,
        meal_logs: mealLogsResult[0].affectedRows,
        meal_assessments: mealAssessResult[0].affectedRows,
        nutrition_results: nutritionResult[0].affectedRows,
        exercise_assessments: exerciseAssessResult[0].affectedRows,
        initial_assessments: initialAssessResult[0].affectedRows,
        members: membersResult[0].affectedRows,
        guests: guestsResult[0].affectedRows
      }
    });

  } catch (error) {
    console.error("Delete admin error:", error);
    
    // More detailed error message
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        error: "Cannot delete: Admin has related records in other tables",
        details: error.message 
      });
    }
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ 
        error: "Database table not found",
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      error: "Server error", 
      details: error.message 
    });
  }
});

module.exports = router;
