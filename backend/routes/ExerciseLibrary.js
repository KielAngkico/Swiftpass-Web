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
      created_by,
      alt_exercise_ids
    } = req.body;

    const image_url = req.file ? `/uploads/exercises/${req.file.filename}` : "";

    let alts = null;
    if (alt_exercise_ids) {
      try {
        alts = JSON.stringify(JSON.parse(alt_exercise_ids));
      } catch (e) {
        console.error("Error parsing alt_exercise_ids:", e);
        alts = null;
      }
    }

    const sql = `
      INSERT INTO ExerciseLibrary 
      (name, level, muscle_group, sub_target, exercise_type, equipment, instructions, image_url, created_by, alt_exercise_ids) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      name, level, muscle_group, sub_target, exercise_type, 
      equipment, instructions, image_url, created_by, alts
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

router.get("/exercises", async (req, res) => {
  try {
    const [exercises] = await dbSuperAdmin
      .promise()
      .query("SELECT * FROM ExerciseLibrary ORDER BY created_at DESC");

    for (let ex of exercises) {
      let ids = ex.alt_exercise_ids || [];
      
      if (typeof ids === 'string') {
        try {
          ids = JSON.parse(ids);
        } catch (e) {
          console.error("Parse error for exercise", ex.id, e);
          ids = [];
        }
      }
      
      ex.alt_exercise_ids = Array.isArray(ids) ? ids : [];
      
      if (ex.alt_exercise_ids.length > 0) {
        try {
          const [alts] = await dbSuperAdmin
            .promise()
            .query(
              "SELECT id, name, muscle_group, image_url FROM ExerciseLibrary WHERE id IN (?)",
              [ex.alt_exercise_ids]
            );
          ex.alternatives = alts;
        } catch (e) {
          console.error("Error fetching alternatives for exercise", ex.id, e);
          ex.alternatives = [];
        }
      } else {
        ex.alternatives = [];
      }
    }

    res.status(200).json(exercises);
  } catch (err) {
    console.error("Fetch Error:", err.message);
    res.status(500).json({ error: "Failed to fetch exercises" });
  }
});

router.put("/exercises/:id", exerciseUpload.single("image"), async (req, res) => {
  const { id } = req.params;
  const {
    name, level, muscle_group, sub_target, exercise_type, 
    equipment, instructions, alt_exercise_ids
  } = req.body;

  const image_url = req.file ? `/uploads/exercises/${req.file.filename}` : null;
  
  let alts = null;
  if (alt_exercise_ids) {
    try {
      alts = JSON.stringify(JSON.parse(alt_exercise_ids));
    } catch (e) {
      console.error("Error parsing alt_exercise_ids:", e);
      alts = null;
    }
  }

  let sql = `
    UPDATE ExerciseLibrary SET 
      name = ?, level = ?, muscle_group = ?, sub_target = ?,
      exercise_type = ?, equipment = ?, instructions = ?, alt_exercise_ids = ?
  `;
  const values = [name, level, muscle_group, sub_target, exercise_type, equipment, instructions, alts];

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
