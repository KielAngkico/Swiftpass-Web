const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");
const logAudit = require("../middleware/auditLogger");

// ─── Recursive item resolver ─────────────────────────────────────────────────
// Flattens a package's items tree into raw inventory items for deduction.
// Handles 3+ levels: onboarding → hardware bundle → individual modules → parts
async function resolveItems(conn, packageId, visited = new Set()) {
  if (visited.has(packageId)) return []; // prevent infinite loops
  visited.add(packageId);

  const [items] = await conn.query(
    "SELECT * FROM PackageItems WHERE package_id = ?",
    [packageId]
  );

  let resolved = [];
  for (const item of items) {
    if (item.sub_package_id) {
      const childItems = await resolveItems(conn, item.sub_package_id, visited);
      resolved.push(...childItems);
    } else {
      resolved.push(item);
    }
  }
  return resolved;
}

// ─── POST /packages ──────────────────────────────────────────────────────────
router.post("/packages", async (req, res) => {
  try {
    const { name, price, duration_days, items, package_type } = req.body;
    if (!name || !price) {
      return res.status(400).json({ message: "All fields required" });
    }

    const [result] = await dbSuperAdmin.promise().query(
      "INSERT INTO SubscriptionPackages (name, price, duration_days, package_type) VALUES (?, ?, ?, ?)",
      [name, price, duration_days || 0, package_type || "subscription"]
    );

    const packageId = result.insertId;

    if (items && items.length > 0) {
      for (const item of items) {
        if (item.sub_package_id) {
          // sub-package reference
          await dbSuperAdmin.promise().query(
            "INSERT INTO PackageItems (package_id, sub_package_id, quantity) VALUES (?, ?, ?)",
            [packageId, item.sub_package_id, item.quantity || 1]
          );
        } else {
          // raw inventory item
          await dbSuperAdmin.promise().query(
            "INSERT INTO PackageItems (package_id, item_name, quantity) VALUES (?, ?, ?)",
            [packageId, item.item_name, item.quantity || 1]
          );
        }
      }
    }

    await logAudit({
      req,
      action: "CREATE",
      module: "Packages",
      target: name,
      target_id: packageId,
      description: `Added package ${name} (${package_type || "subscription"})`,
      payload: req.body,
    });

    res.status(201).json({ message: "Package created", packageId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating package" });
  }
});

// ─── GET /packages ───────────────────────────────────────────────────────────
router.get("/packages", async (req, res) => {
  try {
    const [packages] = await dbSuperAdmin.promise().query(
      "SELECT * FROM SubscriptionPackages ORDER BY created_at DESC"
    );

    for (let pkg of packages) {
      const [items] = await dbSuperAdmin.promise().query(
        `SELECT pi.*, sp.name AS sub_package_name, sp.package_type AS sub_package_type
         FROM PackageItems pi
         LEFT JOIN SubscriptionPackages sp ON sp.id = pi.sub_package_id
         WHERE pi.package_id = ?`,
        [pkg.id]
      );
      pkg.items = items;
    }

    res.json(packages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching packages" });
  }
});

// ─── PUT /packages/:id ───────────────────────────────────────────────────────
router.put("/packages/:id", async (req, res) => {
  const conn = await dbSuperAdmin.promise().getConnection();
  try {
    const { id } = req.params;
    const { name, price, duration_days, items, package_type } = req.body;

    await conn.beginTransaction();

    await conn.query(
      "UPDATE SubscriptionPackages SET name=?, price=?, duration_days=?, package_type=? WHERE id=?",
      [name, price, duration_days || 0, package_type || "subscription", id]
    );

    await conn.query("DELETE FROM PackageItems WHERE package_id=?", [id]);

    if (items && items.length > 0) {
      for (const item of items) {
        if (item.sub_package_id) {
          await conn.query(
            "INSERT INTO PackageItems (package_id, sub_package_id, quantity) VALUES (?, ?, ?)",
            [id, item.sub_package_id, item.quantity || 1]
          );
        } else {
          await conn.query(
            "INSERT INTO PackageItems (package_id, item_name, quantity) VALUES (?, ?, ?)",
            [id, item.item_name, item.quantity || 1]
          );
        }
      }
    }

    await conn.commit();

    await logAudit({
      req,
      action: "UPDATE",
      module: "Packages",
      target: name,
      target_id: parseInt(id),
      description: `Edited package ${name} (${package_type || "subscription"})`,
      payload: req.body,
    });

    res.json({ message: "Package updated" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Error updating package" });
  } finally {
    conn.release();
  }
});

// ─── DELETE /packages/:id ────────────────────────────────────────────────────
router.delete("/packages/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [[pkg]] = await dbSuperAdmin.promise().query(
      "SELECT name FROM SubscriptionPackages WHERE id = ?", [id]
    );

    await dbSuperAdmin.promise().query(
      "DELETE FROM SubscriptionPackages WHERE id=?", [id]
    );

    await logAudit({
      req,
      action: "DELETE",
      module: "Packages",
      target: pkg ? pkg.name : id,
      target_id: parseInt(id),
      description: `Deleted package ${pkg ? pkg.name : id}`,
      payload: req.body,
    });

    res.json({ message: "Package deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting package" });
  }
});

// ─── POST /purchase-package ──────────────────────────────────────────────────
router.post("/purchase-package", async (req, res) => {
  const conn = await dbSuperAdmin.promise().getConnection();
  try {
    const { admin_id, package_id } = req.body;
    if (!admin_id || !package_id) {
      return res.status(400).json({ message: "Admin ID and Package ID required" });
    }

    await conn.beginTransaction();

    const [[pkg]] = await conn.query(
      "SELECT * FROM SubscriptionPackages WHERE id=?", [package_id]
    );
    if (!pkg) {
      await conn.rollback();
      return res.status(404).json({ message: "Package not found" });
    }

    // Extend subscription
    const [[admin]] = await conn.query(
      "SELECT subscription_end_date FROM AdminAccounts WHERE id = ?", [admin_id]
    );
    const now = new Date();
    const currentEnd = admin?.subscription_end_date ? new Date(admin.subscription_end_date) : now;
    const baseDate = currentEnd > now ? currentEnd : now;
    const endDate = new Date(baseDate);
    endDate.setDate(baseDate.getDate() + (pkg.duration_days || 0));

    await conn.query(
      "UPDATE AdminAccounts SET package_id=?, subscription_start_date=?, subscription_end_date=? WHERE id=?",
      [package_id, now, endDate, admin_id]
    );

    const [trx] = await conn.query(
      "INSERT INTO SuperAdminTransactions (admin_id, transaction_type, total_amount) VALUES (?, ?, ?)",
      [admin_id, pkg.package_type || "subscription", pkg.price]
    );
    const trxId = trx.insertId;

    // ✅ Recursively resolve ALL items (handles bundle → module → parts)
    const deductsInventory = ["onboarding", "hardware_module", "rfid_bundle"].includes(pkg.package_type);
    const allItems = await resolveItems(conn, package_id);

    for (const item of allItems) {
      await conn.query(
        "INSERT INTO SuperAdminTransactionItems (transaction_id, item_name, quantity, price) VALUES (?, ?, ?, ?)",
        [trxId, item.item_name, item.quantity, 0]
      );

      if (deductsInventory) {
        await conn.query(
          "UPDATE SuperAdminInventory SET quantity = quantity - ? WHERE name=?",
          [item.quantity, item.item_name]
        );
      }
    }

    await conn.commit();

    await logAudit({
      req,
      action: "UPDATE",
      module: "Packages",
      target: pkg.name,
      target_id: parseInt(package_id),
      description: `Purchased package ${pkg.name} for admin ${admin_id}`,
      payload: req.body,
    });

    res.json({ message: "Package purchased successfully", transaction_id: trxId });
  } catch (err) {
    await conn.rollback();
    console.error("Purchase package error:", err);
    res.status(500).json({ message: "Error purchasing package" });
  } finally {
    conn.release();
  }
});

// ========== PAYMENT OPTIONS (unchanged) ==========

router.get("/payment-options", async (req, res) => {
  try {
    const [options] = await dbSuperAdmin.promise().query(
      `SELECT * FROM SuperAdminPaymentOptions ORDER BY is_default DESC, payment_method ASC`
    );
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/payment-options", async (req, res) => {
  try {
    const { payment_method, account_name, account_number, is_enabled } = req.body;
    if (!payment_method) return res.status(400).json({ error: "Payment method is required" });

    await dbSuperAdmin.promise().query(
      `INSERT INTO SuperAdminPaymentOptions (payment_method, account_name, account_number, is_enabled) VALUES (?, ?, ?, ?)`,
      [payment_method, account_name || null, account_number || null, is_enabled ? 1 : 0]
    );

    await logAudit({ req, action: "CREATE", module: "Packages", target: payment_method, target_id: null, description: `Added payment option ${payment_method}`, payload: req.body });
    res.status(201).json({ message: "Payment option added" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "Payment method already exists" });
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/payment-options/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, account_name, account_number, is_enabled } = req.body;
    await dbSuperAdmin.promise().query(
      `UPDATE SuperAdminPaymentOptions SET payment_method=?, account_name=?, account_number=?, is_enabled=? WHERE id=?`,
      [payment_method, account_name || null, account_number || null, is_enabled ? 1 : 0, id]
    );
    await logAudit({ req, action: "UPDATE", module: "Packages", target: payment_method, target_id: parseInt(id), description: `Edited payment option ${payment_method}`, payload: req.body });
    res.json({ message: "Payment option updated" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/payment-options/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [[option]] = await dbSuperAdmin.promise().query(
      `SELECT is_default, payment_method FROM SuperAdminPaymentOptions WHERE id=?`, [id]
    );
    if (!option) return res.status(404).json({ error: "Payment option not found" });
    if (option.is_default) return res.status(400).json({ error: "Cannot delete default payment method" });
    await dbSuperAdmin.promise().query(`DELETE FROM SuperAdminPaymentOptions WHERE id=?`, [id]);
    await logAudit({ req, action: "DELETE", module: "Packages", target: option.payment_method, target_id: parseInt(id), description: `Deleted payment option ${option.payment_method}`, payload: req.body });
    res.json({ message: "Payment option deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/payment-options/:id/set-default", async (req, res) => {
  const conn = await dbSuperAdmin.promise().getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE SuperAdminPaymentOptions SET is_default=0`);
    const [result] = await conn.query(
      `UPDATE SuperAdminPaymentOptions SET is_default=1 WHERE id=?`, [req.params.id]
    );
    if (result.affectedRows === 0) { await conn.rollback(); return res.status(404).json({ error: "Not found" }); }
    await conn.commit();
    await logAudit({ req, action: "UPDATE", module: "Packages", target: `Payment Option ID ${req.params.id}`, target_id: parseInt(req.params.id), description: `Set default payment option ID ${req.params.id}`, payload: req.body });
    res.json({ message: "Default payment method updated" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

module.exports = router;