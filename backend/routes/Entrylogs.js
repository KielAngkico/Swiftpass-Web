const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");

router.get("/staff-entry-logs/:admin_id", async (req, res) => {
  const admin_id = req.params.admin_id;
console.log("🔍 API called with admin_id:", admin_id);
  try {
    const queryAllLogs = `
      SELECT logs.*, m.profile_image_url
      FROM AdminEntryLogs logs
      LEFT JOIN MembersAccounts m ON logs.rfid_tag = m.rfid_tag
      WHERE logs.admin_id = ?
      ORDER BY logs.entry_time DESC
    `;

    const [logRows] = await dbSuperAdmin.promise().query(queryAllLogs, [admin_id]);

    const DEFAULT_IMAGE_URL = "uploads/members/default.jpg";

    const formattedLogs = logRows.map((row) => ({
      id: row.id,
      rfid_tag: row.rfid_tag,
      full_name: row.full_name,
      profile_image_url: row.profile_image_url || DEFAULT_IMAGE_URL,
      entry_time: row.entry_time ? new Date(row.entry_time).toISOString() : null,
      exit_time: row.exit_time ? new Date(row.exit_time).toISOString() : null,
      visitor_type: row.visitor_type,
      system_type: row.system_type,
      member_status: row.member_status,
      deducted_amount: row.deducted_amount,
      remaining_balance: row.remaining_balance,
      subscription_expiry: row.subscription_expiry,
      location: row.location,
      staff_name: row.staff_name,
      timestamp: row.exit_time || row.entry_time,
    }));

    console.log(`📊 Returning ${formattedLogs.length} database log rows`);

    res.json({
      recentEntryList: formattedLogs,
      totalLogs: formattedLogs.length,
    });
  } catch (err) {
    console.error("❌ Failed to fetch logs:", err);
    res.status(500).json({
      message: "Failed to retrieve logs",
      error: err.message,
    });
  }
});


module.exports = router;