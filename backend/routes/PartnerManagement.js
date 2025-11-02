const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const db = require("../db");
const upload = require("../middleware/partnersUpload");

const query = (sql, params = []) => db.promise().query(sql, params);

// --- Insert Default Pricing ---
// --- Insert Default Pricing (modified to accept connection) ---
const insertDefaultPricing = async (conn, admin_id, system_type) => {
  const defaults = [
    ["Daily Session", 0],
    ["Key Fob", 0],
    ["Replacement Fee", 0],
    ["Membership Fee", 0],
  ];
  for (const [plan, amount] of defaults) {
    await conn.query(
      `INSERT INTO AdminPricingOptions
      (admin_id, system_type, plan_name, amount_to_pay, is_deletable)
      VALUES (?, ?, ?, ?, FALSE)`,
      [admin_id, system_type, plan, amount]
    );
  }
};

// --- Add Client ---
router.post("/add-client", upload.single("profile_image_url"), async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const {
      admin_name, email, password, address, gym_name,
      system_type, package_id, rfid_tag, rfid_tag_2,
    } = req.body;

    if (!password) {
      await conn.rollback();
      return res.status(400).json({ error: "Password is required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const imagePath = req.file ? `/uploads/partners/${req.file.filename}` : null;

    let pkgId = null, pkgPrice = 0, startDate = null, endDate = null;

    // Calculate package dates if package selected (FOR ALL SYSTEM TYPES)
    if (package_id) {
      const [[pkg]] = await conn.query(`SELECT * FROM SubscriptionPackages WHERE id = ?`, [package_id]);
      if (pkg) {
        pkgId = pkg.id;
        pkgPrice = pkg.price;
        startDate = new Date();
        endDate = new Date(Date.now() + pkg.duration_days * 86400000);
      }
    }

    const [result] = await conn.query(`
      INSERT INTO AdminAccounts
      (admin_name, email, password, address, gym_name, system_type,
       profile_image_url, rfid_tag, rfid_tag_2, package_id,
       subscription_start_date, subscription_end_date, is_archived)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [admin_name, email, hashedPassword, address, gym_name,
      system_type, imagePath, rfid_tag || null, rfid_tag_2 || null,
      pkgId, startDate, endDate]);

    const admin_id = result.insertId;

    await conn.query(`INSERT INTO AdminPaymentMethods (admin_id, name, is_default, is_enabled)
                 VALUES (?, 'Cash', 1, 1)`, [admin_id]);

    await insertDefaultPricing(conn, admin_id, system_type); // Pass conn here

    // Record package purchase transaction (FOR ALL SYSTEM TYPES)
    if (pkgId && pkgPrice > 0) {
      const [[pkg]] = await conn.query(`SELECT name FROM SubscriptionPackages WHERE id = ?`, [pkgId]);
      const [txn] = await conn.query(`
        INSERT INTO SuperAdminTransactions (admin_id, transaction_type, amount)
        VALUES (?, 'Package Purchase', ?)`, [admin_id, pkgPrice]);
await conn.query(`
  INSERT INTO SuperAdminTransactionItems
  (transaction_id, item_name, quantity, unit_price, total_price)
  VALUES (?, ?, ?, ?, ?)`,
  [txn.insertId, pkg.name, 1, pkgPrice, pkgPrice] // total_price = unit_price * quantity
);


      // ========================================
      // CREATE INITIAL ORDER FOR THE PACKAGE
      // ========================================
      // Generate order number
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const order_number = `ORD-${timestamp}${random}`;

      // Create order
      const [orderResult] = await conn.query(`
        INSERT INTO PartnerOrders 
        (order_number, admin_id, order_type, amount, payment_status, status)
        VALUES (?, ?, 'initial_package', ?, 'paid', 'pending')
      `, [order_number, admin_id, pkgPrice]);

      const order_id = orderResult.insertId;

      // Get package items
      const [packageItems] = await conn.query(
        `SELECT item_name, quantity FROM PackageItems WHERE package_id = ?`,
        [pkgId]
      );

      // Create order items
      for (const item of packageItems) {
        await conn.query(`
          INSERT INTO PartnerOrderItems 
          (order_id, item_name, item_type, quantity, unit_price, subtotal, status)
          VALUES (?, ?, 'other', ?, 0, 0, 'pending')
        `, [order_id, item.item_name, item.quantity]);
      }

      console.log(`✅ Created initial order ${order_number} for partner ${admin_id}`);
    }

    await conn.commit();

    res.status(201).json({ 
      message: "Client added successfully", 
      id: admin_id,
      profile_image_url: imagePath,
      subscription_start_date: startDate,
      subscription_end_date: endDate
    });
  } catch (err) {
    await conn.rollback();
    console.error("Add client error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    conn.release();
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
      SELECT 
        a.id, a.admin_name, a.email, a.address, a.gym_name, a.system_type,
        a.profile_image_url, a.rfid_tag, a.rfid_tag_2, a.is_archived,
        a.subscription_start_date, a.subscription_end_date, a.package_id,
        DATEDIFF(a.subscription_end_date, NOW()) as days_remaining,
        sp.name as package_name,
        sp.description as package_description,
        sp.price as package_price,
        sp.duration_days as package_duration
      FROM AdminAccounts a
      LEFT JOIN SubscriptionPackages sp ON a.package_id = sp.id
      ORDER BY a.is_archived ASC, a.admin_name ASC
    `);
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
    SELECT 
      a.*,
      DATEDIFF(a.subscription_end_date, NOW()) as days_remaining,
      sp.name as package_name,
      sp.description as package_description,
      sp.price as package_price,
      sp.duration_days as package_duration
    FROM AdminAccounts a
    LEFT JOIN SubscriptionPackages sp ON a.package_id = sp.id
    WHERE a.is_archived = ? 
    ORDER BY a.admin_name ASC
  `, [isArchived]);
  res.json(rows);
});

// --- Check Expired Packages (Cron Job / Scheduled Task) ---
router.post("/check-expired-subscriptions", async (req, res) => {
  try {
    // Find all partners whose package has expired (BOTH system types)
    const [expiredPartners] = await query(`
      SELECT id, admin_name, gym_name, email, system_type, subscription_end_date
      FROM AdminAccounts
      WHERE subscription_end_date IS NOT NULL
        AND subscription_end_date < NOW()
        AND is_archived = 0
    `);

    if (expiredPartners.length === 0) {
      return res.json({ message: "No expired packages found", expired_count: 0 });
    }

    // Archive expired partners
    for (const partner of expiredPartners) {
      await query(`UPDATE AdminAccounts SET is_archived = 1 WHERE id = ?`, [partner.id]);
      console.log(`⚠️ Archived expired package: ${partner.gym_name} (${partner.email}) - System: ${partner.system_type}`);
    }

    res.json({ 
      message: "Expired packages processed", 
      expired_count: expiredPartners.length,
      expired_partners: expiredPartners.map(p => ({
        id: p.id,
        gym_name: p.gym_name,
        email: p.email,
        system_type: p.system_type,
        expired_date: p.subscription_end_date
      }))
    });
  } catch (err) {
    console.error("Check expired packages error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Renew Package ---
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
      INSERT INTO SuperAdminTransactions (admin_id, transaction_type, amount)
      VALUES (?, 'Package Renewal', ?)`, [id, pkg.price]); // ← Changed label
await query(`
  INSERT INTO SuperAdminTransactionItems
  (transaction_id, item_name, quantity, unit_price, total_price)
  VALUES (?, ?, ?, ?, ?)`,
  [txn.insertId, pkg.name, 1, pkg.price, pkg.price]  // total_price = unit_price * quantity
);



    res.json({ 
      message: "Package renewed successfully",
      subscription_start_date: startDate,
      subscription_end_date: endDate,
      days_added: pkg.duration_days
    });
  } catch (err) {
    console.error("Renew package error:", err);
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
router.get("/subscription-packages", async (req, res) => {
  try {
    const [packages] = await query(`
      SELECT id, name, description, price, duration_days, created_at
      FROM SubscriptionPackages
      ORDER BY price ASC, duration_days ASC
    `);
    res.json(packages);
  } catch (err) {
    console.error("Get packages error:", err);
    res.status(500).json({ error: "Failed to fetch subscription packages" });
  }
});

module.exports = router;