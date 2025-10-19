const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");
const bcrypt = require("bcrypt");
const staffUpload = require("../middleware/staffupload");
const path = require("path");

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

    // ✅ NEW: Check if RFID tag already exists (if provided)
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

    // ✅ UPDATED: Include rfid_tag in INSERT
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
          rfid_tag || null  // Store null if empty
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

router.get("/get-employees/:admin_id", (req, res) => {
    const adminId = req.params.admin_id;

    // ✅ UPDATED: Include rfid_tag in SELECT
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
                imageUrl = `${req.protocol}://${req.get('host')}${emp.profile_image_url}`;
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

    // ✅ UPDATED: Include rfid_tag in archive
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
        staff.rfid_tag || null,  // ✅ Include RFID tag
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

module.exports = router;
