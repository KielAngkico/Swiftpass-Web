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
  const connection = await dbSuperAdmin.promise().getConnection();

  try {
    await connection.beginTransaction();

    // Check if admin exists
    const [checkRows] = await connection.query(
      `SELECT id, is_archived, admin_name FROM AdminAccounts WHERE id = ?`,
      [adminId]
    );

    if (checkRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Admin not found" });
    }

    if (checkRows[0].is_archived === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        error: "Cannot delete active admin. Please archive first.",
        admin_name: checkRows[0].admin_name
      });
    }

    console.log(`🗑️ Deleting admin: ${checkRows[0].admin_name} (ID: ${adminId})`);

    const deletionLog = {};

    // Get all member IDs for this admin first
    const [memberIds] = await connection.query(
      `SELECT id FROM MembersAccounts WHERE admin_id = ?`,
      [adminId]
    );
    const memberIdList = memberIds.map(m => m.id);

    // ====== DELETE MEMBER-RELATED RECORDS FIRST ======
    
    if (memberIdList.length > 0) {
      console.log(`Found ${memberIdList.length} members to delete`);

      // Delete workout split exercises
      try {
        const [wsExercises] = await connection.query(
          `DELETE FROM workoutsplitexercises WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.workout_split_exercises = wsExercises.affectedRows;
      } catch (err) {
        console.log("No workoutsplitexercises to delete or table doesn't exist");
      }

      // Delete workout split days
      try {
        const [wsDays] = await connection.query(
          `DELETE FROM workoutsplitdays WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.workout_split_days = wsDays.affectedRows;
      } catch (err) {
        console.log("No workoutsplitdays to delete or table doesn't exist");
      }

      // Delete member workout session logs
      try {
        const [wsLogs] = await connection.query(
          `DELETE FROM membersworkoutsessionlogs WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.workout_session_logs = wsLogs.affectedRows;
      } catch (err) {
        console.log("No membersworkoutsessionlogs to delete or table doesn't exist");
      }

      // Delete member workout progress
      try {
        const [wpProgress] = await connection.query(
          `DELETE FROM membersworkoutprogress WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.workout_progress = wpProgress.affectedRows;
      } catch (err) {
        console.log("No membersworkoutprogress to delete or table doesn't exist");
      }

      // Delete meal plans
      try {
        const [mealPlans] = await connection.query(
          `DELETE FROM mealplans WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.meal_plans = mealPlans.affectedRows;
      } catch (err) {
        console.log("No mealplans to delete or table doesn't exist");
      }

      // Delete member meal logs
      try {
        const [mealLogs] = await connection.query(
          `DELETE FROM membersmeallogs WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.meal_logs = mealLogs.affectedRows;
      } catch (err) {
        console.log("No membersmeallogs to delete or table doesn't exist");
      }

      // Delete admin member meal assessment
      try {
        const [mealAssess] = await connection.query(
          `DELETE FROM adminmembermealassessment WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.meal_assessments = mealAssess.affectedRows;
      } catch (err) {
        console.log("No adminmembermealassessment to delete or table doesn't exist");
      }

      // Delete nutrition assessments
      try {
        const [nutritionAssess] = await connection.query(
          `DELETE FROM NutritionAssessment WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.nutrition_assessments = nutritionAssess.affectedRows;
      } catch (err) {
        console.log("No NutritionAssessment to delete or table doesn't exist");
      }

      // Delete member nutrition results
      try {
        const [nutritionResults] = await connection.query(
          `DELETE FROM MemberNutritionResult WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.nutrition_results = nutritionResults.affectedRows;
      } catch (err) {
        console.log("No MemberNutritionResult to delete or table doesn't exist");
      }

      // Delete macro nutrient breakdown
      try {
        const [macroBreakdown] = await connection.query(
          `DELETE FROM MacroNutrientBreakdown WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.macro_breakdown = macroBreakdown.affectedRows;
      } catch (err) {
        console.log("No MacroNutrientBreakdown to delete or table doesn't exist");
      }

      // Delete exercise assessments (has admin_id FK!)
      try {
        const [exAssess] = await connection.query(
          `DELETE FROM ExerciseAssessments WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.exercise_assessments = exAssess.affectedRows;
      } catch (err) {
        console.log("No ExerciseAssessments to delete or table doesn't exist");
      }

      // Delete exercise day completions
      try {
        const [exDayComp] = await connection.query(
          `DELETE FROM ExerciseDayCompletions WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.exercise_day_completions = exDayComp.affectedRows;
      } catch (err) {
        console.log("No ExerciseDayCompletions to delete or table doesn't exist");
      }

      // Delete split day exercises
      try {
        const [splitDayEx] = await connection.query(
          `DELETE FROM SplitDayExercises WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.split_day_exercises = splitDayEx.affectedRows;
      } catch (err) {
        console.log("No SplitDayExercises to delete or table doesn't exist");
      }

      // Delete split days
      try {
        const [splitDays] = await connection.query(
          `DELETE FROM SplitDays WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.split_days = splitDays.affectedRows;
      } catch (err) {
        console.log("No SplitDays to delete or table doesn't exist");
      }

      // Delete initial assessments
      try {
        const [initialAssess] = await connection.query(
          `DELETE FROM InitialAssessment WHERE member_id IN (?)`,
          [memberIdList]
        );
        deletionLog.initial_assessments = initialAssess.affectedRows;
      } catch (err) {
        console.log("No InitialAssessment to delete or table doesn't exist");
      }
    }

    // ====== DELETE ADMIN-RELATED RECORDS ======

    // Delete SuperAdmin transaction items
    const [txItems] = await connection.query(
      `DELETE FROM SuperAdminTransactionItems 
       WHERE transaction_id IN (SELECT id FROM SuperAdminTransactions WHERE admin_id = ?)`,
      [adminId]
    );
    deletionLog.superadmin_transaction_items = txItems.affectedRows;

    // Delete SuperAdmin transactions
    const [saTx] = await connection.query(
      `DELETE FROM SuperAdminTransactions WHERE admin_id = ?`,
      [adminId]
    );
    deletionLog.superadmin_transactions = saTx.affectedRows;

    // Delete Admin transactions
    const [adminTx] = await connection.query(
      `DELETE FROM AdminTransactions WHERE admin_id = ?`,
      [adminId]
    );
    deletionLog.admin_transactions = adminTx.affectedRows;

    // Delete Admin member transactions
    const [memberTx] = await connection.query(
      `DELETE FROM AdminMembersTransactions WHERE admin_id = ?`,
      [adminId]
    );
    deletionLog.admin_member_transactions = memberTx.affectedRows;

    // Delete payment methods
    const [payMethods] = await connection.query(
      `DELETE FROM AdminPaymentMethods WHERE admin_id = ?`,
      [adminId]
    );
    deletionLog.payment_methods = payMethods.affectedRows;

    // Delete pricing options
    const [pricing] = await connection.query(
      `DELETE FROM AdminPricingOptions WHERE admin_id = ?`,
      [adminId]
    );
    deletionLog.pricing_options = pricing.affectedRows;

    // Delete RFID cards
    const [rfidCards] = await connection.query(
      `DELETE FROM AdminRFIDCards WHERE admin_id = ?`,
      [adminId]
    );
    deletionLog.rfid_cards = rfidCards.affectedRows;

    // Delete staff activity logs
    const [staffActivity] = await connection.query(
      `DELETE FROM StaffActivityLogs WHERE admin_id = ?`,
      [adminId]
    );
    deletionLog.staff_activity_logs = staffActivity.affectedRows;

    // Delete staff session logs (check column name first)
    try {
      const [staffSessions] = await connection.query(
        `DELETE FROM StaffSessionLogs WHERE admin_id = ?`,
        [adminId]
      );
      deletionLog.staff_session_logs = staffSessions.affectedRows;
    } catch (err) {
      console.log("StaffSessionLogs might not have admin_id column");
    }

    // Delete staff accounts (has TWO foreign keys!)
    const [staffAccs] = await connection.query(
      `DELETE FROM StaffAccounts WHERE admin_id = ?`,
      [adminId]
    );
    deletionLog.staff_accounts = staffAccs.affectedRows;

    // Delete admin entry logs
    const [entryLogs] = await connection.query(
      `DELETE FROM AdminEntryLogs WHERE admin_id = ?`,
      [adminId]
    );
    deletionLog.entry_logs = entryLogs.affectedRows;

    // Delete day pass guests (has admin_id)
    const [guests] = await connection.query(
      `DELETE FROM DayPassGuests WHERE admin_id = ?`,
      [adminId]
    );
    deletionLog.day_pass_guests = guests.affectedRows;

    // Delete members accounts (must be last among member-related)
    const [members] = await connection.query(
      `DELETE FROM MembersAccounts WHERE admin_id = ?`,
      [adminId]
    );
    deletionLog.members = members.affectedRows;

    // Finally delete the admin account
    const [adminDel] = await connection.query(
      `DELETE FROM AdminAccounts WHERE id = ?`,
      [adminId]
    );
    deletionLog.admin_account = adminDel.affectedRows;

    await connection.commit();
    console.log("✅ Deletion successful:", deletionLog);

    res.json({ 
      message: "Admin and all related data deleted successfully",
      admin_name: checkRows[0].admin_name,
      deleted_records: deletionLog
    });

  } catch (error) {
    await connection.rollback();
    console.error("❌ Delete admin error:", error);
    
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        error: "Cannot delete: Admin has related records that cannot be removed",
        sql_error: error.sqlMessage,
        constraint: error.message.match(/CONSTRAINT `(.+?)`/)?.[1] || 'unknown',
        details: error.message 
      });
    }
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ 
        error: "Database table not found",
        sql_error: error.sqlMessage,
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      error: "Server error", 
      sql_error: error.sqlMessage || error.message,
      details: error.stack 
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
