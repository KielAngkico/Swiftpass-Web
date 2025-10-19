const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");


router.get("/analytics", async (req, res) => {
  const {
    admin_id,
    filter_type = "all",
    start_date,
    end_date,
  } = req.query;

  if (!admin_id) return res.status(400).json({ error: "Missing admin_id" });

  let entryDateCondition = "1=1";
  let txnDateCondition = "1=1";

  if (filter_type === "today") {
    entryDateCondition = "DATE(entry_time) = CURDATE()";
    txnDateCondition = "DATE(transaction_date) = CURDATE()";
  } else if (filter_type === "this_week") {
    entryDateCondition = "YEARWEEK(entry_time, 1) = YEARWEEK(CURDATE(), 1)";
    txnDateCondition = "YEARWEEK(transaction_date, 1) = YEARWEEK(CURDATE(), 1)";
  } else if (filter_type === "this_month") {
    entryDateCondition = "YEAR(entry_time) = YEAR(CURDATE()) AND MONTH(entry_time) = MONTH(CURDATE())";
    txnDateCondition = "YEAR(transaction_date) = YEAR(CURDATE()) AND MONTH(transaction_date) = MONTH(CURDATE())";
  } else if (filter_type === "this_year") {
    entryDateCondition = "YEAR(entry_time) = YEAR(CURDATE())";
    txnDateCondition = "YEAR(transaction_date) = YEAR(CURDATE())";
  } else if (filter_type === "custom" && start_date && end_date) {
    entryDateCondition = `DATE(entry_time) BETWEEN '${start_date}' AND '${end_date}'`;
    txnDateCondition = `DATE(transaction_date) BETWEEN '${start_date}' AND '${end_date}'`;
  }

  try {
  
    const [revenueResult] = await dbSuperAdmin.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total_revenue
       FROM AdminTransactions 
       WHERE admin_id = ? AND ${txnDateCondition}`,
      [admin_id]
    );

   
    const [membersInsideResult] = await dbSuperAdmin.promise().query(
      `SELECT COUNT(*) AS count
       FROM AdminEntryLogs 
       WHERE admin_id = ? 
         AND member_status = 'inside' 
         AND visitor_type = 'Member'`,
      [admin_id]
    );

   
    const [dayPassInsideResult] = await dbSuperAdmin.promise().query(
      `SELECT COUNT(*) AS count
       FROM AdminEntryLogs 
       WHERE admin_id = ? 
         AND member_status = 'inside' 
         AND visitor_type = 'Day Pass'`,
      [admin_id]
    );

   
    const [totalTxnResult] = await dbSuperAdmin.promise().query(
      `SELECT COUNT(*) AS count
       FROM AdminTransactions 
       WHERE admin_id = ? AND ${txnDateCondition}`,
      [admin_id]
    );

    
    const [peakHourResult] = await dbSuperAdmin.promise().query(
      `SELECT HOUR(entry_time) AS hour, COUNT(*) AS count
       FROM AdminEntryLogs 
       WHERE admin_id = ? AND ${entryDateCondition}
       GROUP BY hour 
       ORDER BY count DESC 
       LIMIT 1`,
      [admin_id]
    );

    const peakHour = peakHourResult.length
      ? `${peakHourResult[0].hour}:00-${peakHourResult[0].hour + 1}:00`
      : "N/A";

 
    const [revenueBreakdown] = await dbSuperAdmin.promise().query(
      `SELECT 
         SUM(CASE WHEN payment_method = 'Cash' THEN amount ELSE 0 END) AS cash,
         SUM(CASE WHEN payment_method IN ('GCash', 'Cashless') THEN amount ELSE 0 END) AS cashless
       FROM AdminTransactions 
       WHERE admin_id = ? AND ${txnDateCondition}`,
      [admin_id]
    );


    const [paymentMethodBreakdown] = await dbSuperAdmin.promise().query(
      `SELECT 
         pm.name AS payment_method,
         COUNT(t.transaction_id) AS transaction_count,
         IFNULL(SUM(t.amount), 0) AS total_amount
       FROM AdminPaymentMethods pm
       LEFT JOIN AdminTransactions t ON t.admin_id = pm.admin_id 
         AND t.payment_method = pm.name
         AND ${txnDateCondition}
       WHERE pm.admin_id = ? AND pm.is_enabled = 1
       GROUP BY pm.name`,
      [admin_id]
    );

    const [peakHourAnalysis] = await dbSuperAdmin.promise().query(
      `SELECT 
         HOUR(entry_time) AS hour,
         COUNT(*) AS entries
       FROM AdminEntryLogs 
       WHERE admin_id = ? AND ${entryDateCondition}
       GROUP BY hour
       ORDER BY hour ASC`,
      [admin_id]
    );

    const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const hourValues = Array(24).fill(0);
    peakHourAnalysis.forEach(row => {
      hourValues[row.hour] = row.entries;
    });

    const [revenueByMembershipType] = await dbSuperAdmin.promise().query(
      `SELECT 
         COALESCE(t.plan_name, 'Other') AS plan_name,
         IFNULL(SUM(t.amount), 0) AS revenue
       FROM AdminTransactions t
       WHERE t.admin_id = ? AND ${txnDateCondition}
       GROUP BY plan_name
       ORDER BY revenue DESC`,
      [admin_id]
    );

    const [currentlyInside] = await dbSuperAdmin.promise().query(
      `SELECT 
         full_name,
         entry_time,
         visitor_type,
         rfid_tag
       FROM AdminEntryLogs 
       WHERE admin_id = ? 
         AND member_status = 'inside'
       ORDER BY entry_time DESC`,
      [admin_id]
    );

    const [topMembers] = await dbSuperAdmin.promise().query(
      `SELECT 
         full_name,
         rfid_tag,
         COUNT(*) AS visit_count
       FROM AdminEntryLogs 
       WHERE admin_id = ? 
         AND visitor_type = 'Member'
         AND ${entryDateCondition}
       GROUP BY full_name, rfid_tag
       ORDER BY visit_count DESC
       LIMIT 3`,
      [admin_id]
    );

    res.json({
      summary: {
        totalRevenue: Number(revenueResult[0]?.total_revenue) || 0,
        membersInside: Number(membersInsideResult[0]?.count) || 0,
        dayPassInside: Number(dayPassInsideResult[0]?.count) || 0,
        totalTransactions: Number(totalTxnResult[0]?.count) || 0,
        peakHour: peakHour,
      },
      revenueCard: {
        labels: ['Cash', 'Cashless'],
        values: [
          Number(revenueBreakdown[0]?.cash) || 0,
          Number(revenueBreakdown[0]?.cashless) || 0
        ]
      },
      transactionTypeBreakdown: {
        labels: paymentMethodBreakdown.map(pm => pm.payment_method),
        values: paymentMethodBreakdown.map(pm => Number(pm.transaction_count) || 0),
        amounts: paymentMethodBreakdown.map(pm => Number(pm.total_amount) || 0)
      },
      peakHourAnalysis: {
        labels: hourLabels,
        values: hourValues
      },
      revenueByMembershipType: {
        labels: revenueByMembershipType.map(r => r.plan_name),
        values: revenueByMembershipType.map(r => Number(r.revenue) || 0)
      },
      currentlyInside: currentlyInside.map(member => ({
        name: member.full_name,
        entryTime: member.entry_time,
        visitorType: member.visitor_type,
        rfidTag: member.rfid_tag
      })),
      topMembers: topMembers.map((member, index) => ({
        rank: index + 1,
        name: member.full_name,
        rfidTag: member.rfid_tag,
        visitCount: Number(member.visit_count)
      }))
    });
  } catch (err) {
    console.error("Error in /analytics:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

module.exports = router;
