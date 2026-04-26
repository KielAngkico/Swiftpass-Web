const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");
const logAudit = require("../middleware/auditLogger");
const jwt = require("jsonwebtoken");

// ─── Superadmin auth guard ───────────────────────────────────────────────────
const isSuperAdmin = (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "superadmin") {
      return res.status(403).json({ error: "Forbidden — superadmin only" });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ─── POST /api/audit/page-visit ──────────────────────────────────────────────
router.post("/audit/page-visit", async (req, res) => {
  const { page } = req.body;

  if (!page) return res.status(400).json({ error: "Page name is required" });

  // Get user from cookie for description
  let userName = "Unknown";
  try {
    const token = req.cookies?.accessToken;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userName = decoded.name || "Unknown";
    }
  } catch {}

  await logAudit({
    req,
    action: "PAGE_VISIT",
    module: "Navigation",
    target: page,
    target_id: null,
    description: `${userName} visited ${page}`,
    payload: { page },
  });

  res.json({ success: true });
});

// ─── GET /api/audit/logs ─────────────────────────────────────────────────────
router.get("/audit/logs", isSuperAdmin, async (req, res) => {
  const {
    admin_id,
    module,
    action,
    user_role,
    start_date,
    end_date,
    page = 1,
  } = req.query;

  const limit = 50;
  const offset = (parseInt(page) - 1) * limit;

  let conditions = [];
  let params = [];

  if (admin_id) {
    conditions.push("admin_id = ?");
    params.push(admin_id);
  }
  if (module) {
    conditions.push("module = ?");
    params.push(module);
  }
  if (action) {
    conditions.push("action = ?");
    params.push(action);
  }
  if (user_role) {
    conditions.push("user_role = ?");
    params.push(user_role);
  }
  if (start_date) {
    conditions.push("DATE(created_at) >= ?");
    params.push(start_date);
  }
  if (end_date) {
    conditions.push("DATE(created_at) <= ?");
    params.push(end_date);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    // Get total count for pagination
    const [countResult] = await dbSuperAdmin.promise().query(
      `SELECT COUNT(*) AS total FROM audit_logs ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get paginated logs
    const [logs] = await dbSuperAdmin.promise().query(
      `SELECT * FROM audit_logs 
       ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      total,
      page: parseInt(page),
      total_pages: Math.ceil(total / limit),
      logs,
    });
  } catch (err) {
    console.error("Audit logs fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;