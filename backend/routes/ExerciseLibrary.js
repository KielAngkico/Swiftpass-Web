const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");
const exerciseUpload = require("../middleware/exerciseUpload");
const logAudit = require("../middleware/auditLogger");

router.post("/exercises", exerciseUpload.single("image"), async (req, res) => {
  try {
    const {
      name, level, muscle_group, sub_target, exercise_type,
      equipment, instructions, created_by, alt_exercise_ids, category
    } = req.body;

    const image_url = req.file ? `/uploads/exercises/${req.file.filename}` : "";

    let alts = null;
    if (alt_exercise_ids) {
      try {
        alts = JSON.stringify(JSON.parse(alt_exercise_ids));
      } catch (e) {
        alts = null;
      }
    }

    const sql = `
      INSERT INTO ExerciseLibrary 
      (name, level, muscle_group, sub_target, exercise_type, equipment, instructions, image_url, created_by, alt_exercise_ids, category) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
const values = [
      name, level || null, muscle_group || null, sub_target || null, exercise_type || null,
      equipment, instructions, image_url, created_by, alts,
      category || "strength"
    ];

dbSuperAdmin.query(sql, values, async (err, result) => {
      if (err) {
        console.error("Insert Error:", err.message, err.sqlMessage, values);
        return res.status(500).json({ error: err.sqlMessage || "Failed to add exercise" });
      }

      await logAudit({
        req,
        action: "CREATE",
        module: "ExerciseLibrary",
        target: name,
        target_id: result.insertId,
        description: `Added exercise ${name}`,
        payload: req.body,
      });

      res.status(200).json({ message: "Exercise added successfully" });
    });
  } catch (error) {
    console.error("Add Error:", error.message);
    res.status(500).json({ error: "Unexpected error occurred" });
  }
});

router.get("/exercises", async (req, res) => {
  try {
    const {
      category,
      muscle_group,
      page = 1,
      limit = 20,
      sort = "name",
    } = req.query;

    const allowedSorts = {
      name_asc: "name ASC",
      name_desc: "name DESC",
      muscle_group: "muscle_group ASC",
      level: "level ASC",
      newest: "created_at DESC",
      name: "name ASC",
    };

    const orderBy = allowedSorts[sort] || "name ASC";
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }

    if (muscle_group) {
      conditions.push("muscle_group LIKE ?");
      params.push(`%${muscle_group}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countRows] = await dbSuperAdmin.promise().query(
      `SELECT COUNT(*) as total FROM ExerciseLibrary ${whereClause}`,
      params
    );
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limitNum);

    const [exercises] = await dbSuperAdmin.promise().query(
      `SELECT * FROM ExerciseLibrary ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    for (let ex of exercises) {
      let ids = ex.alt_exercise_ids || [];
      if (typeof ids === "string") {
        try {
          ids = JSON.parse(ids);
        } catch (e) {
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
          ex.alternatives = [];
        }
      } else {
        ex.alternatives = [];
      }
    }

    res.status(200).json({
      data: exercises,
      total,
      page: pageNum,
      totalPages,
    });
  } catch (err) {
    console.error("Fetch Error:", err.message);
    res.status(500).json({ error: "Failed to fetch exercises" });
  }
});

router.put("/exercises/:id", exerciseUpload.single("image"), async (req, res) => {
  const { id } = req.params;
  const {
    name, level, muscle_group, sub_target, exercise_type,
    equipment, instructions, alt_exercise_ids, category
  } = req.body;

  const image_url = req.file ? `/uploads/exercises/${req.file.filename}` : null;

  let alts = null;
  if (alt_exercise_ids) {
    try {
      alts = JSON.stringify(JSON.parse(alt_exercise_ids));
    } catch (e) {
      alts = null;
    }
  }

  let sql = `
    UPDATE ExerciseLibrary SET 
      name = ?, level = ?, muscle_group = ?, sub_target = ?,
      exercise_type = ?, equipment = ?, instructions = ?, alt_exercise_ids = ?, category = ?
  `;
const values = [name, level || null, muscle_group || null, sub_target || null, exercise_type || null, equipment, instructions, alts, category || "strength"];
  if (image_url) {
    sql += ", image_url = ?";
    values.push(image_url);
  }

  sql += " WHERE id = ?";
  values.push(id);

  dbSuperAdmin.query(sql, values, async (err, result) => {
    if (err) {
      console.error("Update Error:", err.message);
      return res.status(500).json({ error: "Failed to update exercise" });
    }

    await logAudit({
      req,
      action: "UPDATE",
      module: "ExerciseLibrary",
      target: name,
      target_id: parseInt(id),
      description: `Edited exercise ${name}`,
      payload: req.body,
    });

    res.status(200).json({ message: "Exercise updated successfully" });
  });
});

module.exports = router;