const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");

router.get("/subscription-activity-analytics", async (req, res) => {
  console.log("Received query params:", req.query);
  const { admin_id, filter_type = "all", start_date, end_date } = req.query;
  
  if (!admin_id) return res.status(400).json({ error: "Missing admin_id" });

  let entryDateCondition = "1=1";
  
  if (filter_type === "today") {
    entryDateCondition = "DATE(entry_time) = CURDATE()";
  } else if (filter_type === "custom" && start_date && end_date) {
    entryDateCondition = `DATE(entry_time) BETWEEN '${start_date}' AND '${end_date}'`;
  }

  try {
    const [loginResult] = await dbSuperAdmin.promise().query(
      `SELECT COUNT(*) AS count
       FROM AdminEntryLogs
       WHERE admin_id = ?
         AND system_type = 'subscription'
         AND ${entryDateCondition}`,
      [admin_id]
    );

    const [peakResult] = await dbSuperAdmin.promise().query(
      `SELECT HOUR(entry_time) AS hour, COUNT(*) AS count
       FROM AdminEntryLogs
       WHERE admin_id = ?
         AND system_type = 'subscription'
         AND ${entryDateCondition}
       GROUP BY hour
       ORDER BY count DESC
       LIMIT 1`,
      [admin_id]
    );

    const peakHourFormatted = peakResult.length
      ? `${peakResult[0].hour}:00–${peakResult[0].hour + 1}:00`
      : "—";

    const [recentEvents] = await dbSuperAdmin.promise().query(
      `SELECT 
         e.id,
         e.full_name,
         e.rfid_tag,
         e.visitor_type,
         e.entry_time,
         e.exit_time,
         e.member_status AS status,
         m.profile_image_url
       FROM AdminEntryLogs e
       LEFT JOIN MembersAccounts m ON e.rfid_tag = m.rfid_tag AND e.admin_id = m.admin_id
       WHERE e.admin_id = ?
         AND e.system_type = 'subscription'
         AND ${entryDateCondition}
       ORDER BY e.entry_time DESC
       LIMIT 50`,
      [admin_id]
    );

    const responseData = {
      total_logins: Number(loginResult[0]?.count) || 0,
      peak_hour: peakHourFormatted,
      recent_events: recentEvents || [],
    };

    console.log("🚀 Subscription activity response:", responseData);
    res.json(responseData);

  } catch (err) {
    console.error("Error fetching subscription activity analytics:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});


router.get("/prepaid-activity-analytics", async (req, res) => {
  console.log("Received query params:", req.query);
  const { admin_id, range, system_type = "prepaid_entry" } = req.query;
  if (!admin_id) return res.status(400).json({ error: "Missing admin_id" });

  const isPrepaid = system_type === "prepaid_entry";

  const dateConditions = {
    today: "DATE(e.entry_time) = CURDATE()",
    yesterday: "DATE(e.entry_time) = CURDATE() - INTERVAL 1 DAY",
    "last-7-days": "DATE(e.entry_time) BETWEEN CURDATE() - INTERVAL 7 DAY AND CURDATE()",
  };

  const txnDateConditions = {
    today: "DATE(t.transaction_date) = CURDATE()",
    yesterday: "DATE(t.transaction_date) = CURDATE() - INTERVAL 1 DAY",
    "last-7-days": "DATE(t.transaction_date) BETWEEN CURDATE() - INTERVAL 7 DAY AND CURDATE()",
  };

  let entryDateCondition = "1=1"; 
  if (req.query.start_date && req.query.end_date) {
    entryDateCondition = `DATE(e.entry_time) BETWEEN '${req.query.start_date}' AND '${req.query.end_date}'`;
  } else if (range && dateConditions[range]) {
    entryDateCondition = dateConditions[range];
  }

  let txnDateCondition = "1=1";
  if (req.query.start_date && req.query.end_date) {
    txnDateCondition = `DATE(t.transaction_date) BETWEEN '${req.query.start_date}' AND '${req.query.end_date}'`;
  } else if (range && txnDateConditions[range]) {
    txnDateCondition = txnDateConditions[range];
  }

  const transactionFilter = isPrepaid
    ? ["new_membership", "Tapup", "renewal", "session_fee"]
    : ["new_membership", "renewal"];

  try {
  
    const [activeResult] = await dbSuperAdmin.promise().query(
      `SELECT COUNT(*) AS count
       FROM AdminEntryLogs e
       WHERE e.system_type = ?
         AND e.member_status = 'inside'
         AND e.admin_id = ?`,
      [system_type, admin_id]
    );

    const [revenueResult] = await dbSuperAdmin.promise().query(
      `SELECT IFNULL(SUM(t.amount), 0) AS total
       FROM AdminTransactions t
       JOIN AdminAccounts a ON a.id = t.admin_id
       WHERE a.system_type = ?
         AND t.admin_id = ?
         AND t.transaction_type IN (?)
         AND ${txnDateCondition}`,
      [system_type, admin_id, transactionFilter]
    );

    const [loginResult] = await dbSuperAdmin.promise().query(
      `SELECT COUNT(*) AS count
       FROM AdminEntryLogs e
       WHERE e.system_type = ?
         AND e.admin_id = ?
         AND ${entryDateCondition}`,
      [system_type, admin_id]
    );

    const [peakResult] = await dbSuperAdmin.promise().query(
      `SELECT HOUR(e.entry_time) AS hour, COUNT(*) AS count
       FROM AdminEntryLogs e
       WHERE e.system_type = ?
         AND e.admin_id = ?
         AND ${entryDateCondition}
       GROUP BY hour
       ORDER BY count DESC
       LIMIT 1`,
      [system_type, admin_id]
    );
    const peakHourFormatted = peakResult.length
      ? `${peakResult[0].hour}:00–${peakResult[0].hour + 1}:00`
      : "—";

    const [scanChart] = await dbSuperAdmin.promise().query(
      `SELECT HOUR(e.entry_time) AS hour, COUNT(*) AS count
       FROM AdminEntryLogs e
       WHERE e.system_type = ?
         AND e.admin_id = ?
         AND ${entryDateCondition}
       GROUP BY hour
       ORDER BY hour ASC`,
      [system_type, admin_id]
    );

    const [actionCounts] = await dbSuperAdmin.promise().query(
      `SELECT t.transaction_type, COUNT(*) AS count
       FROM AdminTransactions t
       JOIN AdminAccounts a ON a.id = t.admin_id
       WHERE a.system_type = ?
         AND t.admin_id = ?
         AND t.transaction_type IN (?)
         AND ${txnDateCondition}
       GROUP BY t.transaction_type`,
      [system_type, admin_id, transactionFilter]
    );

    let topups = 0;
    let deductions = 0;
    if (isPrepaid) {
      topups = actionCounts.find(a => a.transaction_type === "Tapup")?.count || 0;
      deductions = actionCounts.find(a => a.transaction_type === "session_fee")?.count || 0;
    } else {
      topups = actionCounts.find(a => a.transaction_type === "renewal")?.count || 0;
      deductions = actionCounts.find(a => a.transaction_type === "new_membership")?.count || 0;
    }

    let totalCommission = 0;
    let scanCount = 0;
    if (isPrepaid) {
      const [sessionScanCount] = await dbSuperAdmin.promise().query(
        `SELECT COUNT(*) AS scans
         FROM AdminTransactions t
         JOIN AdminAccounts a ON a.id = t.admin_id
         WHERE a.system_type = ?
           AND t.admin_id = ?
           AND t.transaction_type = 'session_fee'
           AND ${txnDateCondition}`,
        [system_type, admin_id]
      );
      scanCount = sessionScanCount[0]?.scans || 0;
      totalCommission = scanCount * 1; 
    }

    const [recentEvents] = await dbSuperAdmin.promise().query(
      `SELECT
         t.member_name AS name,
         t.rfid_tag AS rfid,
         t.transaction_type AS action,
         t.amount AS amount,
         TIME(t.transaction_date) AS time,
         t.reference AS balance
       FROM AdminTransactions t
       JOIN AdminAccounts a ON a.id = t.admin_id
       WHERE a.system_type = ?
         AND t.admin_id = ?
         AND t.transaction_type IN (?)
         AND ${txnDateCondition}
       ORDER BY t.transaction_date DESC
       LIMIT 10`,
      [system_type, admin_id, transactionFilter]
    );

    const [topMembers] = await dbSuperAdmin.promise().query(
      `SELECT
         e.full_name,
         e.rfid_tag,
         COUNT(*) AS login_count
       FROM AdminEntryLogs e
       WHERE e.admin_id = ? 
         AND e.system_type = ?
         AND (e.visitor_type IS NULL OR e.visitor_type != 'Day Pass')
       GROUP BY e.rfid_tag, e.full_name
       ORDER BY login_count DESC
       LIMIT 3`,
      [admin_id, system_type]
    );

    const responseData = {
      active_members_inside: Number(activeResult[0]?.count) || 0,
      prepaid_revenue: Number(revenueResult[0]?.total) || 0,
      total_logins: Number(loginResult[0]?.count) || 0,
      most_active_members: topMembers || [],
      peak_hour: peakHourFormatted,
      scans_by_hour: scanChart,
      topups_vs_deductions: { topups, deductions },
      swiftpass_commission: isPrepaid
        ? {
            scans: scanCount,
            rate: 1,
            total: totalCommission,
          }
        : null,
      recent_events: recentEvents || [],
    };

    console.log("🚀 Final backend response:", responseData);

    res.json(responseData);

  } catch (err) {
    console.error("Error fetching analytics:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
