const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");

router.get("/staff-entry-logs/:admin_id", async (req, res) => {
  const admin_id = req.params.admin_id;
  console.log("🔍 API called with admin_id:", admin_id);
  
  try {
    // ✅ Join with BOTH MembersAccounts AND DayPassGuests
const queryAllLogs = `
      SELECT 
        logs.*,
        COALESCE(m.profile_image_url, d.profile_image_url) AS profile_image_url,
        r.customer_number_display
      FROM AdminEntryLogs logs
      LEFT JOIN MembersAccounts m ON logs.rfid_tag = m.rfid_tag AND logs.admin_id = m.admin_id
      LEFT JOIN DayPassGuests d ON logs.rfid_tag = d.rfid_tag AND logs.admin_id = d.admin_id
      LEFT JOIN RegisteredRfid r ON logs.rfid_tag = r.rfid_tag
WHERE logs.admin_id = ?
  AND (
    logs.session_closed = 0
    OR logs.is_grace_reentry = 1
    OR DATE(COALESCE(logs.entry_time, logs.exit_time)) = CURDATE()
    OR logs.id IN (
      SELECT DISTINCT g.parent_session_id 
      FROM AdminEntryLogs g
      WHERE g.parent_session_id IS NOT NULL
        AND g.admin_id = logs.admin_id
        AND DATE(COALESCE(g.entry_time, g.exit_time)) = CURDATE()
    )
  )
ORDER BY COALESCE(logs.entry_time, logs.exit_time) DESC, logs.id DESC
    `;

    const [logRows] = await dbSuperAdmin.promise().query(queryAllLogs, [admin_id]);

    const baseURL = `${req.protocol}://${req.get("host")}`;
    const DEFAULT_IMAGE_URL = `${baseURL}/uploads/members/default.jpg`;

    const formattedLogs = logRows.map((row) => {
      // ✅ Construct full image URL with encoding
      let imageUrl = row.profile_image_url;
      
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `${baseURL}/${imageUrl}`;
        
        // ✅ Encode the URL to handle spaces and special characters
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
        id: row.id,
        rfid_tag: row.rfid_tag,
        full_name: row.full_name,
        profile_image_url: imageUrl || DEFAULT_IMAGE_URL,
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
        customer_number_display: row.customer_number_display || null,
        is_grace_reentry: row.is_grace_reentry || 0,
        parent_session_id: row.parent_session_id || null,
      };
    });

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