const express = require("express");
const router = express.Router();
const db = require("../db");  

 
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
    (err, result) => {
      if (err) {
        console.error("❌ Error adding allergen:", err);
        return res.status(500).json({ error: "Failed to add allergen" });
      }
      res.status(201).json({ id: result.insertId, name: name.trim() });
    }
  );
});

 
router.delete("/allergens/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM Allergens WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("❌ Error deleting allergen:", err);
      return res.status(500).json({ error: "Failed to delete allergen" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Allergen not found" });
    }

    res.json({ message: "Allergen deleted successfully" });
  });
});

module.exports = router;
