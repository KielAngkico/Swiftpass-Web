const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");


function isValidDate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

router.get("/subscription-activity-analytics", async (req, res) => {
  console.log("Received query params:", req.query);
  const { admin_id, filter_type = "all", start_date, end_date } = req.query;
  
  if (!admin_id || isNaN(admin_id)) {
    return res.status(400).json({ error: "Invalid admin_id" });
  }

  if (filter_type === "custom") {
    if (!start_date || !end_date) {
      return res.status(400).json({ error: "start_date and end_date required for custom filter" });
    }
    if (!isValidDate(start_date) || !isValidDate(end_date)) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ error: "start_date must be before end_date" });
    }
  }

  let entryDateCondition = "1=1";
  let queryParams = [admin_id];
  
  if (filter_type === "today") {
    entryDateCondition = "DATE(entry_time) = CURDATE()";
  } else if (filter_type === "custom" && start_date && end_date) {
    entryDateCondition = "DATE(entry_time) BETWEEN ? AND ?";
    queryParams.push(start_date, end_date);
  }

  // For transaction queries
  let txnDateCondition = "1=1";
  let txnParams = [admin_id];
  
  if (filter_type === "today") {
    txnDateCondition = "DATE(transaction_date) = CURDATE()";
  } else if (filter_type === "custom" && start_date && end_date) {
    txnDateCondition = "DATE(transaction_date) BETWEEN ? AND ?";
    txnParams.push(start_date, end_date);
  }

  try {
    const baseURL = `${req.protocol}://${req.get("host")}`;

    // ✅ Total Revenue
    const [revenueResult] = await dbSuperAdmin.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM AdminTransactions
       WHERE admin_id = ?
         AND transaction_type IN ('new_membership', 'renewal')
         AND ${txnDateCondition}`,
      txnParams
    );

    // ✅ Members Currently Inside
    const [membersInsideResult] = await dbSuperAdmin.promise().query(
      `SELECT COUNT(*) AS count
       FROM AdminEntryLogs
       WHERE admin_id = ?
         AND system_type = 'subscription'
         AND member_status = 'inside'
         AND visitor_type = 'Member'`,
      [admin_id]
    );

    // ✅ Day Pass Guests Currently Inside
    const [dayPassInsideResult] = await dbSuperAdmin.promise().query(
      `SELECT COUNT(*) AS count
       FROM AdminEntryLogs
       WHERE admin_id = ?
         AND member_status = 'inside'
         AND visitor_type = 'Day Pass'`,
      [admin_id]
    );

    // ✅ Total Transactions
    const [transactionsResult] = await dbSuperAdmin.promise().query(
      `SELECT COUNT(*) AS count
       FROM AdminTransactions
       WHERE admin_id = ?
         AND ${txnDateCondition}`,
      txnParams
    );

    // ✅ Total Logins
    const [loginResult] = await dbSuperAdmin.promise().query(
      `SELECT COUNT(*) AS count
       FROM AdminEntryLogs
       WHERE admin_id = ?
         AND system_type = 'subscription'
         AND ${entryDateCondition}`,
      queryParams
    );

    // ✅ Peak Hour
    const [peakResult] = await dbSuperAdmin.promise().query(
      `SELECT HOUR(entry_time) AS hour, COUNT(*) AS count
       FROM AdminEntryLogs
       WHERE admin_id = ?
         AND system_type = 'subscription'
         AND ${entryDateCondition}
       GROUP BY hour
       ORDER BY count DESC
       LIMIT 1`,
      queryParams
    );

    const peakHourFormatted = peakResult.length
      ? `${peakResult[0].hour}:00–${peakResult[0].hour + 1}:00`
      : "—";

    // ✅ Revenue Card (Cash vs Cashless)
    const [cashRevenue] = await dbSuperAdmin.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM AdminTransactions
       WHERE admin_id = ?
         AND payment_method = 'cash'
         AND ${txnDateCondition}`,
      txnParams
    );

    const [cashlessRevenue] = await dbSuperAdmin.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM AdminTransactions
       WHERE admin_id = ?
         AND payment_method != 'cash'
         AND ${txnDateCondition}`,
      txnParams
    );

    // ✅ Transaction Type Breakdown
    const [transactionTypes] = await dbSuperAdmin.promise().query(
      `SELECT transaction_type, IFNULL(SUM(amount), 0) AS amount
       FROM AdminTransactions
       WHERE admin_id = ?
         AND ${txnDateCondition}
       GROUP BY transaction_type`,
      txnParams
    );

    // ✅ Peak Hour Analysis (24 hours)
    const [peakHourAnalysis] = await dbSuperAdmin.promise().query(
      `SELECT HOUR(entry_time) AS hour, COUNT(*) AS count
       FROM AdminEntryLogs
       WHERE admin_id = ?
         AND system_type = 'subscription'
         AND ${entryDateCondition}
       GROUP BY hour
       ORDER BY hour ASC`,
      queryParams
    );

    // ✅ Revenue by Membership Type
    const [revenueByType] = await dbSuperAdmin.promise().query(
      `SELECT plan_name, IFNULL(SUM(amount), 0) AS revenue
       FROM AdminTransactions
       WHERE admin_id = ?
         AND transaction_type IN ('new_membership', 'renewal')
         AND ${txnDateCondition}
       GROUP BY plan_name`,
      txnParams
    );

    // ✅ Currently Inside
    const [currentlyInside] = await dbSuperAdmin.promise().query(
      `SELECT 
         e.full_name AS name,
         e.rfid_tag AS rfidTag,
         e.visitor_type AS visitorType,
         e.entry_time AS entryTime
       FROM AdminEntryLogs e
       WHERE e.admin_id = ?
         AND e.member_status = 'inside'
       ORDER BY e.entry_time DESC`,
      [admin_id]
    );

    // ✅ Top 3 Members with Images
    const [topMembers] = await dbSuperAdmin.promise().query(
      `SELECT
         e.full_name AS name,
         e.rfid_tag AS rfidTag,
         m.profile_image_url,
         COUNT(*) AS visitCount
       FROM AdminEntryLogs e
       LEFT JOIN MembersAccounts m ON e.rfid_tag = m.rfid_tag AND e.admin_id = m.admin_id
       WHERE e.admin_id = ?
         AND e.system_type = 'subscription'
         AND (e.visitor_type IS NULL OR e.visitor_type = 'Member')
       GROUP BY e.rfid_tag, e.full_name, m.profile_image_url
       ORDER BY visitCount DESC
       LIMIT 3`,
      [admin_id]
    );

    // ✅ Encode top member images
    const topMembersWithImages = topMembers.map(member => {
      let imageUrl = member.profile_image_url;
      
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `${baseURL}/${imageUrl}`;
        
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
        ...member,
        profile_image_url: imageUrl || `${baseURL}/uploads/members/default.jpg`
      };
    });

  const [recentEvents] = await dbSuperAdmin.promise().query(
  `SELECT 
     e.id,
     e.full_name,
     e.rfid_tag,
     e.visitor_type,
     e.entry_time,
     e.exit_time,
     e.member_status AS status,
     COALESCE(m.profile_image_url, d.profile_image_url) AS profile_image_url
   FROM AdminEntryLogs e
   LEFT JOIN MembersAccounts m ON e.rfid_tag = m.rfid_tag AND e.admin_id = m.admin_id
   LEFT JOIN DayPassGuests d ON e.rfid_tag = d.rfid_tag AND e.admin_id = d.admin_id
   WHERE e.admin_id = ?
     AND e.system_type = 'subscription'
     AND ${entryDateCondition}
   ORDER BY e.entry_time DESC
   LIMIT 50`,
  queryParams
);
    const recentEventsWithImages = recentEvents.map(event => {
      let imageUrl = event.profile_image_url;
      
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `${baseURL}/${imageUrl}`;
        
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
        ...event,
        profile_image_url: imageUrl || `${baseURL}/uploads/members/default.jpg`
      };
    });

    // ✅ Format response to match frontend expectations
    const responseData = {
      summary: {
        totalRevenue: Number(revenueResult[0]?.total) || 0,
        membersInside: Number(membersInsideResult[0]?.count) || 0,
        dayPassInside: Number(dayPassInsideResult[0]?.count) || 0,
        totalTransactions: Number(transactionsResult[0]?.count) || 0,
        peakHour: peakHourFormatted
      },
      revenueCard: {
        labels: ["Cash", "Cashless"],
        values: [
          Number(cashRevenue[0]?.total) || 0,
          Number(cashlessRevenue[0]?.total) || 0
        ]
      },
      transactionTypeBreakdown: {
        labels: transactionTypes.map(t => t.transaction_type),
        amounts: transactionTypes.map(t => Number(t.amount) || 0)
      },
      peakHourAnalysis: {
        labels: peakHourAnalysis.map(p => `${p.hour}:00`),
        values: peakHourAnalysis.map(p => Number(p.count) || 0)
      },
      revenueByMembershipType: {
        labels: revenueByType.map(r => r.plan_name),
        values: revenueByType.map(r => Number(r.revenue) || 0)
      },
      currentlyInside: currentlyInside,
      topMembers: topMembersWithImages,
      recent_events: recentEventsWithImages
    };

    console.log("🚀 Subscription activity response:", responseData);
    res.json(responseData);

  } catch (err) {
    console.error("Error fetching subscription activity analytics:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/prepaid-activity-analytics", async (req, res) => {
  console.log("Received query params:", req.query);
  const { admin_id, range, system_type = "prepaid_entry", start_date, end_date } = req.query;
  
  if (!admin_id || isNaN(admin_id)) {
    return res.status(400).json({ error: "Invalid admin_id" });
  }

  const validSystemTypes = ["prepaid_entry", "subscription"];
  if (!validSystemTypes.includes(system_type)) {
    return res.status(400).json({ error: "Invalid system_type" });
  }

  if ((start_date || end_date)) {
    if (!start_date || !end_date) {
      return res.status(400).json({ error: "Both start_date and end_date required" });
    }
    if (!isValidDate(start_date) || !isValidDate(end_date)) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ error: "start_date must be before end_date" });
    }
  }

  const isPrepaid = system_type === "prepaid_entry";

  const dateConditions = {
    today: "DATE(e.entry_time) = CURDATE()",
    yesterday: "DATE(e.entry_time) = CURDATE() - INTERVAL 1 DAY",
    "last-7-days": "DATE(e.entry_time) BETWEEN CURDATE() - INTERVAL 7 DAY AND CURDATE()",
  };

  const txnDateConditions = {
    today: "DATE(transaction_date) = CURDATE()",
    yesterday: "DATE(transaction_date) = CURDATE() - INTERVAL 1 DAY",
    "last-7-days": "DATE(transaction_date) BETWEEN CURDATE() - INTERVAL 7 DAY AND CURDATE()",
  };

  let entryDateCondition = "1=1";
  let entryParams = [];
  if (start_date && end_date) {
    entryDateCondition = "DATE(e.entry_time) BETWEEN ? AND ?";
    entryParams = [start_date, end_date];
  } else if (range && dateConditions[range]) {
    entryDateCondition = dateConditions[range];
  }

  let txnDateCondition = "1=1";
  let txnParams = [];
  if (start_date && end_date) {
    txnDateCondition = "DATE(transaction_date) BETWEEN ? AND ?";
    txnParams = [start_date, end_date];
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
         AND DATE(t.transaction_date) = CURDATE()`,
      [system_type, admin_id, transactionFilter]
    );

    const [loginResult] = await dbSuperAdmin.promise().query(
      `SELECT COUNT(*) AS count
       FROM AdminEntryLogs e
       WHERE e.system_type = ?
         AND e.admin_id = ?
         AND ${entryDateCondition}`,
      [system_type, admin_id, ...entryParams]
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
      [system_type, admin_id, ...entryParams]
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
      [system_type, admin_id, ...entryParams]
    );

    const [actionCounts] = await dbSuperAdmin.promise().query(
      `SELECT transaction_type, COUNT(*) AS count
       FROM (
         SELECT transaction_type, transaction_date
         FROM AdminTransactions
         WHERE admin_id = ?
           AND ${txnDateCondition}
         UNION ALL
         SELECT transaction_type, timestamp AS transaction_date
         FROM AdminMembersTransactions
         WHERE admin_id = ?
           AND ${txnDateCondition}
       ) AS combined
       GROUP BY transaction_type`,
      [admin_id, ...txnParams, admin_id, ...txnParams]
    );

    let transactionBreakdown = {};
    actionCounts.forEach(row => {
      transactionBreakdown[row.transaction_type] = row.count;
    });

    let topups = transactionBreakdown['Tapup'] || transactionBreakdown['top_up'] || 0;
    let deductions = transactionBreakdown['session_fee'] || 0;

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
           AND DATE(t.transaction_date) = CURDATE()`,
        [system_type, admin_id]
      );
      scanCount = sessionScanCount[0]?.scans || 0;
      totalCommission = scanCount * 1;
    }

    const [recentEvents] = await dbSuperAdmin.promise().query(
      `SELECT
         e.id,
         e.full_name AS name,
         e.rfid_tag AS rfid,
         e.visitor_type,
         e.entry_time AS time,
         e.exit_time,
         e.member_status AS status,
         COALESCE(m.profile_image_url, d.profile_image_url) AS profile_image_url
       FROM AdminEntryLogs e
       LEFT JOIN MembersAccounts m ON e.rfid_tag = m.rfid_tag AND e.admin_id = m.admin_id
       LEFT JOIN DayPassGuests d ON e.rfid_tag = d.rfid_tag AND e.admin_id = d.admin_id
       WHERE e.admin_id = ?
         AND e.system_type = ?
         AND ${entryDateCondition}
       ORDER BY e.entry_time DESC
       LIMIT 50`,
      [admin_id, system_type, ...entryParams]
    );

    const [topMembers] = await dbSuperAdmin.promise().query(
      `SELECT
         e.full_name,
         e.rfid_tag,
         m.profile_image_url,
         COUNT(*) AS login_count
       FROM AdminEntryLogs e
       LEFT JOIN MembersAccounts m ON e.rfid_tag = m.rfid_tag AND e.admin_id = m.admin_id
       WHERE e.admin_id = ? 
         AND e.system_type = ?
         AND (e.visitor_type IS NULL OR e.visitor_type != 'Day Pass')
       GROUP BY e.rfid_tag, e.full_name, m.profile_image_url
       ORDER BY login_count DESC
       LIMIT 3`,
      [admin_id, system_type]
    );

    const baseURL = `${req.protocol}://${req.get("host")}`;
    const topMembersWithImages = topMembers.map(member => {
      let imageUrl = member.profile_image_url;
      
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `${baseURL}/${imageUrl}`;
        
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
        ...member,
        profile_image_url: imageUrl || `${baseURL}/uploads/members/default.jpg`
      };
    });

    const recentEventsWithImages = recentEvents.map(event => {
      let imageUrl = event.profile_image_url;
      
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `${baseURL}/${imageUrl}`;
        
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
        ...event,
        profile_image_url: imageUrl || `${baseURL}/uploads/members/default.jpg`
      };
    });

    const responseData = {
      active_members_inside: Number(activeResult[0]?.count) || 0,
      prepaid_revenue: Number(revenueResult[0]?.total) || 0,
      total_logins: Number(loginResult[0]?.count) || 0,
      most_active_members: topMembersWithImages,
      peak_hour: peakHourFormatted,
      scans_by_hour: scanChart,
      transaction_breakdown: transactionBreakdown,
      topups_vs_deductions: { topups, deductions },
      swiftpass_commission: isPrepaid
        ? {
            scans: scanCount,
            rate: 1,
            total: totalCommission,
          }
        : null,
      recent_events: recentEventsWithImages,
    };

    console.log("🚀 Final backend response:", responseData);
    res.json(responseData);

  } catch (err) {
    console.error("Error fetching analytics:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;