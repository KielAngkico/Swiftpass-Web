const express = require("express");
const router = express.Router();
const db = require("../db");
const { logAudit } = require("../middleware/auditLogger");

router.get("/allergens", (req, res) => {
  db.query("SELECT * FROM Allergens ORDER BY name ASC", (err, results) => {
    if (err) {
      console.error("❌ Error fetching allergens:", err);
      return res.status(500).json({ error: "Failed to fetch allergens" });
    }
    res.json(results);
  });
});

router.post("/allergens", (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Allergen name is required" });
  }

  db.query(
    "INSERT INTO Allergens (name) VALUES (?)",
    [name.trim()],
    async (err, result) => {
      if (err) {
        console.error("❌ Error adding allergen:", err);
        return res.status(500).json({ error: "Failed to add allergen" });
      }

      await logAudit({
        req,
        action: 'CREATE',
        module: 'Allergens',
        target: name.trim(),
        target_id: result.insertId,
        description: `Added allergen ${name.trim()}`,
        payload: req.body,
      });

      res.status(201).json({ id: result.insertId, name: name.trim() });
    }
  );
});

router.delete("/allergens/:id", (req, res) => {
  const { id } = req.params;

  db.query("SELECT name FROM Allergens WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch allergen" });

    const allergenName = rows.length ? rows[0].name : id;

    db.query("DELETE FROM Allergens WHERE id = ?", [id], async (err, result) => {
      if (err) {
        console.error("❌ Error deleting allergen:", err);
        return res.status(500).json({ error: "Failed to delete allergen" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Allergen not found" });
      }

      await logAudit({
        req,
        action: 'DELETE',
        module: 'Allergens',
        target: allergenName,
        target_id: parseInt(id),
        description: `Deleted allergen ${allergenName}`,
        payload: req.body,
      });

      res.json({ message: "Allergen deleted successfully" });
    });
  });
});

router.put("/allergens/:id", (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Allergen name is required" });
  }

  db.query(
    "UPDATE Allergens SET name = ? WHERE id = ?",
    [name.trim(), id],
    async (err, result) => {
      if (err) {
        console.error("❌ Error updating allergen:", err);
        return res.status(500).json({ error: "Failed to update allergen" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Allergen not found" });
      }

      await logAudit({
        req,
        action: 'UPDATE',
        module: 'Allergens',
        target: name.trim(),
        target_id: parseInt(id),
        description: `Edited allergen ${name.trim()}`,
        payload: req.body,
      });

      res.json({ id: Number(id), name: name.trim() });
    }
  );
});

module.exports = router;