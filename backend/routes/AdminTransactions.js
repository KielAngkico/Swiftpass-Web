const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");

router.get("/get-admin-transactions/:admin_id", async (req, res) => {
  const { admin_id } = req.params;
  const { start_date, end_date } = req.query;

  try {
    let query = `SELECT * FROM AdminTransactions WHERE admin_id = ?`;
    const params = [admin_id];

    if (start_date && end_date) {
      query += ` AND DATE(transaction_date) BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }

    query += ` ORDER BY transaction_date DESC`;

    const [rows] = await dbSuperAdmin.promise().query(query, params);

    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error fetching admin transactions:", err);
    res.status(500).json({ message: "Server error while fetching transactions." });
  }
});

module.exports = router;

