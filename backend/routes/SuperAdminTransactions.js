const express = require('express');
const router = express.Router();
const dbSuperAdmin = require('../db');

router.get('/superadmin-transactions', async (req, res) => {
  try {
    console.log('Fetching superadmin transactions...');
    const [transactions] = await dbSuperAdmin.promise().query(
      'SELECT * FROM SuperAdminTransactions ORDER BY created_at DESC'
    );
    console.log('Transactions fetched:', transactions.length);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching superadmin transactions:', error);
    res.status(500).json({
      error: 'Failed to fetch transactions',
      details: error.message
    });
  }
});

module.exports = router;
