const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/splits", async (req, res) => {
  const { split_name, workout_days, target_gender, days } = req.body;

  try {

    const [splitResult] = await db.promise().query(
      "INSERT INTO SplitLibrary (split_name, workout_days, target_gender) VALUES (?, ?, ?)",
      [split_name, workout_days, target_gender || "unisex"]
    );

    const split_id = splitResult.insertId;

    for (const day of days) {
      const [dayResult] = await db.promise().query(
        "INSERT INTO SplitDays (split_id, day_number, day_title) VALUES (?, ?, ?)",
        [split_id, day.day_number, day.day_title]
      );

      const split_day_id = dayResult.insertId;
      for (const ex of day.exercise_details || []) {
        await db.promise().query(
          `INSERT INTO SplitDayExercises 
           (split_day_id, exercise_id, order_index, sets, reps, rest_time, notes) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            split_day_id,
            ex.exercise_id,
            ex.order_index || 0,
            ex.sets || 3,
            ex.reps || "8-12",
            ex.rest_time || "60",
            ex.notes || ""
          ]
        );
      }
    }

    res.status(201).json({ message: "Split added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while adding the split" });
  }
});

router.get("/splits", async (req, res) => {
  try {
    const [splits] = await db.promise().query(
      "SELECT * FROM SplitLibrary ORDER BY created_at DESC"
    );

    for (const split of splits) {
      const [days] = await db.promise().query(
        "SELECT * FROM SplitDays WHERE split_id = ? ORDER BY day_number ASC",
        [split.id]
      );

      for (const day of days) {
        const [exercises] = await db.promise().query(
          `SELECT sde.*, e.name AS exercise_name, e.image_url
           FROM SplitDayExercises sde
           JOIN ExerciseLibrary e ON sde.exercise_id = e.id
           WHERE sde.split_day_id = ?
           ORDER BY sde.order_index ASC`,
          [day.id]
        );
        day.exercises = exercises;
      }

      split.days = days;
    }

    res.json(splits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while fetching splits" });
  }
});

router.put("/splits/:id", async (req, res) => {
  const { split_name, workout_days, target_gender, days } = req.body;
  const { id } = req.params;

  try {
    await db.promise().query(
      "UPDATE SplitLibrary SET split_name = ?, workout_days = ?, target_gender = ? WHERE id = ?",
      [split_name, workout_days, target_gender, id]
    );


    await db.promise().query(
      "DELETE FROM SplitDayExercises WHERE split_day_id IN (SELECT id FROM SplitDays WHERE split_id = ?)",
      [id]
    );
    await db.promise().query("DELETE FROM SplitDays WHERE split_id = ?", [id]);
    for (const day of days) {
      const [dayResult] = await db.promise().query(
        "INSERT INTO SplitDays (split_id, day_number, day_title) VALUES (?, ?, ?)",
        [id, day.day_number, day.day_title]
      );
      const split_day_id = dayResult.insertId;

      for (const ex of day.exercise_details || []) {
        await db.promise().query(
          `INSERT INTO SplitDayExercises 
           (split_day_id, exercise_id, order_index, sets, reps, rest_time, notes) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            split_day_id,
            ex.exercise_id,
            ex.order_index || 0,
            ex.sets || 3,
            ex.reps || "8-12",
            ex.rest_time || "60",
            ex.notes || ""
          ]
        );
      }
    }

    res.json({ message: "Split updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while updating the split" });
  }
});
router.delete("/splits/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.promise().query(
      "DELETE FROM SplitDayExercises WHERE split_day_id IN (SELECT id FROM SplitDays WHERE split_id = ?)",
      [id]
    );
    await db.promise().query("DELETE FROM SplitDays WHERE split_id = ?", [id]);
    await db.promise().query("DELETE FROM SplitLibrary WHERE id = ?", [id]);

    res.json({ message: "Split deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while deleting the split" });
  }
});

module.exports = router;
