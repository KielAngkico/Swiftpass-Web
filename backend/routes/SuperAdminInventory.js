// backend/routes/SuperAdminInventory.js
const express = require("express");
const db = require("../db");

const router = express.Router();

/* ===============================
   📦 Inventory Routes
   =============================== */

// ✅ Get all inventory
router.get("/inventory", (req, res) => {
  db.query("SELECT * FROM SuperAdminInventory", (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    res.json(results);
  });
});

router.post("/inventory", (req, res) => {
  const { name, type, quantity } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Missing fields" });
  }

  db.query(
    "INSERT INTO SuperAdminInventory (name, type, quantity) VALUES (?, ?, ?)",
    [name, type || "", quantity || 0],
    (err, result) => {
      if (err)
        return res.status(500).json({ message: "Insert failed", error: err });
      res.json({ id: result.insertId, message: "Item added" });
    }
  );
});


// ✅ Update only quantity
router.put("/inventory/:id", (req, res) => {
  const { quantity } = req.body;
  if (quantity === undefined) {
    return res.status(400).json({ message: "Quantity required" });
  }

  db.query(
    "UPDATE SuperAdminInventory SET quantity = ? WHERE id = ?",
    [quantity, req.params.id],
    (err) => {
      if (err)
        return res.status(500).json({ message: "Update failed", error: err });
      res.json({ message: "Quantity updated" });
    }
  );
});

// ✅ Delete item
router.delete("/inventory/:id", (req, res) => {
  db.query(
    "DELETE FROM SuperAdminInventory WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err)
        return res.status(500).json({ message: "Delete failed", error: err });
      res.json({ message: "Item deleted" });
    }
  );
});

/* ===============================
   🔐 Registered RFID Routes
   =============================== */

// ✅ Get all registered RFIDs
router.get("/rfid", (req, res) => {
  db.query("SELECT * FROM RegisteredRfid", (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    res.json(results);
  });
});

// ✅ Register new RFID
router.post("/rfid", (req, res) => {
  const { rfid_tag } = req.body;
  if (!rfid_tag) {
    return res.status(400).json({ message: "Missing RFID tag" });
  }

  db.query(
    "INSERT INTO RegisteredRfid (rfid_tag) VALUES (?)",
    [rfid_tag],
    (err, result) => {
      if (err)
        return res.status(500).json({ message: "Insert failed", error: err });
      res.json({ id: result.insertId, message: "RFID registered" });
    }
  );
});


// backend/routes/SuperAdminInventory.js

// ✅ Check if RFID exists
router.get("/rfid/check/:rfid_tag", (req, res) => {
  const { rfid_tag } = req.params;
  db.query(
    "SELECT COUNT(*) as count FROM RegisteredRfid WHERE rfid_tag = ?",
    [rfid_tag],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error", error: err });
      res.json({ exists: results[0].count > 0 });
    }
  );
});


module.exports = router;
