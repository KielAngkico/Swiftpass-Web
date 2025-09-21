const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db"); 
const bcrypt = require('bcrypt');
const partnerUpload = require("../middleware/partnersUpload");

router.post("/add-client", partnerUpload.single("profile_image_url"), async (req, res) => {
  try {
    const { admin_name, age, email, password, address, gym_name, system_type, session_fee } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const imagePath = req.file ? `/uploads/partners/${req.file.filename}` : null;

    const insertAdminSql = `
      INSERT INTO AdminAccounts 
      (admin_name, age, email, password, address, gym_name, system_type, session_fee, profile_image_url, is_archived)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `;

    dbSuperAdmin.query(
      insertAdminSql,
      [
        admin_name,
        age,
        email,
        hashedPassword,
        address,
        gym_name,
        system_type,
        session_fee,
        imagePath
      ],
      (err, result) => {
        if (err) {
          console.error("Error adding client:", err);
          return res.status(500).json({ error: "Database error" });
        }

        const admin_id = result.insertId;

        // Always insert a default Cash method
        const cashMethodSql = `
          INSERT INTO AdminPaymentMethods (admin_id, name, is_default, is_enabled)
          VALUES (?, 'Cash', 1, 1)
        `;

        dbSuperAdmin.query(cashMethodSql, [admin_id], (cashErr) => {
          if (cashErr) {
            console.error("Error adding default Cash method:", cashErr);
          }
        });

        if (system_type === "prepaid_entry") {
          const pricingSql = `
            INSERT INTO AdminPricingOptions 
            (admin_id, system_type, plan_name, amount_to_pay, amount_to_credit, duration_in_days, is_deletable)
            VALUES (?, 'prepaid_entry', 'Daily Session', ?, NULL, NULL, FALSE)
          `;
          dbSuperAdmin.query(pricingSql, [admin_id, session_fee], (pricingErr) => {
            if (pricingErr) {
              console.error("Error adding daily session pricing:", pricingErr);
              return res.status(500).json({ error: "Pricing setup failed" });
            }

            return res.status(201).json({ message: "Client and pricing added successfully", id: admin_id });
          });
        } else {
          return res.status(201).json({ message: "Client added successfully (no daily pricing needed)", id: admin_id });
        }
      }
    );
  } catch (error) {
    console.error("Error hashing password:", error);
    res.status(500).json({ error: "Password hashing failed" });
  }
});





router.get('/admins', (req, res) => {
  const sql = 'SELECT id, admin_name, age, email, address, gym_name, system_type, session_fee, profile_image_url, is_archived FROM AdminAccounts ORDER BY is_archived ASC, admin_name ASC';
  
  dbSuperAdmin.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching admins:', err);
      res.status(500).json({ error: 'Database error' });
    } else {
      res.json(results);
    }
  });
});

router.put('/archive-admin/:id', (req, res) => {
  const adminId = req.params.id;

  const archiveSql = `UPDATE AdminAccounts SET is_archived = 1 WHERE id = ? AND is_archived = 0`;

  dbSuperAdmin.query(archiveSql, [adminId], (err, result) => {
    if (err) {
      console.error('Error archiving admin:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin not found or already archived' });
    }

    res.json({ message: 'Admin archived successfully' });
  });
});

router.put('/restore-admin/:id', (req, res) => {
  const adminId = req.params.id;

  const restoreSql = `UPDATE AdminAccounts SET is_archived = 0 WHERE id = ? AND is_archived = 1`;

  dbSuperAdmin.query(restoreSql, [adminId], (err, result) => {
    if (err) {
      console.error('Error restoring admin:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin not found or not archived' });
    }

    res.json({ message: 'Admin restored successfully' });
  });
});

router.get('/admins/active', (req, res) => {
  const sql = 'SELECT * FROM AdminAccounts WHERE is_archived = 0 ORDER BY admin_name ASC';
  
  dbSuperAdmin.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching active admins:', err);
      res.status(500).json({ error: 'Database error' });
    } else {
      res.json(results);
    }
  });
});

router.get('/admins/archived', (req, res) => {
  const sql = 'SELECT * FROM AdminAccounts WHERE is_archived = 1 ORDER BY admin_name ASC';
  
  dbSuperAdmin.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching archived admins:', err);
      res.status(500).json({ error: 'Database error' });
    } else {
      res.json(results);
    }
  });
});

router.delete('/delete-admin-permanently/:id', (req, res) => {
  const adminId = req.params.id;

  const checkSql = 'SELECT * FROM AdminAccounts WHERE id = ? AND is_archived = 1';
  
  dbSuperAdmin.query(checkSql, [adminId], (err, results) => {
    if (err) {
      console.error('Error checking admin:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Admin not found or not archived' });
    }

    const admin = results[0];
    const archiveSql = `
      INSERT INTO AdminsAccounts_Archived 
      (original_id, admin_name, age, email, address, gym_name, system_type, session_fee, archived_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    dbSuperAdmin.query(archiveSql, [
      admin.id, admin.admin_name, admin.age, admin.email, 
      admin.address, admin.gym_name, admin.system_type, admin.session_fee
    ], (archiveErr) => {
      if (archiveErr) {
        console.error('Error moving to archive:', archiveErr);
        return res.status(500).json({ error: 'Archive operation failed' });
      }

      const deleteSql = 'DELETE FROM AdminAccounts WHERE id = ?';
      dbSuperAdmin.query(deleteSql, [adminId], (deleteErr) => {
        if (deleteErr) {
          console.error('Error deleting admin permanently:', deleteErr);
          return res.status(500).json({ error: 'Delete operation failed' });
        }

        res.json({ message: 'Admin permanently deleted and moved to archive' });
      });
    });
  });
});

module.exports = router;