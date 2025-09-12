const express = require("express");
const router = express.Router();
const db = require("../db"); 
const toNullable = (val) => {
  if (val === "" || val === undefined || val === null) return null;
  return val;
};

router.post("/food-groups", (req, res) => {
  console.log("📦 Received from frontend:", req.body);
  const { name, category } = req.body;

  const is_meat = req.body.is_meat === true || req.body.is_meat === "true" ? 1 : 0;
  const is_red_meat = req.body.is_red_meat === true || req.body.is_red_meat === "true" ? 1 : 0;

  const sql = `INSERT INTO FoodGroups (name, category, is_meat, is_red_meat) VALUES (?, ?, ?, ?)`;
  db.query(sql, [name, category, is_meat, is_red_meat], (err, result) => {
    if (err) {
      console.error("❌ Error inserting food group:", err);
      return res.status(500).json({ error: "Failed to save food group" });
    }
    res.status(201).json({ id: result.insertId, name, category, is_meat, is_red_meat });
  });
});

router.get("/food-groups", (req, res) => {
  db.query("SELECT * FROM FoodGroups ORDER BY name ASC", (err, results) => {
    if (err) {
      console.error("❌ Error fetching groups:", err);
      return res.status(500).json({ error: "Failed to fetch groups" });
    }
    res.json(results);
  });
});

router.post("/food-database", (req, res) => {
const { name, general_group, category, calories, protein, carbs, fats, created_by, allergens, grams_reference, is_meat, is_red_meat } = req.body;


const meatFlag = is_meat === true || is_meat === "true" ? 1 : 0;
const redMeatFlag = is_red_meat === true || is_red_meat === "true" ? 1 : 0;


const findGroupSql = `SELECT id FROM FoodGroups WHERE name = ? LIMIT 1`;
db.query(findGroupSql, [general_group], (err, rows) => {
  if (err) return res.status(500).json({ error: "Failed to check group" });

  if (rows.length > 0) {
    insertFood(rows[0].id);
  } else {
    const insertGroupSql = `INSERT INTO FoodGroups (name, category, is_meat, is_red_meat) VALUES (?, ?, ?, ?)`;
    db.query(insertGroupSql, [general_group, category || "Unknown", meatFlag, redMeatFlag], (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to create group" });
      insertFood(result.insertId);
    });
  }
});



  function insertFood(groupId) {
    const sql = `
      INSERT INTO FoodLibrary 
      (name, group_id, calories, protein, carbs, fats, created_by, grams_reference)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        name,
        groupId,
        toNullable(calories),
        toNullable(protein),
        toNullable(carbs),
        toNullable(fats),
        created_by || "Unknown",
        grams_reference || 100,
      ],
      (err, result) => {
        if (err) return res.status(500).json({ error: "Failed to save food" });

        const foodId = result.insertId;

        if (allergens && allergens.length > 0) {
          const values = allergens.map((aId) => [foodId, aId]);
          db.query("INSERT INTO FoodAllergens (food_id, allergen_id) VALUES ?", [values], (err2) => {
            if (err2) console.error("⚠️ Error inserting allergens:", err2);
          });
        }

        res.status(201).json({ id: foodId, name, general_group, category, calories, protein, carbs, fats, created_by, allergens, grams_reference });
      }
    );
  }
});


router.get("/food-database", (req, res) => {
  const sql = `
    SELECT f.id, f.name, f.calories, f.protein, f.carbs, f.fats, f.created_by, f.grams_reference,
           g.id AS group_id, g.name AS general_group, g.category,
           GROUP_CONCAT(a.name ORDER BY a.name) AS allergens
    FROM FoodLibrary f
    JOIN FoodGroups g ON f.group_id = g.id
    LEFT JOIN FoodAllergens fa ON f.id = fa.food_id
    LEFT JOIN Allergens a ON fa.allergen_id = a.id
    GROUP BY f.id
    ORDER BY f.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch foods" });

    const data = results.map((row) => ({
      ...row,
      allergens: row.allergens ? row.allergens.split(",") : [],
    }));

    res.json(data);
  });
});


router.get("/food-database/:id", (req, res) => {
  const sql = `
    SELECT f.*, g.name AS general_group, g.category,
           GROUP_CONCAT(a.name ORDER BY a.name) AS allergens
    FROM FoodLibrary f
    JOIN FoodGroups g ON f.group_id = g.id
    LEFT JOIN FoodAllergens fa ON f.id = fa.food_id
    LEFT JOIN Allergens a ON fa.allergen_id = a.id
    WHERE f.id = ?
    GROUP BY f.id
  `;

  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch food" });
    if (results.length === 0) return res.status(404).json({ error: "Food not found" });

    const food = results[0];
    food.allergens = food.allergens ? food.allergens.split(",") : [];
    res.json(food);
  });
});


router.put("/food-database/:id", (req, res) => {
  const { name, group_id, calories, protein, carbs, fats, allergens, grams_reference } = req.body;

  const sql = `
    UPDATE FoodLibrary
    SET name=?, group_id=?, calories=?, protein=?, carbs=?, fats=?, grams_reference=?
    WHERE id=?
  `;

  db.query(
    sql,
    [name, group_id, toNullable(calories), toNullable(protein), toNullable(carbs), toNullable(fats), grams_reference || 100, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to update food" });
      if (result.affectedRows === 0) return res.status(404).json({ error: "Food not found" });

      db.query("DELETE FROM FoodAllergens WHERE food_id = ?", [req.params.id], (err2) => {
        if (err2) console.error("⚠️ Error clearing allergens:", err2);

        if (allergens && allergens.length > 0) {
          const values = allergens.map((aId) => [req.params.id, aId]);
          db.query("INSERT INTO FoodAllergens (food_id, allergen_id) VALUES ?", [values], (err3) => {
            if (err3) console.error("⚠️ Error re-inserting allergens:", err3);
          });
        }
      });

      res.json({ id: req.params.id, ...req.body });
    }
  );
});

router.delete("/food-database/:id", (req, res) => {
  db.query("DELETE FROM FoodLibrary WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to delete food" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Food not found" });
    res.json({ message: "Food deleted successfully" });
  });
});

module.exports = router;
