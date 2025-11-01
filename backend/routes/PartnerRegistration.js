const express = require("express");
const router = express.Router();
const db = require("../db");
const upload = require("../middleware/partnersUpload");

// --- Utility Helper ---
const query = (sql, params = []) => db.promise().query(sql, params);

// --- Generate Registration Number ---
const generateRegistrationNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `REG${timestamp}${random}`;
};

// --- Partner Registration Form Submission ---
router.post("/partner-registration", upload.single("profile_image_url"), async (req, res) => {
  try {
    const {
      gym_name,
      admin_name,
      email,
      password,
      address,
      system_type,
      package_id  // ← Added package_id
    } = req.body;

    // Validate required fields
    if (!gym_name || !admin_name || !email || !password || !address || !system_type) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }

    // Validate package_id is provided
    if (!package_id) {
      return res.status(400).json({ error: "Please select a package" });
    }

    // Check if email already exists in AdminAccounts
    const [[existingAdmin]] = await query(
      `SELECT id FROM AdminAccounts WHERE email = ?`,
      [email]
    );

    if (existingAdmin) {
      return res.status(400).json({ error: "Email already registered as a partner" });
    }

    // Check if email already has a pending registration
    const [[existingReg]] = await query(
      `SELECT registration_number FROM partner_registrations 
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
    const imagePath = req.file ? `/uploads/partners/${req.file.filename}` : null;

    // Insert into partner_registrations table (WITH package_id)
    await query(`
      INSERT INTO partner_registrations
      (registration_number, gym_name, admin_name, email, password, address, 
       system_type, package_id, profile_image_url, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `, [
      registrationNumber,
      gym_name,
      admin_name,
      email,
      password, // Store plain password for admin to process
      address,
      system_type,
      package_id,  // ← Added
      imagePath
    ]);

    res.status(201).json({
      message: "Registration submitted successfully",
      registration_number: registrationNumber
    });

  } catch (err) {
    console.error("Partner registration error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// --- Get Pending Registrations ---
router.get("/pending-registrations", async (req, res) => {
  try {
    // Get all pending registrations that haven't expired (within 1 hour)
    const [registrations] = await query(`
      SELECT 
        pr.id,
        pr.registration_number,
        pr.gym_name,
        pr.admin_name,
        pr.email,
        pr.password,
        pr.address,
        pr.system_type,
        pr.package_id,
        pr.profile_image_url,
        pr.status,
        pr.created_at,
        sp.name as package_name,
        sp.price as package_price,
        sp.duration_days as package_duration
      FROM partner_registrations pr
      LEFT JOIN SubscriptionPackages sp ON pr.package_id = sp.id
      WHERE pr.status = 'pending'
        AND pr.created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      ORDER BY pr.created_at DESC
    `);

    res.json(registrations);
  } catch (err) {
    console.error("Fetch registrations error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// --- Get Single Registration by Number ---
router.get("/pending-registrations/:registration_number", async (req, res) => {
  try {
    const { registration_number } = req.params;

    const [[registration]] = await query(`
      SELECT pr.*, 
             sp.name as package_name,
             sp.price as package_price,
             sp.duration_days as package_duration
      FROM partner_registrations pr
      LEFT JOIN SubscriptionPackages sp ON pr.package_id = sp.id
      WHERE pr.registration_number = ? AND pr.status = 'pending'
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

// --- Delete/Reject Registration ---
router.delete("/pending-registrations/:registration_number", async (req, res) => {
  try {
    const { registration_number } = req.params;

    const [result] = await query(`
      DELETE FROM partner_registrations
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

// --- Auto-cleanup Expired Registrations (optional cron job) ---
router.post("/cleanup-expired-registrations", async (req, res) => {
  try {
    const [result] = await query(`
      DELETE FROM partner_registrations
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

// --- Update Registration Status (when approved/converted to partner) ---
router.put("/pending-registrations/:registration_number/approve", async (req, res) => {
  try {
    const { registration_number } = req.params;

    const [result] = await query(`
      UPDATE partner_registrations
      SET status = 'approved', approved_at = NOW()
      WHERE registration_number = ? AND status = 'pending'
    `, [registration_number]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    res.json({ 
      success: true, 
      message: "Registration approved" 
    });
  } catch (err) {
    console.error("Approve registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/subscription-packages-with-items", async (req, res) => {
  try {
    const [packages] = await query(`
      SELECT id, name, description, price, duration_days, created_at
      FROM SubscriptionPackages
      ORDER BY price ASC, duration_days ASC
    `);

    for (let pkg of packages) {
      const [items] = await query(`
        SELECT item_name, quantity
        FROM PackageItems
        WHERE package_id = ?
        ORDER BY id ASC
      `, [pkg.id]);
      pkg.items = items;
    }

    res.json(packages);
  } catch (err) {
    console.error("Get packages with items error:", err);
    res.status(500).json({ error: "Failed to fetch packages" });
  }
});

module.exports = router;