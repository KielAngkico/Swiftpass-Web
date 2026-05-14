    const express = require('express');
    const router = express.Router();
    const dbSuperAdmin = require('../db');

router.get('/daypass-guests', async (req, res) => {
  const { admin_id, system_type } = req.query;

  if (!admin_id) return res.status(400).json({ message: 'admin_id is required' });

  try {
    let query = `
  SELECT g.*, r.customer_number_display
  FROM DayPassGuests g
  LEFT JOIN RegisteredRfid r ON r.rfid_tag = g.rfid_tag AND r.role = 'DayPass'
  WHERE g.admin_id = ?`;
    const params = [admin_id];

    if (system_type) {
      query += ` AND system_type = ?`;
      params.push(system_type);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await dbSuperAdmin.promise().query(query, params);

    // ✅ Same pattern as get-members
    const baseURL = `${req.protocol}://${req.get("host")}`;

const guests = rows.map((g) => {
let imageUrl;

if (!g.profile_image_url) {
  imageUrl = `${baseURL}/uploads/members/default.jpg`;
} else if (g.profile_image_url.startsWith("http")) {
  imageUrl = g.profile_image_url; // already a full URL, use as-is
} else {
  imageUrl = `${baseURL}/${g.profile_image_url.replace(/^\//, "")}`; // relative path, prepend server
}

      return {
        ...g,
        profile_image_url: imageUrl,
      };
    });

    return res.json({ guests });
  } catch (error) {
    console.error('❌ ViewDayPassGuests error:', error);
    return res.status(500).json({ message: 'Failed to fetch day pass guests.' });
  }
});

    module.exports = router;