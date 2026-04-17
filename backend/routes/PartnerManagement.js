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
// Add this helper function at the top with other helpers
const getItemType = (itemName) => {
  const name = itemName.toLowerCase();
  
  // Check for hardware items FIRST (PCB, lock, button)
  if (name.includes('pcb') || name.includes('lock') || name.includes('button')) {
    return 'other';
  }
  
  // Then check for RFID items
  if (name.includes('partner') || name.includes('staff')) return 'partner_rfid';
  if (name.includes('member') || name.includes('wristband')) return 'member_rfid';
  if (name.includes('day pass') || name.includes('keyfob')) return 'daypass_rfid';
  
  return 'other';
};

router.post("/add-client", upload.single("profile_image_url"), async (req, res) => {
  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const {
      admin_name, email, password, address, gym_name, gym_code,
      system_type, package_id, rfid_tag, rfid_tag_2,
    } = req.body;

    if (!password) {
      await conn.rollback();
      return res.status(400).json({ error: "Password is required" });

    }

        if (gym_code) {
      const [[existing]] = await conn.query(
        `SELECT id FROM AdminAccounts WHERE gym_code = ?`, [gym_code]
      );
      if (existing) {
        await conn.rollback();
        return res.status(400).json({ error: "Gym code already taken. Choose a different one." });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const imagePath = req.file ? `/uploads/partners/${req.file.filename}` : null;

    let pkgId = null, pkgPrice = 0, startDate = null, endDate = null;

    if (package_id) {
      const [[pkg]] = await conn.query(`SELECT * FROM SubscriptionPackages WHERE id = ?`, [package_id]);
      if (pkg) {
        pkgId = pkg.id;
        pkgPrice = pkg.price;
        startDate = new Date();
        endDate = new Date(Date.now() + pkg.duration_days * 86400000);
      }
    }
    

    // ✅ FIXED: Insert with actual RFID values, not NULL
    const [result] = await conn.query(`
      INSERT INTO AdminAccounts
      (admin_name, email, password, address, gym_name, gym_code, system_type,
       profile_image_url, rfid_tag, rfid_tag_2, package_id,
       subscription_start_date, subscription_end_date, is_archived)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [admin_name, email, hashedPassword, address, gym_name,gym_code,
      system_type, imagePath, rfid_tag || null, rfid_tag_2 || null,
      pkgId, startDate, endDate]);

    const admin_id = result.insertId;

    // ✅ Update RegisteredRfid for slot 1
    if (rfid_tag && rfid_tag.trim() !== "") {
      await conn.query(
        `UPDATE RegisteredRfid 
         SET assigned_to_id = ?,
             assigned_to_name = ?,
             assigned_to_type = 'Admin',
             status = 'in_use',
             assignment_date = NOW()
         WHERE rfid_tag = ? AND role = 'Partner'`,
        [admin_id, admin_name, rfid_tag]
      );
    }

    // ✅ Update RegisteredRfid for slot 2
    if (rfid_tag_2 && rfid_tag_2.trim() !== "") {
      await conn.query(
        `UPDATE RegisteredRfid 
         SET assigned_to_id = ?,
             assigned_to_name = ?,
             assigned_to_type = 'Admin',
             status = 'in_use',
             assignment_date = NOW()
         WHERE rfid_tag = ? AND role = 'Partner'`,
        [admin_id, admin_name, rfid_tag_2]
      );
    }

    await conn.query(`INSERT INTO AdminPaymentMethods (admin_id, name, is_default, is_enabled)
                 VALUES (?, 'Cash', 1, 1)`, [admin_id]);

    await insertDefaultPricing(conn, admin_id, system_type);
if (pkgId && pkgPrice > 0) {
  const { payment_method, reference_number } = req.body;
  
  const [[pkg]] = await conn.query(`SELECT name FROM SubscriptionPackages WHERE id = ?`, [pkgId]);
  const [txn] = await conn.query(`
    INSERT INTO SuperAdminTransactions (admin_id, transaction_type, amount, payment_method, reference_number)
    VALUES (?, 'Package Purchase', ?, ?, ?)`, 
    [admin_id, pkgPrice, payment_method || 'Cash', reference_number || null]);
      
      await conn.query(`
        INSERT INTO SuperAdminTransactionItems
        (transaction_id, item_name, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?)`,
        [txn.insertId, pkg.name, 1, pkgPrice, pkgPrice]
      );

      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const order_number = `ORD-${timestamp}${random}`;

      // ✅ FIXED: Use INNER JOIN and proper item type detection
      const [packageItems] = await conn.query(`
        SELECT 
          pi.item_name, 
          pi.quantity,
          si.selling_price as unit_price
        FROM PackageItems pi
        INNER JOIN SuperAdminInventory si ON pi.item_name = si.name
        WHERE pi.package_id = ?
      `, [pkgId]);

      if (packageItems.length === 0) {
        await conn.rollback();
        return res.status(400).json({ 
          error: "No items found for package or inventory mismatch" 
        });
      }

      const calculatedTotal = packageItems.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price);
      }, 0);

      const [orderResult] = await conn.query(`
        INSERT INTO PartnerOrders 
        (order_number, admin_id, order_type, total_amount, payment_status, status)
        VALUES (?, ?, 'initial_package', ?, 'paid', 'pending')
      `, [order_number, admin_id, calculatedTotal]);

      const order_id = orderResult.insertId;

      for (const item of packageItems) {
        const subtotal = item.quantity * item.unit_price;
        const itemType = getItemType(item.item_name); // ✅ Auto-detect type
        
        await conn.query(`
          INSERT INTO PartnerOrderItems 
          (order_id, item_name, item_type, quantity, unit_price, subtotal, status)
          VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `, [order_id, item.item_name, itemType, item.quantity, item.unit_price, subtotal]);
      }

      console.log(`✅ Created initial order ${order_number} for partner ${admin_id}`);
      console.log(`   Total: ₱${calculatedTotal.toFixed(2)}`);
      console.log(`   Items: ${packageItems.map(i => `${i.item_name}(${i.quantity})`).join(', ')}`);
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
// --- Update Admin RFID (Handles Both Slots) ---
router.put("/update-admin-rfid/:id", async (req, res) => {
  const { id } = req.params;
  const { new_rfid_tag, new_rfid_tag_2 } = req.body;

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    // 1️⃣ Get current RFID values and admin name
    const [[admin]] = await conn.query(
      "SELECT rfid_tag, rfid_tag_2, previous_rfid, previous_rfid_2, admin_name FROM AdminAccounts WHERE id = ?",
      [id]
    );
    if (!admin) {
      await conn.rollback();
      return res.status(404).json({ error: "Admin not found" });
    }

    // 2️⃣ Prepare variables
    let updateFields = [];
    let values = [];

    // ✅ Slot 1
    if (new_rfid_tag && new_rfid_tag !== admin.rfid_tag) {
      updateFields.push("previous_rfid = ?", "rfid_tag = ?");
      values.push(admin.rfid_tag || null, new_rfid_tag);

      // Update RegisteredRfid for slot 1
      if (new_rfid_tag) {
        await conn.query(
          `UPDATE RegisteredRfid 
           SET assigned_to_id = ?,
               assigned_to_name = ?,
               assigned_to_type = 'Admin',
               status = 'in_use',
               assignment_date = NOW()
           WHERE rfid_tag = ? AND role = 'Partner'`,
          [id, admin.admin_name, new_rfid_tag]
        );
      }

      // Clear old RFID if exists
      if (admin.rfid_tag) {
        await conn.query(
          `UPDATE RegisteredRfid 
           SET assigned_to_id = NULL,
               assigned_to_name = NULL,
               assigned_to_type = NULL,
               status = 'allocated',
               assignment_date = NULL
           WHERE rfid_tag = ? AND role = 'Partner'`,
          [admin.rfid_tag]
        );
      }
    }

    // ✅ Slot 2
    if (new_rfid_tag_2 && new_rfid_tag_2 !== admin.rfid_tag_2) {
      updateFields.push("previous_rfid_2 = ?", "rfid_tag_2 = ?");
      values.push(admin.rfid_tag_2 || null, new_rfid_tag_2);

      // Update RegisteredRfid for slot 2
      if (new_rfid_tag_2) {
        await conn.query(
          `UPDATE RegisteredRfid 
           SET assigned_to_id = ?,
               assigned_to_name = ?,
               assigned_to_type = 'Admin',
               status = 'in_use',
               assignment_date = NOW()
           WHERE rfid_tag = ? AND role = 'Partner'`,
          [id, admin.admin_name, new_rfid_tag_2]
        );
      }

      // Clear old RFID if exists
      if (admin.rfid_tag_2) {
        await conn.query(
          `UPDATE RegisteredRfid 
           SET assigned_to_id = NULL,
               assigned_to_name = NULL,
               assigned_to_type = NULL,
               status = 'allocated',
               assignment_date = NULL
           WHERE rfid_tag = ? AND role = 'Partner'`,
          [admin.rfid_tag_2]
        );
      }
    }

    // If nothing to update
    if (updateFields.length === 0) {
      await conn.rollback();
      return res.json({ message: "No RFID changes detected." });
    }

    // Add common fields
    updateFields.push("replaced_by = 'SuperAdmin'", "replaced_at = NOW()");
    const updateQuery = `
      UPDATE AdminAccounts
      SET ${updateFields.join(", ")}
      WHERE id = ?
    `;
    values.push(id);

    // 3️⃣ Execute update
    await conn.query(updateQuery, values);

    await conn.commit();

    res.json({
      message: "RFID(s) updated successfully",
      updated: {
        slot1: new_rfid_tag || admin.rfid_tag,
        slot2: new_rfid_tag_2 || admin.rfid_tag_2,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("RFID Update Error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});




  // -
  // -- Replace RFID ---
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
// Record renewal transaction
const { payment_method, reference_number } = req.body;
const [txn] = await query(`
  INSERT INTO SuperAdminTransactions (admin_id, transaction_type, amount, payment_method, reference_number)
  VALUES (?, 'Package Renewal', ?, ?, ?)`, 
  [id, pkg.price, payment_method || 'Cash', reference_number || null]);
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
router.get("/payment-options", async (req, res) => {
  try {
    const [options] = await query(`
      SELECT * FROM SuperAdminPaymentOptions 
      WHERE is_enabled = 1
      ORDER BY is_default DESC, payment_method ASC
    `);
    res.json(options);
  } catch (err) {
    console.error("Get payment options error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
