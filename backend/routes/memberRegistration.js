const express = require("express");
const router = express.Router();
const db = require("../db");

// --- Utility Helper ---
const query = (sql, params = []) => db.promise().query(sql, params);

// --- Generate Registration Number ---
const generateRegistrationNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `MEM${timestamp}${random}`;
};

// --- Get Available Gyms ---
router.get("/available-gyms", async (req, res) => {
  try {
    const [gyms] = await query(`
      SELECT id, gym_name, admin_name, address, system_type
      FROM AdminAccounts
      WHERE is_archived = 0 AND status = 'active'
      ORDER BY gym_name ASC
    `);

    res.json(gyms);
  } catch (err) {
    console.error("Get gyms error:", err);
    res.status(500).json({ error: "Failed to fetch gyms" });
  }
});
router.get("/available-gyms", async (req, res) => {
  try {
    const [gyms] = await query(`
      SELECT id, gym_name, admin_name, address, system_type, gym_code
      FROM AdminAccounts
      WHERE is_archived = 0 AND status = 'active'
      ORDER BY gym_name ASC
    `);
    res.json(gyms);
  } catch (err) {
    console.error("Get gyms error:", err);
    res.status(500).json({ error: "Failed to fetch gyms" });
  }
});

// --- Lookup Gym by Code ---
router.get("/gym-by-code/:gym_code", async (req, res) => {
  try {
    const { gym_code } = req.params;

    const [[gym]] = await query(`
      SELECT id, gym_name, admin_name, address, system_type, gym_code
      FROM AdminAccounts
      WHERE gym_code = ? AND is_archived = 0 AND status = 'active'
    `, [gym_code.toUpperCase()]);

    if (!gym) {
      return res.status(404).json({ error: "Gym code not found" });
    }

    res.json(gym);
  } catch (err) {
    console.error("Gym lookup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// --- Member Registration Form Submission ---
router.post("/member-registration", async (req, res) => {
  try {
    const {
      full_name,
      gender,
      age,
      phone_number,
      email,
      password,
      emergency_contact_person,
      emergency_contact_number,
      emergency_contact_relationship,
      admin_id
    } = req.body;

    // Validate required fields
    if (!full_name || !gender || !age || !phone_number || !email || !password || !admin_id) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    // Check if email already exists in MembersAccounts
    const [[existingMember]] = await query(
      `SELECT id FROM MembersAccounts WHERE email = ?`,
      [email]
    );

    if (existingMember) {
      return res.status(400).json({ error: "Email already registered as a member" });
    }

    // Check if email already has a pending registration
    const [[existingReg]] = await query(
      `SELECT registration_number FROM member_registrations
       WHERE email = ? AND status = 'pending'
       AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [email]
    );

    if (existingReg) {
      return res.status(400).json({
        error: "You already have a pending registration",
        registration_number: existingReg.registration_number
      });
    }

    const registrationNumber = generateRegistrationNumber();

    // Insert into member_registrations table
    await query(`
      INSERT INTO member_registrations
      (registration_number, full_name, gender, age, phone_number, email, password,
       emergency_contact_person, emergency_contact_number, emergency_contact_relationship,
       admin_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `, [
      registrationNumber,
      full_name,
      gender,
      age,
      phone_number,
      email,
      password, // Store plain password for admin to process
      emergency_contact_person || null,
      emergency_contact_number || null,
      emergency_contact_relationship || null,
      admin_id
    ]);

    res.status(201).json({
      message: "Registration submitted successfully",
      registration_number: registrationNumber
    });

  } catch (err) {
    console.error("Member registration error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// --- Get Pending Member Registrations ---
// --- Get Pending Member Registrations ---
router.get("/pending-member-registrations", async (req, res) => {
  try {
    const { admin_id, system_type } = req.query;

    let sql = `
      SELECT
        mr.id, mr.registration_number, mr.full_name, mr.gender, mr.age,
        mr.phone_number, mr.email, mr.password,
        mr.emergency_contact_person, mr.emergency_contact_number,
        mr.emergency_contact_relationship, mr.admin_id, mr.status, mr.created_at,
        aa.gym_name, aa.admin_name, aa.system_type
      FROM member_registrations mr
      INNER JOIN AdminAccounts aa ON mr.admin_id = aa.id
      WHERE mr.status = 'pending'
        AND mr.created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `;

    const params = [];

    if (admin_id) {
      sql += ` AND mr.admin_id = ?`;
      params.push(admin_id);
    }

    if (system_type) {
      sql += ` AND aa.system_type = ?`;
      params.push(system_type);
    }

    sql += ` ORDER BY mr.created_at DESC`;

    const [registrations] = await query(sql, params);
    res.json(registrations);
  } catch (err) {
    console.error("Fetch member registrations error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// --- Get Single Pending Registration ---
router.get("/pending-member-registrations/:registration_number", async (req, res) => {
  try {
    const { registration_number } = req.params;

    const [[registration]] = await query(`
      SELECT mr.*,
             aa.gym_name,
             aa.admin_name,
             aa.system_type
      FROM member_registrations mr
      INNER JOIN AdminAccounts aa ON mr.admin_id = aa.id
      WHERE mr.registration_number = ? AND mr.status = 'pending'
    `, [registration_number]);

    if (!registration) {
      return res.status(404).json({ error: "Registration not found or expired" });
    }

    res.json(registration);
  } catch (err) {
    console.error("Fetch registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Delete Pending Registration ---
router.delete("/pending-member-registrations/:registration_number", async (req, res) => {
  try {
    const { registration_number } = req.params;

    const [result] = await query(`
      DELETE FROM member_registrations
      WHERE registration_number = ?
    `, [registration_number]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    res.json({
      success: true,
      message: "Registration deleted successfully"
    });
  } catch (err) {
    console.error("Delete registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Cleanup Expired Registrations ---
router.post("/cleanup-expired-member-registrations", async (req, res) => {
  try {
    const [result] = await query(`
      DELETE FROM member_registrations
      WHERE status = 'pending'
        AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `);

    res.json({
      message: "Cleanup completed",
      deleted_count: result.affectedRows
    });
  } catch (err) {
    console.error("Cleanup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;