const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");
const exerciseUpload = require("../middleware/exerciseUpload");

router.post("/exercises", exerciseUpload.single("image"), async (req, res) => {
  try {
    const {
      name,
      level,
      muscle_group,
      sub_target,
      exercise_type,
      equipment,
      instructions,
      created_by
    } = req.body;

    const image_url = req.file
      ? `/uploads/exercises/${req.file.filename}`
      : "";

    const sql = `
      INSERT INTO ExerciseLibrary 
      (name, level, muscle_group, sub_target, exercise_type, equipment, instructions, image_url, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      name,
      level,
      muscle_group,
      sub_target,
      exercise_type,
      equipment,
      instructions,
      image_url,
      created_by
    ];

    dbSuperAdmin.query(sql, values, (err, result) => {
      if (err) {
        console.error("Insert Error:", err.message);
        return res.status(500).json({ error: "Failed to add exercise" });
      }
      res.status(200).json({ message: "Exercise added successfully" });
    });
  } catch (error) {
    console.error("Add Error:", error.message);
    res.status(500).json({ error: "Unexpected error occurred" });
  }
});

router.get("/exercises", (req, res) => {
  const sql = "SELECT * FROM ExerciseLibrary ORDER BY created_at DESC";

  dbSuperAdmin.query(sql, (err, results) => {
    if (err) {
      console.error("Fetch Error:", err.message);
      return res.status(500).json({ error: "Failed to fetch exercises" });
    }

    console.log("Results:", results);
    res.status(200).json(results);
  });
});


router.put("/exercises/:id", exerciseUpload.single("image"), async (req, res) => {
  const { id } = req.params;
  const {
    name,
    level,
    muscle_group,
    sub_target,
    exercise_type,
    equipment,
    instructions
  } = req.body;

  const image_url = req.file ? `/uploads/exercises/${req.file.filename}` : null;

  let sql = `
    UPDATE ExerciseLibrary SET 
      name = ?,
      level = ?,
      muscle_group = ?,
      sub_target = ?,
      exercise_type = ?,
      equipment = ?,
      instructions = ?
  `;
  const values = [
    name,
    level,
    muscle_group,
    sub_target,
    exercise_type,
    equipment,
    instructions
  ];

  if (image_url) {
    sql += ", image_url = ?";
    values.push(image_url);
  }

  sql += " WHERE id = ?";
  values.push(id);

  dbSuperAdmin.query(sql, values, (err, result) => {
    if (err) {
      console.error("Update Error:", err.message);
      return res.status(500).json({ error: "Failed to update exercise" });
    }
    res.status(200).json({ message: "Exercise updated successfully" });
  });
});

module.exports = router;
