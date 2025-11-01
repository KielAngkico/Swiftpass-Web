const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/inventory", (req, res) => {
  db.query("SELECT * FROM SuperAdminInventory", (err, results) => {
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
    (err, result) => {
      if (err) {
        console.error("Inventory Insert Error:", err.sqlMessage);
        return res.status(500).json({ error: err.sqlMessage });
      }
      res.json({ id: result.insertId });
    }
  );
});

router.put("/inventory/:id", (req, res) => {
  const { quantity } = req.body;
  if (quantity === undefined) return res.status(400).json({ message: "Quantity required" });

  db.query(
    "UPDATE SuperAdminInventory SET quantity = ? WHERE id = ?",
    [quantity, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ success: true });
    }
  );
});

router.delete("/inventory/:id", (req, res) => {
  db.query("DELETE FROM SuperAdminInventory WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
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

  db.query(
    "INSERT INTO RegisteredRfid (rfid_tag, rfid_type, role) VALUES (?, ?, ?)", 
    [rfid_tag, rfid_type || null, role || null], 
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ id: result.insertId });
    }
  );
});

router.get("/rfid/check/:rfid_tag", (req, res) => {
  db.query("SELECT COUNT(*) as count FROM RegisteredRfid WHERE rfid_tag = ?", [req.params.rfid_tag], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ exists: results[0].count > 0 });
  });
});

module.exports = router;

