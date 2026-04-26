const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticateJWT } = require("../middleware/auth");
const { logAudit } = require("../middleware/auditLogger");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const role = req.user?.role;
    const folder = role === "staff" ? "uploads/staff" : "uploads/partners";
    const uploadPath = path.join(__dirname, "../../public", folder);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.role}_${req.user.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const valid =
      allowed.test(path.extname(file.originalname).toLowerCase()) &&
      allowed.test(file.mimetype);
    valid ? cb(null, true) : cb(new Error("Only image files are allowed"));
  },
});

router.get("/profile", authenticateJWT, async (req, res) => {
  const { id, role } = req.user;

  try {
    let user = null;

    if (role === "superadmin") {
      const [rows] = await dbSuperAdmin.promise().query(
        `SELECT id, superadmin_name AS name, email, created_at
         FROM SuperAdminAccounts WHERE id = ?`,
        [id]
      );
      if (rows.length) user = { ...rows[0], role };

    } else if (role === "admin") {
      const [rows] = await dbSuperAdmin.promise().query(
        `SELECT id, admin_name AS name, age, email, address,
                gym_name, system_type, profile_image_url,
                status, created_at
         FROM AdminAccounts WHERE id = ? AND is_archived = 0`,
        [id]
      );
      if (rows.length) user = { ...rows[0], role };

    } else if (role === "staff") {
      const [rows] = await dbSuperAdmin.promise().query(
        `SELECT s.id, s.staff_name AS name, s.age, s.email,
                s.contact_number, s.address, s.profile_image_url,
                s.status, s.created_at,
                a.admin_name AS admin_name, a.gym_name
         FROM StaffAccounts s
         INNER JOIN AdminAccounts a ON s.admin_id = a.id
         WHERE s.id = ? AND a.is_archived = 0`,
        [id]
      );
      if (rows.length) user = { ...rows[0], role };
    }

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ success: true, user });
  } catch (err) {
    console.error("GET /profile error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/profile/update", authenticateJWT, upload.single("profile_image"), async (req, res) => {
  const { id, role } = req.user;
  const { name, age, address, contact_number } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }

  try {
    let imageUrl = null;

    if (req.file) {
      const folder = role === "staff" ? "uploads/staff" : "uploads/partners";
      imageUrl = `/${folder}/${req.file.filename}`;
    }

    if (role === "superadmin") {
      await dbSuperAdmin.promise().query(
        `UPDATE SuperAdminAccounts SET superadmin_name = ? WHERE id = ?`,
        [name.trim(), id]
      );

    } else if (role === "admin") {
      const fields = [`admin_name = ?`];
      const values = [name.trim()];

      if (age)      { fields.push("age = ?");               values.push(age); }
      if (address)  { fields.push("address = ?");           values.push(address); }
      if (imageUrl) { fields.push("profile_image_url = ?"); values.push(imageUrl); }

      values.push(id);
      await dbSuperAdmin.promise().query(
        `UPDATE AdminAccounts SET ${fields.join(", ")} WHERE id = ?`,
        values
      );

    } else if (role === "staff") {
      const fields = [`staff_name = ?`];
      const values = [name.trim()];

      if (age)            { fields.push("age = ?");               values.push(age); }
      if (address)        { fields.push("address = ?");           values.push(address); }
      if (contact_number) { fields.push("contact_number = ?");    values.push(contact_number); }
      if (imageUrl)       { fields.push("profile_image_url = ?"); values.push(imageUrl); }

      values.push(id);
      await dbSuperAdmin.promise().query(
        `UPDATE StaffAccounts SET ${fields.join(", ")} WHERE id = ?`,
        values
      );
    }

    let updatedRows = [];

    if (role === "superadmin") {
      [updatedRows] = await dbSuperAdmin.promise().query(
        `SELECT id, superadmin_name AS name, email, created_at
         FROM SuperAdminAccounts WHERE id = ?`,
        [id]
      );
    } else if (role === "admin") {
      [updatedRows] = await dbSuperAdmin.promise().query(
        `SELECT id, admin_name AS name, age, email, address,
                gym_name, system_type, profile_image_url, status, created_at
         FROM AdminAccounts WHERE id = ?`,
        [id]
      );
    } else if (role === "staff") {
      [updatedRows] = await dbSuperAdmin.promise().query(
        `SELECT s.id, s.staff_name AS name, s.age, s.email,
                s.contact_number, s.address, s.profile_image_url,
                s.status, s.created_at,
                a.admin_name AS admin_name, a.gym_name
         FROM StaffAccounts s
         INNER JOIN AdminAccounts a ON s.admin_id = a.id
         WHERE s.id = ?`,
        [id]
      );
    }

    await logAudit({
      req,
      action: "UPDATE",
      module: "Profile",
      target: name.trim(),
      target_id: id,
      description: `Updated profile of ${name.trim()}`,
      payload: req.body,
    });

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: { ...updatedRows[0], role },
    });

  } catch (err) {
    console.error("PUT /profile/update error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;