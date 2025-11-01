const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const db = require("../db");
const upload = require("../middleware/partnersUpload");

const query = (sql, params = []) => db.promise().query(sql, params);

// --- Insert Default Pricing ---
const insertDefaultPricing = async (admin_id, system_type) => {
  const defaults = [
    ["Daily Session", 0],
    ["Key Fob", 0],
    ["Replacement Fee", 0],
    ["Membership Fee", 0],
  ];
  for (const [plan, amount] of defaults) {
    await query(
      `INSERT INTO AdminPricingOptions
      (admin_id, system_type, plan_name, amount_to_pay, is_deletable)
      VALUES (?, ?, ?, ?, FALSE)`,
      [admin_id, system_type, plan, amount]
    );
  }
};

// --- Add Client ---
router.post("/add-client", upload.single("profile_image_url"), async (req, res) => {
  try {
    const {
      admin_name, email, password, address, gym_name,
      system_type, package_id, rfid_tag, rfid_tag_2,
    } = req.body;

    if (!password) return res.status(400).json({ error: "Password is required" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const imagePath = req.file ? `/uploads/partners/${req.file.filename}` : null;

    let pkgId = null, pkgPrice = 0, startDate = null, endDate = null;

    // Calculate subscription dates if package selected
    if (system_type === "subscription" && package_id) {
      const [[pkg]] = await query(`SELECT * FROM SubscriptionPackages WHERE id = ?`, [package_id]);
      if (pkg) {
        pkgId = pkg.id;
        pkgPrice = pkg.price;
        startDate = new Date();
        endDate = new Date(Date.now() + pkg.duration_days * 86400000);
      }
    }

    const [result] = await query(`
      INSERT INTO AdminAccounts
      (admin_name, email, password, address, gym_name, system_type,
       profile_image_url, rfid_tag, rfid_tag_2, package_id,
       subscription_start_date, subscription_end_date, is_archived)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [admin_name, email, hashedPassword, address, gym_name,
      system_type, imagePath, rfid_tag || null, rfid_tag_2 || null,
      pkgId, startDate, endDate]);

    const admin_id = result.insertId;

    await query(`INSERT INTO AdminPaymentMethods (admin_id, name, is_default, is_enabled)
                 VALUES (?, 'Cash', 1, 1)`, [admin_id]);

    await insertDefaultPricing(admin_id, system_type);

    // Record subscription purchase transaction
    if (pkgId && pkgPrice > 0) {
      const [[pkg]] = await query(`SELECT name FROM SubscriptionPackages WHERE id = ?`, [pkgId]);
      const [txn] = await query(`
        INSERT INTO SuperAdminTransactions (admin_id, transaction_type, total_amount)
        VALUES (?, 'Subscription Purchase', ?)`, [admin_id, pkgPrice]);
      await query(`
        INSERT INTO SuperAdminTransactionItems (transaction_id, item_name, quantity, price)
        VALUES (?, ?, 1, ?)`, [txn.insertId, pkg.name, pkgPrice]);
    }

    res.status(201).json({ 
      message: "Client added successfully", 
      id: admin_id,
      profile_image_url: imagePath,
      subscription_start_date: startDate,
      subscription_end_date: endDate
    });
  } catch (err) {
    console.error("Add client error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// --- Update Admin ---
router.put("/update-admin/:id", upload.single("profile_image_url"), async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_name, email, address, gym_name, system_type, password, rfid_tag_2 } = req.body;

    const [[admin]] = await query(`SELECT * FROM AdminAccounts WHERE id = ?`, [id]);
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const imagePath = req.file ? `/uploads/partners/${req.file.filename}` : admin.profile_image_url;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : admin.password;

    await query(`
      UPDATE AdminAccounts 
      SET admin_name=?, email=?, address=?, gym_name=?, system_type=?,
          profile_image_url=?, password=?, rfid_tag_2=?
      WHERE id=?`,
      [admin_name, email, address, gym_name, system_type,
        imagePath, hashedPassword, rfid_tag_2 || null, id]
    );

    res.json({ message: "Admin updated successfully", profile_image_url: imagePath });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Replace RFID ---
router.put("/replace-admin-rfid/:id", async (req, res) => {
  const { id } = req.params;
  const { new_rfid_tag, rfid_slot } = req.body;

  try {
    const [[admin]] = await query("SELECT rfid_tag, rfid_tag_2 FROM AdminAccounts WHERE id = ?", [id]);
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const isSlot2 = rfid_slot === 2;
    const oldRfid = isSlot2 ? admin.rfid_tag_2 : admin.rfid_tag;
    const columnPrefix = isSlot2 ? "_2" : "";

    await query(`
      UPDATE AdminAccounts
      SET previous_rfid${columnPrefix}=?, rfid_tag${columnPrefix}=?, replaced_by='SuperAdmin', replaced_at=NOW()
      WHERE id=?`, [oldRfid, new_rfid_tag, id]);

    res.json({ message: `RFID ${rfid_slot} replaced successfully`, old_rfid: oldRfid, new_rfid_tag });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- Get Admins ---
router.get("/admins", async (_, res) => {
  try {
    const [rows] = await query(`
      SELECT id, admin_name, email, address, gym_name, system_type,
             profile_image_url, rfid_tag, rfid_tag_2, is_archived,
             subscription_start_date, subscription_end_date, package_id,
             DATEDIFF(subscription_end_date, NOW()) as days_remaining
      FROM AdminAccounts 
      ORDER BY is_archived ASC, admin_name ASC`);
    res.json(rows);
  } catch (err) {
    console.error("Get admins error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- Archive / Restore ---
["archive", "restore"].forEach(action => {
  const archived = action === "archive" ? 1 : 0;
  router.put(`/${action}-admin/:id`, async (req, res) => {
    const [result] = await query(
      `UPDATE AdminAccounts SET is_archived=? WHERE id=? AND is_archived!=?`,
      [archived, req.params.id, archived]
    );
    if (!result.affectedRows)
      return res.status(404).json({ error: `Admin not found or already ${action}d` });
    res.json({ message: `Admin ${action}d successfully` });
  });
});

router.get("/admins/:status(active|archived)", async (req, res) => {
  const isArchived = req.params.status === "archived" ? 1 : 0;
  const [rows] = await query(`
    SELECT *, DATEDIFF(subscription_end_date, NOW()) as days_remaining
    FROM AdminAccounts 
    WHERE is_archived=? 
    ORDER BY admin_name ASC`, [isArchived]);
  res.json(rows);
});

// --- Check Expired Subscriptions (Cron Job / Scheduled Task) ---
router.post("/check-expired-subscriptions", async (req, res) => {
  try {
    // Find all subscription partners whose subscription has expired
    const [expiredPartners] = await query(`
      SELECT id, admin_name, gym_name, email, subscription_end_date
      FROM AdminAccounts
      WHERE system_type = 'subscription'
        AND subscription_end_date IS NOT NULL
        AND subscription_end_date < NOW()
        AND is_archived = 0
    `);

    if (expiredPartners.length === 0) {
      return res.json({ message: "No expired subscriptions found", expired_count: 0 });
    }

    // Archive expired partners
    for (const partner of expiredPartners) {
      await query(`UPDATE AdminAccounts SET is_archived = 1 WHERE id = ?`, [partner.id]);
      console.log(`⚠️ Archived expired subscription: ${partner.gym_name} (${partner.email})`);
    }

    res.json({ 
      message: "Expired subscriptions processed", 
      expired_count: expiredPartners.length,
      expired_partners: expiredPartners.map(p => ({
        id: p.id,
        gym_name: p.gym_name,
        email: p.email,
        expired_date: p.subscription_end_date
      }))
    });
  } catch (err) {
    console.error("Check expired subscriptions error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Renew Subscription ---
router.post("/renew-subscription/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { package_id } = req.body;

    const [[admin]] = await query(`SELECT * FROM AdminAccounts WHERE id = ?`, [id]);
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const [[pkg]] = await query(`SELECT * FROM SubscriptionPackages WHERE id = ?`, [package_id]);
    if (!pkg) return res.status(404).json({ error: "Package not found" });

    const startDate = new Date();
    const endDate = new Date(Date.now() + pkg.duration_days * 86400000);

    await query(`
      UPDATE AdminAccounts
      SET package_id = ?,
          subscription_start_date = ?,
          subscription_end_date = ?,
          is_archived = 0
      WHERE id = ?
    `, [package_id, startDate, endDate, id]);

    // Record renewal transaction
    const [txn] = await query(`
      INSERT INTO SuperAdminTransactions (admin_id, transaction_type, total_amount)
      VALUES (?, 'Subscription Renewal', ?)`, [id, pkg.price]);
    await query(`
      INSERT INTO SuperAdminTransactionItems (transaction_id, item_name, quantity, price)
      VALUES (?, ?, 1, ?)`, [txn.insertId, pkg.name, pkg.price]);

    res.json({ 
      message: "Subscription renewed successfully",
      subscription_start_date: startDate,
      subscription_end_date: endDate,
      days_added: pkg.duration_days
    });
  } catch (err) {
    console.error("Renew subscription error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Delete Admin ---
router.delete("/delete-admin/:id", async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [[admin]] = await conn.query(`SELECT id, is_archived, admin_name FROM AdminAccounts WHERE id=?`, [req.params.id]);
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    if (!admin.is_archived) return res.status(400).json({ error: "Please archive before deleting" });

    const cleanupTables = [
      "SuperAdminTransactionItems",
      "SuperAdminTransactions",
      "AdminTransactions",
      "AdminMembersTransactions",
      "AdminPaymentMethods",
      "AdminPricingOptions",
      "AdminRFIDCards",
      "StaffActivityLogs",
      "StaffSessionLogs",
      "StaffAccounts",
      "AdminEntryLogs",
      "DayPassGuests",
      "MembersAccounts"
    ];
    for (const table of cleanupTables) {
      try { await conn.query(`DELETE FROM ${table} WHERE admin_id=?`, [req.params.id]); }
      catch { console.log(`Skipping table: ${table}`); }
    }

    await conn.query(`DELETE FROM AdminAccounts WHERE id=?`, [req.params.id]);
    await conn.commit();

    res.json({ message: "Admin and related data deleted successfully", admin_name: admin.admin_name });
  } catch (err) {
    await conn.rollback();
    console.error("Delete error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;