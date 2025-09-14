
const jwt = require("jsonwebtoken");
const dbSuperAdmin = require("../db"); 



const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; 

  if (!token) {
    return res.status(401).json({ message: "Access token missing" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired access token" });
    }

    req.user = user; 
    next();
  });
};


const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};


const refreshTokenHandler = (req, res) => {
  const cookieToken = req.cookies?.refreshToken;
  const bodyToken = req.body?.refreshToken;
  const refreshToken = cookieToken || bodyToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    dbSuperAdmin.query(
      `SELECT id, 'superadmin' AS role, superadmin_name AS name, NULL AS system_type, NULL AS adminId FROM SuperAdminAccounts WHERE id = ?
       UNION
       SELECT id, 'admin' AS role, admin_name AS name, system_type, id AS adminId FROM AdminAccounts WHERE id = ?
       UNION
       SELECT s.id, 'staff' AS role, s.staff_name AS name, a.system_type, s.admin_id AS adminId
       FROM StaffAccounts s
       JOIN AdminAccounts a ON s.admin_id = a.id
       WHERE s.id = ?`,
      [decoded.id, decoded.id, decoded.id],
      (err, results) => {
        if (err || results.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        const user = results[0];

        const newAccessToken = jwt.sign(
          {
            id: user.id,
            role: user.role,
            systemType: user.system_type,
            adminId: user.adminId,
            name: user.name,
          },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        return res.json({
          isAuthenticated: true,
          user: {
            id: user.id,
            role: user.role,
            systemType: user.system_type,
            adminId: user.adminId,
            name: user.name,
          },
          accessToken: newAccessToken,
        });
      }
    );
  });
};

module.exports = {
  authenticateJWT,
  requireRole,
  refreshTokenHandler,
};
