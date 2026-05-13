const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");
const path = require("path");

router.get("/get-members", async (req, res) => {
  const { admin_id } = req.query;

  if (!admin_id) {
    return res.status(400).json({ message: "Admin ID is required" });
  }

  try {
const [members] = await dbSuperAdmin
      .promise()
      .query(
        `SELECT m.*, r.customer_number_display
         FROM MembersAccounts m
         LEFT JOIN RegisteredRfid r ON r.rfid_tag = m.rfid_tag AND r.role = 'Member'
         WHERE m.admin_id = ?
         ORDER BY m.created_at DESC`,
        [admin_id]
      );
      
    
    const baseURL = `${req.protocol}://${req.get("host")}`;
    
    const membersWithPhotos = members.map((m) => {
      let imageUrl = m.profile_image_url
        ? `${baseURL}/${m.profile_image_url}`
        : `${baseURL}/uploads/members/default.jpg`;
      
      // ✅ Encode URL to handle spaces and special characters
      if (m.profile_image_url) {
        try {
          const url = new URL(imageUrl);
          const pathParts = url.pathname.split('/');
          const encodedParts = pathParts.map(part => encodeURIComponent(part));
          url.pathname = encodedParts.join('/');
          imageUrl = url.toString();
        } catch (e) {
          console.error('URL encoding error:', e);
        }
      }
      
      return {
        ...m,
        member_image: imageUrl,
        profile_image_url: imageUrl, // ✅ Add both for consistency
      };
    });

    res.status(200).json({
      members: membersWithPhotos,
      totalMembers: membersWithPhotos.length,
    });
  } catch (err) {
    console.error("❌ Error fetching members:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;