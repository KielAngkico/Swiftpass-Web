const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db"); 

router.get("/get-members", async (req, res) => {
  const { admin_id } = req.query;

  if (!admin_id) {
    return res.status(400).json({ message: "Admin ID is required" });
  }

  try {
    const [members] = await dbSuperAdmin.promise().query(
      "SELECT * FROM MembersAccounts WHERE admin_id = ? ORDER BY created_at DESC",
      [admin_id]
    );

    res.status(200).json({
      members,
      totalMembers: members.length,
    });
  } catch (err) {
    console.error("❌ Error fetching members:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
