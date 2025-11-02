const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");

 router.post("/packages", async (req, res) => {
  try {
    const { name, price, duration_days, items } = req.body;
    if (!name || !price || !duration_days) {
      return res.status(400).json({ message: "All fields required" });
    }

    const [result] = await dbSuperAdmin
      .promise()
      .query("INSERT INTO SubscriptionPackages (name, price, duration_days) VALUES (?, ?, ?)", [
        name, price, duration_days
      ]);

    const packageId = result.insertId;

    if (items && items.length > 0) {
      for (const item of items) {
        await dbSuperAdmin
          .promise()
          .query("INSERT INTO PackageItems (package_id, item_name, quantity) VALUES (?, ?, ?)", [
            packageId, item.item_name, item.quantity || 1
          ]);
      }
    }

    res.status(201).json({ message: "Package created", packageId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating package" });
  }
});

 router.get("/packages", async (req, res) => {
  try {
    const [packages] = await dbSuperAdmin.promise().query("SELECT * FROM SubscriptionPackages ORDER BY created_at DESC");
    for (let pkg of packages) {
      const [items] = await dbSuperAdmin.promise().query("SELECT * FROM PackageItems WHERE package_id = ?", [pkg.id]);
      pkg.items = items;
    }
    res.json(packages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching packages" });
  }
});


router.put("/packages/:id", async (req, res) => {
  const conn = await dbSuperAdmin.promise().getConnection();
  try {
    const { id } = req.params;
    const { name, price, duration_days, items } = req.body;

    await conn.beginTransaction();

     await conn.query(
      "UPDATE SubscriptionPackages SET name=?, price=?, duration_days=? WHERE id=?",
      [name, price, duration_days, id]
    );

     await conn.query("DELETE FROM PackageItems WHERE package_id=?", [id]);

     if (items && items.length > 0) {
      for (const item of items) {
        await conn.query(
          "INSERT INTO PackageItems (package_id, item_name, quantity) VALUES (?, ?, ?)",
          [id, item.item_name, item.quantity || 1]
        );
      }
    }

    await conn.commit();
    res.json({ message: "Package updated" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Error updating package" });
  } finally {
    conn.release();
  }
});
 router.delete("/packages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await dbSuperAdmin.promise().query("DELETE FROM SubscriptionPackages WHERE id=?", [id]);
    res.json({ message: "Package deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting package" });
  }
});

 router.post("/purchase-package", async (req, res) => {
  const conn = await dbSuperAdmin.promise().getConnection();
  try {
    const { admin_id, package_id } = req.body;
    if (!admin_id || !package_id) {
      return res.status(400).json({ message: "Admin ID and Package ID required" });
    }

    await conn.beginTransaction();

    const [[pkg]] = await conn.query("SELECT * FROM SubscriptionPackages WHERE id=?", [package_id]);
    if (!pkg) {
      await conn.rollback();
      return res.status(404).json({ message: "Package not found" });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + pkg.duration_days);

    await conn.query(
      "UPDATE AdminAccounts SET package_id=?, subscription_start_date=?, subscription_end_date=? WHERE id=?",
      [package_id, startDate, endDate, admin_id]
    );

    const [trx] = await conn.query(
      "INSERT INTO SuperAdminTransactions (admin_id, transaction_type, total_amount) VALUES (?, ?, ?)",
      [admin_id, "Subscription Purchase", pkg.price]
    );

    const trxId = trx.insertId;

    const [items] = await conn.query("SELECT * FROM PackageItems WHERE package_id=?", [package_id]);

    for (const item of items) {
      await conn.query(
        "INSERT INTO SuperAdminTransactionItems (transaction_id, item_name, quantity, price) VALUES (?, ?, ?, ?)",
        [trxId, item.item_name, item.quantity, 0]
      );

      await conn.query(
        "UPDATE SuperAdminInventory SET quantity = quantity - ? WHERE name=?",
        [item.quantity, item.item_name]
      );
    }

    await conn.commit();
    res.json({ message: "Package purchased successfully", transaction_id: trxId });
  } catch (err) {
    await conn.rollback();
    console.error("Purchase package error:", err);
    res.status(500).json({ message: "Error purchasing package" });
  } finally {
    conn.release();
  }
});
router.get("/payment-options", async (req, res) => {
  try {
    const [options] = await dbSuperAdmin.promise().query(`
      SELECT * FROM SuperAdminPaymentOptions 
      ORDER BY is_default DESC, payment_method ASC
    `);
    res.json(options);
  } catch (err) {
    console.error("Error fetching payment options:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ADD payment option
router.post("/payment-options", async (req, res) => {
  try {
    const { payment_method, account_name, account_number, is_enabled } = req.body;
    
    if (!payment_method) {
      return res.status(400).json({ error: "Payment method is required" });
    }

    await dbSuperAdmin.promise().query(`
      INSERT INTO SuperAdminPaymentOptions 
      (payment_method, account_name, account_number, is_enabled)
      VALUES (?, ?, ?, ?)
    `, [payment_method, account_name || null, account_number || null, is_enabled ? 1 : 0]);

    res.status(201).json({ message: "Payment option added" });
  } catch (err) {
    console.error("Error adding payment option:", err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Payment method already exists" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

// UPDATE payment option
router.put("/payment-options/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, account_name, account_number, is_enabled } = req.body;

    await dbSuperAdmin.promise().query(`
      UPDATE SuperAdminPaymentOptions 
      SET payment_method = ?, 
          account_name = ?, 
          account_number = ?,
          is_enabled = ?
      WHERE id = ?
    `, [payment_method, account_name || null, account_number || null, is_enabled ? 1 : 0, id]);

    res.json({ message: "Payment option updated" });
  } catch (err) {
    console.error("Error updating payment option:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE payment option
router.delete("/payment-options/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [[option]] = await dbSuperAdmin.promise().query(
      `SELECT is_default FROM SuperAdminPaymentOptions WHERE id = ?`, 
      [id]
    );

    if (!option) {
      return res.status(404).json({ error: "Payment option not found" });
    }

    if (option.is_default) {
      return res.status(400).json({ error: "Cannot delete default payment method" });
    }

    await dbSuperAdmin.promise().query(`DELETE FROM SuperAdminPaymentOptions WHERE id = ?`, [id]);
    res.json({ message: "Payment option deleted" });
  } catch (err) {
    console.error("Error deleting payment option:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// SET DEFAULT payment method
router.put("/payment-options/:id/set-default", async (req, res) => {
  const conn = await dbSuperAdmin.promise().getConnection();
  try {
    await conn.beginTransaction();

    // Remove default from all
    await conn.query(`UPDATE SuperAdminPaymentOptions SET is_default = 0`);

    // Set new default
    const [result] = await conn.query(
      `UPDATE SuperAdminPaymentOptions SET is_default = 1 WHERE id = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Payment option not found" });
    }

    await conn.commit();
    res.json({ message: "Default payment method updated" });
  } catch (err) {
    await conn.rollback();
    console.error("Error setting default:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});
module.exports = router;
