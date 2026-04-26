const jwt = require("jsonwebtoken");
const dbSuperAdmin = require("../db");

const STRIP_FIELDS = ["password", "newPassword", "confirmPassword", "otp"];

const stripSensitiveFields = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const cleaned = { ...obj };
  STRIP_FIELDS.forEach((field) => delete cleaned[field]);
  return cleaned;
};

const logAudit = async ({
  req,
  action,
  module,
  target = null,
  target_id = null,
  description,
  payload = null,
}) => {
  try {
 
    let user_id = null;
    let user_name = null;
    let user_role = null;
    let admin_id = null;

    const token = req.cookies?.accessToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user_id   = decoded.id       || null;
        user_name = decoded.name     || null;
        user_role = decoded.role     || null;
        admin_id  = decoded.adminId  || null;
      } catch {

      }
    }


    const ip_address =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;

    const cleanedPayload = payload ? stripSensitiveFields(payload) : null;

 
    await dbSuperAdmin.promise().query(
      `INSERT INTO audit_logs 
        (user_id, user_name, user_role, admin_id, action, module, target, target_id, description, payload, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        user_name,
        user_role,
        admin_id,
        action,
        module,
        target,
        target_id,
        description,
        cleanedPayload ? JSON.stringify(cleanedPayload) : null,
        ip_address,
      ]
    );
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
};

module.exports = logAudit;