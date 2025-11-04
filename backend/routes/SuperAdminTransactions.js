const express = require('express');
const router = express.Router();
const dbSuperAdmin = require('../db');

// GET all superadmin transactions
// This will be accessible at /api/superadmin-transactions
router.get('/superadmin-transactions', async (req, res) => {
  try {
    const [transactions] = await dbSuperAdmin.query(
      'SELECT * FROM SuperAdminTransactions ORDER BY created_at DESC'
    );
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching superadmin transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;