const express = require("express");
const db = require("../db");
const logAudit = require("../middleware/auditLogger");

const router = express.Router();

const generateWarehouseNumber = (role, callback) => {
  const query = `
    SELECT warehouse_number 
    FROM RegisteredRfid 
    WHERE role = ? AND warehouse_number IS NOT NULL
    ORDER BY warehouse_number DESC 
    LIMIT 1
  `;

  db.query(query, [role], (err, results) => {
    if (err) return callback(err);

    let nextNumber = 1;
    if (results.length > 0 && results[0].warehouse_number) {
      const match = results[0].warehouse_number.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    const warehouseNumber = `${role.toUpperCase()}-${String(nextNumber).padStart(4, '0')}`;
    callback(null, warehouseNumber);
  });
};

router.get("/inventory", (req, res) => {
  const query = `
    SELECT 
      i.*,
      COALESCE(
        CASE 
          WHEN i.name = 'Partner/Staff - Card' THEN (SELECT COUNT(*) FROM RegisteredRfid WHERE role = 'Partner' AND rfid_type = 'card' AND status = 'in_stock')
          WHEN i.name = 'Member - Wristband' THEN (SELECT COUNT(*) FROM RegisteredRfid WHERE role = 'Member' AND rfid_type = 'wristband' AND status = 'in_stock')
          WHEN i.name = 'Day Pass - KeyFob' THEN (SELECT COUNT(*) FROM RegisteredRfid WHERE role = 'DayPass' AND rfid_type = 'key_fob' AND status = 'in_stock')
          ELSE i.quantity
        END, 
        i.quantity
      ) as quantity
    FROM SuperAdminInventory i
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

router.post("/inventory", (req, res) => {
  const { name, purchase_price, selling_price, quantity } = req.body;
  if (!name) return res.status(400).json({ message: "Missing fields" });

  db.query(
    "INSERT INTO SuperAdminInventory (name, purchase_price, selling_price, quantity) VALUES (?, ?, ?, ?)",
    [name, purchase_price || 0, selling_price || 0, quantity || 1],
    async (err, result) => {
      if (err) {
        console.error("Inventory Insert Error:", err.sqlMessage);
        return res.status(500).json({ error: err.sqlMessage });
      }

      await logAudit({
        req,
        action: 'CREATE',
        module: 'Inventory',
        target: name,
        target_id: result.insertId,
        description: `Added inventory item ${name}`,
        payload: req.body,
      });

      res.json({ id: result.insertId });
    }
  );
});

router.put("/inventory/:id", (req, res) => {
  const { name, purchase_price, selling_price, quantity } = req.body;

  db.query("SELECT is_deletable, name FROM SuperAdminInventory WHERE id = ?", [req.params.id], async (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (!results.length) return res.status(404).json({ message: "Item not found" });

    const isFixed = results[0].is_deletable === 0;
    const itemName = results[0].name;

    let updates = [];
    let values = [];

    if (!isFixed && name !== undefined) { updates.push("name = ?"); values.push(name); }
    if (purchase_price !== undefined) { updates.push("purchase_price = ?"); values.push(purchase_price); }
    if (selling_price !== undefined) { updates.push("selling_price = ?"); values.push(selling_price); }
    if (!isFixed && quantity !== undefined) { updates.push("quantity = ?"); values.push(quantity); }

    if (updates.length === 0) return res.status(400).json({ message: "No fields to update" });

    values.push(req.params.id);
    db.query(`UPDATE SuperAdminInventory SET ${updates.join(", ")} WHERE id = ?`, values, async (err) => {
      if (err) return res.status(500).json({ error: err });

      await logAudit({
        req,
        action: 'UPDATE',
        module: 'Inventory',
        target: name || itemName,
        target_id: parseInt(req.params.id),
        description: `Edited inventory item ${name || itemName}`,
        payload: req.body,
      });

      res.json({ success: true });
    });
  });
});

router.delete("/inventory/:id", (req, res) => {
  db.query("SELECT is_deletable, name FROM SuperAdminInventory WHERE id = ?", [req.params.id], async (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (!results.length) return res.status(404).json({ message: "Item not found" });
    if (results[0].is_deletable === 0) return res.status(403).json({ message: "This item cannot be deleted" });

    const itemName = results[0].name;

    db.query("DELETE FROM SuperAdminInventory WHERE id = ?", [req.params.id], async (err) => {
      if (err) return res.status(500).json({ error: err });

      await logAudit({
        req,
        action: 'DELETE',
        module: 'Inventory',
        target: itemName,
        target_id: parseInt(req.params.id),
        description: `Deleted inventory item ${itemName}`,
        payload: req.body,
      });

      res.json({ success: true });
    });
  });
});

router.get("/rfid", (req, res) => {
  const query = `
    SELECT 
      r.*,
      a.gym_name
    FROM RegisteredRfid r
    LEFT JOIN AdminAccounts a ON r.allocated_to_admin = a.id
    ORDER BY r.created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

router.post("/rfid", (req, res) => {
  const { rfid_tag, rfid_type, role } = req.body;
  if (!rfid_tag) return res.status(400).json({ message: "Missing RFID tag" });
  if (!role) return res.status(400).json({ message: "Missing role" });

  generateWarehouseNumber(role, (err, warehouseNumber) => {
    if (err) {
      console.error("Error generating warehouse number:", err);
      return res.status(500).json({ error: "Failed to generate warehouse number" });
    }

    db.query(
      "INSERT INTO RegisteredRfid (rfid_tag, rfid_type, role, status, warehouse_number) VALUES (?, ?, ?, 'in_stock', ?)",
      [rfid_tag, rfid_type || null, role, warehouseNumber],
      async (err, result) => {
        if (err) {
          console.error("RFID Insert Error:", err);
          return res.status(500).json({ error: err.sqlMessage || err.message });
        }

        await logAudit({
          req,
          action: 'CREATE',
          module: 'Inventory',
          target: rfid_tag,
          target_id: result.insertId,
          description: `Registered RFID ${rfid_tag} (${role})`,
          payload: req.body,
        });

        res.json({
          id: result.insertId,
          warehouse_number: warehouseNumber
        });
      }
    );
  });
});

router.get("/rfid/check/:rfid_tag", (req, res) => {
  db.query("SELECT COUNT(*) as count FROM RegisteredRfid WHERE rfid_tag = ?", [req.params.rfid_tag], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ exists: results[0].count > 0 });
  });
});

module.exports = router;