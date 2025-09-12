const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");


router.post("/rep-ranges", async (req, res) => {
  const { body_goal, gender, reps_low, reps_high } = req.body;

  if (!body_goal || !gender || !reps_low || !reps_high) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const [result] = await dbSuperAdmin.promise().query(
      `INSERT INTO RepRanges (body_goal, gender, reps_low, reps_high, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [body_goal, gender, reps_low, reps_high]
    );

    res.status(201).json({ message: "Rep range added successfully", id: result.insertId });
  } catch (error) {
    console.error("Error creating rep range:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});



router.get("/rep-ranges", async (req, res) => {
  try {
    const [rows] = await dbSuperAdmin.promise().query("SELECT * FROM RepRanges ORDER BY created_at DESC");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching rep ranges:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.put("/rep-ranges/:id", async (req, res) => {
  const { id } = req.params;
  const { body_goal, gender, reps_low, reps_high } = req.body;

  if (!body_goal || !gender || !reps_low || !reps_high) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const [result] = await dbSuperAdmin.promise().query(
      `UPDATE RepRanges
       SET body_goal = ?, gender = ?, reps_low = ?, reps_high = ?
       WHERE id = ?`,
      [body_goal, gender, reps_low, reps_high, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Rep range not found" });
    }

    res.json({ message: "Rep range updated successfully" });
  } catch (err) {
    console.error("Error updating rep range:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
