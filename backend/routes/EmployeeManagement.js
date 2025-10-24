const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");
const bcrypt = require("bcrypt");
const staffUpload = require("../middleware/staffupload");
const path = require("path");

// ➕ ADD EMPLOYEE
router.post("/add-employee", staffUpload.single("profile_image"), async (req, res) => {
  try {
    console.log("REQ.BODY:", req.body);
    console.log("REQ.FILE:", req.file);

    const { name, age, address, contact_number, email, password, admin_id, rfid_tag } = req.body;

    if (!name || !age || !address || !contact_number || !email || !password || !admin_id) {
      return res.status(400).json({ message: "All required fields must be filled." });
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email must be a valid Gmail address." });
    }

    // Check if email already exists
    const [existing] = await dbSuperAdmin
      .promise()
      .query("SELECT * FROM StaffAccounts WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists. Use a different one." });
    }

    // Check if RFID tag already exists (if provided)
    if (rfid_tag && rfid_tag.trim() !== "") {
      const [existingRfid] = await dbSuperAdmin
        .promise()
        .query("SELECT * FROM StaffAccounts WHERE rfid_tag = ? AND admin_id = ?", [rfid_tag, admin_id]);
      if (existingRfid.length > 0) {
        return res.status(400).json({ message: "RFID tag already assigned to another staff member." });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const profile_image_filename = req.file ? req.file.filename : null;

    const [result] = await dbSuperAdmin
      .promise()
      .query(
        `INSERT INTO StaffAccounts
          (admin_id, staff_name, age, address, contact_number, email, password, profile_image_url, rfid_tag, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          admin_id,
          name,
          age,
          address,
          contact_number,
          email,
          hashedPassword,
          profile_image_filename,
          rfid_tag || null
        ]
      );

    const profile_image_url = profile_image_filename
      ? `${req.protocol}://${req.get('host')}/uploads/staff/${profile_image_filename}`
      : null;

    res.status(200).json({
      message: "Employee added successfully!",
      id: result.insertId,
      profile_image_url,
      rfid_tag: rfid_tag || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error adding employee." });
  }
});

// ✏️ UPDATE EMPLOYEE
router.put("/update-employee/:id", staffUpload.single("profile_image"), async (req, res) => {
  const employeeId = req.params.id;

  try {
    const {
      name,
      age,
      address,
      contact_number,
      email,
      password
    } = req.body;

    // Get current employee data
    const [currentEmployee] = await dbSuperAdmin.promise().query(
      `SELECT * FROM StaffAccounts WHERE id = ?`,
      [employeeId]
    );

    if (currentEmployee.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Check if email is being changed and already exists for another employee
    if (email !== currentEmployee[0].email) {
      const [existingEmail] = await dbSuperAdmin.promise().query(
        "SELECT * FROM StaffAccounts WHERE email = ? AND id != ?",
        [email, employeeId]
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({ message: "Email already exists. Use a different one." });
      }
    }

    // Handle profile image
    let imagePath = currentEmployee[0].profile_image_url;
    if (req.file) {
      imagePath = req.file.filename;
    }

    // Handle password
    let hashedPassword = currentEmployee[0].password;
    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Update employee (RFID is NOT updated here - use replace-employee-rfid endpoint)
    const updateSql = `
      UPDATE StaffAccounts
      SET staff_name = ?, age = ?, email = ?, address = ?, 
          contact_number = ?, profile_image_url = ?, password = ?
      WHERE id = ?
    `;

    await dbSuperAdmin.promise().query(updateSql, [
      name,
      age,
      email,
      address,
      contact_number,
      imagePath,
      hashedPassword,
      employeeId
    ]);

    const profile_image_url = imagePath
      ? `${req.protocol}://${req.get('host')}/uploads/staff/${imagePath}`
      : null;

    res.json({
      message: "Employee updated successfully",
      profile_image_url
    });

  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 🔄 REPLACE EMPLOYEE RFID
router.put("/replace-employee-rfid/:id", async (req, res) => {
  const employeeId = req.params.id;
  const { new_rfid_tag } = req.body;

  try {
    // Get current employee data
    const [currentEmployee] = await dbSuperAdmin.promise().query(
      "SELECT rfid_tag, admin_id FROM StaffAccounts WHERE id = ?",
      [employeeId]
    );

    if (currentEmployee.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const oldRfid = currentEmployee[0].rfid_tag;
    const adminId = currentEmployee[0].admin_id;

    // Check if new RFID is already in use by another employee under same admin
    if (new_rfid_tag && new_rfid_tag.trim() !== "") {
      const [existingRfid] = await dbSuperAdmin.promise().query(
        "SELECT * FROM StaffAccounts WHERE rfid_tag = ? AND admin_id = ? AND id != ?",
        [new_rfid_tag, adminId, employeeId]
      );
      if (existingRfid.length > 0) {
        return res.status(400).json({ 
          error: "RFID tag already assigned to another staff member under this admin." 
        });
      }
    }

    // Update RFID with tracking
    const updateSql = `
      UPDATE StaffAccounts
      SET
        previous_rfid = ?,
        rfid_tag = ?,
        replaced_by = ?,
        replaced_at = NOW()
      WHERE id = ?
    `;

    await dbSuperAdmin.promise().query(updateSql, [
      oldRfid,           // Move current to previous_rfid
      new_rfid_tag || null,  // New RFID (can be null if removing)
      "Admin",           // replaced_by = "Admin"
      employeeId
    ]);

    res.json({
      message: "RFID replaced successfully",
      old_rfid: oldRfid,
      new_rfid: new_rfid_tag || null,
      replaced_by: "Admin"
    });

  } catch (error) {
    console.error("Replace RFID error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 📋 GET EMPLOYEES
router.get("/get-employees/:admin_id", (req, res) => {
  const adminId = req.params.admin_id;

  const sql = `
    SELECT id AS user_id, staff_name AS name, age, address, contact_number, email, profile_image_url, rfid_tag
    FROM StaffAccounts
    WHERE admin_id = ? AND status = 'active'
  `;

  dbSuperAdmin.query(sql, [adminId], (err, results) => {
    if (err) {
      console.error("Error fetching employees from SuperAdmin DB:", err);
      return res.status(500).json({ message: "Internal server error while fetching employees." });
    }

    const employeesWithImages = results.map(emp => {
      let imageUrl = null;

      if (emp.profile_image_url) {
        imageUrl = `${req.protocol}://${req.get('host')}/uploads/staff/${emp.profile_image_url}`;
      }

      console.log(`Employee ${emp.name}: DB value = ${emp.profile_image_url}, Final URL = ${imageUrl}`);

      return {
        ...emp,
        profile_image_url: imageUrl
      };
    });

    return res.status(200).json({ employees: employeesWithImages });
  });
});

// 🗑️ DELETE EMPLOYEE (Archive)
router.delete('/staff/:id', (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    console.error("Error: Invalid staff ID received:", id);
    return res.status(400).json({ message: "Invalid staff ID provided." });
  }

  console.log(`Processing deletion for staff ID: ${id}`);

  const getStaffQuery = "SELECT * FROM StaffAccounts WHERE id = ?";
  dbSuperAdmin.query(getStaffQuery, [id], (err, results) => {
    if (err) {
      console.error("Error fetching staff:", err);
      return res.status(500).json({ message: "Internal server error while fetching staff data." });
    }

    if (results.length === 0) {
      console.warn(`Staff ID ${id} not found.`);
      return res.status(404).json({ message: "Staff not found." });
    }

    const staff = results[0];

    const archiveQuery = `
      INSERT INTO StaffAccounts_Archived
        (id, admin_id, staff_name, age, contact_number, address, email, password, profile_image_url, rfid_tag, status, created_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    dbSuperAdmin.query(
      archiveQuery,
      [
        staff.id,
        staff.admin_id,
        staff.staff_name,
        staff.age,
        staff.contact_number,
        staff.address,
        staff.email,
        staff.password,
        staff.profile_image_url,
        staff.rfid_tag || null,
        'inactive',
        staff.created_at
      ],
      (err) => {
        if (err) {
          console.error("Error archiving staff:", err);
          return res.status(500).json({ message: "Error archiving staff. Possible duplicate ID or missing table." });
        }

        const deleteQuery = "DELETE FROM StaffAccounts WHERE id = ?";
        dbSuperAdmin.query(deleteQuery, [id], (err, deleteResults) => {
          if (err) {
            console.error("Error deleting staff:", err);
            return res.status(500).json({ message: "Error deleting staff. Possible constraint issue." });
          }

          console.log(`Staff ID ${id} successfully archived and deleted.`);
          res.status(200).json({ message: "Staff successfully archived and deleted." });
        });
      }
    );
  });
});

router.get("/staff-session-logs/:admin_id", async (req, res) => {
  const { admin_id } = req.params;

  try {
    const [logs] = await dbSuperAdmin.promise().query(
      `SELECT id, staff_id, staff_name, admin_id, system_type, status, login_time, logout_time
       FROM StaffSessionLogs
       WHERE admin_id = ?
       ORDER BY login_time DESC
       LIMIT 100`,
      [admin_id]
    );

    res.json({ logs });
  } catch (error) {
    console.error("Error fetching staff session logs:", error);
    res.status(500).json({ message: "Failed to fetch session logs" });
  }
});
router.get("/staff-activity-logs/:admin_id", async (req, res) => {
  const { admin_id } = req.params;

  try {
    const [logs] = await dbSuperAdmin.promise().query(
      `SELECT 
        id, 
        rfid_tag, 
        staff_id, 
        staff_name, 
        admin_id, 
        location, 
        activity_type, 
        timestamp
       FROM StaffActivityLogs
       WHERE admin_id = ?
       ORDER BY timestamp DESC
       LIMIT 500`,
      [admin_id]
    );

    res.json({ logs });
  } catch (error) {
    console.error("Error fetching staff activity logs:", error);
    res.status(500).json({ message: "Failed to fetch activity logs" });
  }
});
router.put('/staff/:id/archive', async (req, res) => {
  const { id } = req.params;

  try {
    // Get staff data
    const [staff] = await dbSuperAdmin.promise().query(
      "SELECT * FROM StaffAccounts WHERE id = ?",
      [id]
    );

    if (staff.length === 0) {
      return res.status(404).json({ message: "Staff not found." });
    }

    const staffData = staff[0];

    // Insert into archive table
    await dbSuperAdmin.promise().query(
      `INSERT INTO StaffAccounts_Archived
        (id, admin_id, staff_name, age, contact_number, address, email, password, profile_image_url, rfid_tag, status, created_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'archived', ?, NOW())`,
      [
        staffData.id,
        staffData.admin_id,
        staffData.staff_name,
        staffData.age,
        staffData.contact_number,
        staffData.address,
        staffData.email,
        staffData.password,
        staffData.profile_image_url,
        staffData.rfid_tag,
        staffData.created_at
      ]
    );

    // Delete from active table
    await dbSuperAdmin.promise().query(
      "DELETE FROM StaffAccounts WHERE id = ?",
      [id]
    );

    console.log(`✅ Staff ID ${id} archived successfully`);
    res.json({ message: "Staff archived successfully" });

  } catch (error) {
    console.error("Archive staff error:", error);
    res.status(500).json({ message: "Error archiving staff" });
  }
});

// 🔄 RESTORE EMPLOYEE (move from archive back to active)
router.put('/staff/:id/restore', async (req, res) => {
  const { id } = req.params;

  try {
    // Get archived staff data
    const [staff] = await dbSuperAdmin.promise().query(
      "SELECT * FROM StaffAccounts_Archived WHERE id = ?",
      [id]
    );

    if (staff.length === 0) {
      return res.status(404).json({ message: "Archived staff not found." });
    }

    const staffData = staff[0];

    // Check if email already exists in active table
    const [existingEmail] = await dbSuperAdmin.promise().query(
      "SELECT * FROM StaffAccounts WHERE email = ?",
      [staffData.email]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({ 
        message: "Cannot restore: Email already exists in active staff." 
      });
    }

    // Check if RFID already exists in active table
    if (staffData.rfid_tag) {
      const [existingRfid] = await dbSuperAdmin.promise().query(
        "SELECT * FROM StaffAccounts WHERE rfid_tag = ? AND admin_id = ?",
        [staffData.rfid_tag, staffData.admin_id]
      );

      if (existingRfid.length > 0) {
        return res.status(400).json({ 
          message: "Cannot restore: RFID tag already assigned to another active staff." 
        });
      }
    }

    // Restore to active table
    await dbSuperAdmin.promise().query(
      `INSERT INTO StaffAccounts
        (id, admin_id, staff_name, age, contact_number, address, email, password, profile_image_url, rfid_tag, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        staffData.id,
        staffData.admin_id,
        staffData.staff_name,
        staffData.age,
        staffData.contact_number,
        staffData.address,
        staffData.email,
        staffData.password,
        staffData.profile_image_url,
        staffData.rfid_tag,
        staffData.created_at
      ]
    );

    // Remove from archive
    await dbSuperAdmin.promise().query(
      "DELETE FROM StaffAccounts_Archived WHERE id = ?",
      [id]
    );

    console.log(`✅ Staff ID ${id} restored successfully`);
    res.json({ message: "Staff restored successfully" });

  } catch (error) {
    console.error("Restore staff error:", error);
    res.status(500).json({ message: "Error restoring staff" });
  }
});

// 🗑️ PERMANENT DELETE (delete from archive)
router.delete('/staff/:id/permanent', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await dbSuperAdmin.promise().query(
      "DELETE FROM StaffAccounts_Archived WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Archived staff not found." });
    }

    console.log(`✅ Staff ID ${id} permanently deleted`);
    res.json({ message: "Staff permanently deleted" });

  } catch (error) {
    console.error("Permanent delete error:", error);
    res.status(500).json({ message: "Error deleting staff permanently" });
  }
});

// 📋 GET ARCHIVED EMPLOYEES
router.get("/get-archived-employees/:admin_id", async (req, res) => {
  const adminId = req.params.admin_id;

  try {
    const [results] = await dbSuperAdmin.promise().query(
      `SELECT 
        id AS user_id, 
        staff_name AS name, 
        age, 
        address, 
        contact_number, 
        email, 
        profile_image_url, 
        rfid_tag,
        archived_at
      FROM StaffAccounts_Archived
      WHERE admin_id = ?
      ORDER BY archived_at DESC`,
      [adminId]
    );

    const employeesWithImages = results.map(emp => {
      let imageUrl = null;
      if (emp.profile_image_url) {
        imageUrl = `${req.protocol}://${req.get('host')}/uploads/staff/${emp.profile_image_url}`;
      }
      return {
        ...emp,
        profile_image_url: imageUrl
      };
    });

    res.json({ employees: employeesWithImages });

  } catch (error) {
    console.error("Error fetching archived employees:", error);
    res.status(500).json({ message: "Failed to fetch archived employees" });
  }
});

// ✏️ UPDATE the existing DELETE route to use ARCHIVE instead
router.delete('/staff/:id', async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    console.error("Error: Invalid staff ID received:", id);
    return res.status(400).json({ message: "Invalid staff ID provided." });
  }

  console.log(`⚠️ Note: DELETE /staff/${id} now archives instead of deleting. Use /staff/${id}/permanent for permanent deletion.`);

  try {
    // Get staff data
    const [staff] = await dbSuperAdmin.promise().query(
      "SELECT * FROM StaffAccounts WHERE id = ?",
      [id]
    );

    if (staff.length === 0) {
      return res.status(404).json({ message: "Staff not found." });
    }

    const staffData = staff[0];

    // Archive the staff
    await dbSuperAdmin.promise().query(
      `INSERT INTO StaffAccounts_Archived
        (id, admin_id, staff_name, age, contact_number, address, email, password, profile_image_url, rfid_tag, status, created_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'archived', ?, NOW())`,
      [
        staffData.id,
        staffData.admin_id,
        staffData.staff_name,
        staffData.age,
        staffData.contact_number,
        staffData.address,
        staffData.email,
        staffData.password,
        staffData.profile_image_url,
        staffData.rfid_tag,
        staffData.created_at
      ]
    );

    // Delete from active table
    await dbSuperAdmin.promise().query(
      "DELETE FROM StaffAccounts WHERE id = ?",
      [id]
    );

    console.log(`✅ Staff ID ${id} archived (via DELETE endpoint)`);
    res.json({ message: "Staff archived successfully" });

  } catch (error) {
    console.error("Archive staff error:", error);
    res.status(500).json({ message: "Error archiving staff" });
  }
});
module.exports = router;
