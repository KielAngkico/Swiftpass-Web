    const express = require('express');
    const router = express.Router();
    const dbSuperAdmin = require('../db');

router.get('/daypass-guests', async (req, res) => {
  const { admin_id, system_type } = req.query;

  if (!admin_id) return res.status(400).json({ message: 'admin_id is required' });

  try {
    let query = `SELECT * FROM DayPassGuests WHERE admin_id = ?`;
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
  let imageUrl = g.profile_image_url
    ? `${baseURL}/${g.profile_image_url.replace(/^\//, "")}` // ✅ strips the leading /
    : `${baseURL}/uploads/members/default.jpg`;

  if (g.profile_image_url) {
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      url.pathname = pathParts.map(part => encodeURIComponent(part)).join('/');
      imageUrl = url.toString();
    } catch (e) {
      console.error('URL encoding error:', e);
    }
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