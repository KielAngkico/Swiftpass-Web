const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");

// ➕ Create subscription package
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

// 📋 Get all packages
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

// ✏️ Update package
// In SubscriptionPackages.js - Update this route
router.put("/packages/:id", async (req, res) => {
  const conn = await dbSuperAdmin.promise().getConnection();
  try {
    const { id } = req.params;
    const { name, price, duration_days, items } = req.body;

    await conn.beginTransaction();

    // Update package details
    await conn.query(
      "UPDATE SubscriptionPackages SET name=?, price=?, duration_days=? WHERE id=?",
      [name, price, duration_days, id]
    );

    // Delete old items
    await conn.query("DELETE FROM PackageItems WHERE package_id=?", [id]);

    // Insert new items
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
// ❌ Delete package
router.delete("/packages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await dbSuperAdmin.promise().query("DELETE FROM SubscriptionPackages WHERE id=?", [id]);
    res.json({ message: "Package deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting package" });
  }
});

// 🛒 Purchase package for admin
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

module.exports = router;
