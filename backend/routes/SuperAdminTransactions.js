const express = require("express");
const router = express.Router();
const db = require("./db"); // Adjust path to your database connection

// GET all SuperAdmin transactions
router.get("/api-superadmintransactions", async (req, res) => {
  try {
    const query = `
      SELECT 
        sat.*,
        aa.name as admin_name,
        aa.gym_name
      FROM SuperAdminTransactions sat
      LEFT JOIN AdminAccounts aa ON sat.admin_id = aa.id
      ORDER BY sat.created_at DESC
    `;
    
    const [transactions] = await db.query(query);
    res.json(transactions);
  } catch (error) {
    console.error("Error fetching SuperAdmin transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// GET transactions by admin_id (optional, if needed)
router.get("/api-superadmintransactions/:admin_id", async (req, res) => {
  try {
    const { admin_id } = req.params;
    
    const query = `
      SELECT 
        sat.*,
        aa.name as admin_name,
        aa.gym_name
      FROM SuperAdminTransactions sat
      LEFT JOIN AdminAccounts aa ON sat.admin_id = aa.id
      WHERE sat.admin_id = ?
      ORDER BY sat.created_at DESC
    `;
    
    const [transactions] = await db.query(query, [admin_id]);
    res.json(transactions);
  } catch (error) {
    console.error("Error fetching admin transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// POST create new SuperAdmin transaction
router.post("/api-superadmintransactions", async (req, res) => {
  try {
    const {
      admin_id,
      order_id,
      transaction_type,
      amount,
      payment_method,
      reference_number
    } = req.body;

    // Validate required fields
    if (!admin_id || !transaction_type || !amount) {
      return res.status(400).json({ 
        error: "admin_id, transaction_type, and amount are required" 
      });
    }

    const query = `
      INSERT INTO SuperAdminTransactions 
      (admin_id, order_id, transaction_type, amount, payment_method, reference_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      admin_id,
      order_id || null,
      transaction_type,
      amount,
      payment_method || 'cash',
      reference_number || null
    ]);

    res.status(201).json({
      message: "Transaction created successfully",
      transaction_id: result.insertId
    });
  } catch (error) {
    console.error("Error creating SuperAdmin transaction:", error);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// GET transaction statistics (optional)
router.get("/api-superadmintransactions/stats/summary", async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_revenue,
        SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_revenue,
        SUM(CASE WHEN payment_method != 'cash' THEN amount ELSE 0 END) as cashless_revenue,
        COUNT(DISTINCT admin_id) as unique_admins
      FROM SuperAdminTransactions
    `;
    
    const [stats] = await db.query(query);
    res.json(stats[0]);
  } catch (error) {
    console.error("Error fetching transaction stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

module.exports = router;