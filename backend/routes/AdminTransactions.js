const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");


router.get("/get-admin-transactions/:admin_id", async (req, res) => {
  const { admin_id } = req.params;

  try {
    const [rows] = await dbSuperAdmin.promise().query(
      `SELECT * FROM AdminTransactions WHERE admin_id = ? ORDER BY transaction_date DESC`,
      [admin_id]
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error fetching admin transactions:", err);
    res.status(500).json({ message: "Server error while fetching transactions." });
  }
});

module.exports = router;
