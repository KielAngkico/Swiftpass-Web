const jwt = require("jsonwebtoken");
const dbSuperAdmin = require("../db");

const authenticateJWT = (req, res, next) => {
  console.log(`🔐 [${new Date().toISOString()}] Auth middleware called for ${req.method} ${req.path}`);

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.log("❌ Access token missing");
    return res.status(401).json({ message: "Access token missing" });
  }

  console.log("🎫 Token found, length:", token.length);
  console.log("🎫 Token preview:", token.substring(0, 20) + "...");

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log("❌ Token verification failed:", err.name, err.message);
      if (err.name === "TokenExpiredError") {
        console.log("⏰ Token expired at:", err.expiredAt);
        console.log("⏰ Current time:", new Date());
      }
      return res.status(403).json({ message: "Invalid or expired access token" });
    }

    console.log("✅ Token verified successfully for user:", {
      id: user.id,
      role: user.role,
      exp: new Date(user.exp * 1000),
      timeUntilExpiry: (user.exp * 1000 - Date.now()) / 1000 / 60,
    });

    req.user = user;
    next();
  });
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    console.log(`🛡️ [${new Date().toISOString()}] Role check - Required:`, allowedRoles, "User role:", req.user?.role);
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.log("❌ Insufficient permissions for user:", req.user?.id, "role:", req.user?.role);
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    console.log("✅ Role authorization passed");
    next();
  };
};

const refreshTokenHandler = async (req, res) => {
  console.log(`🔄 [${new Date().toISOString()}] Refresh token request received`);

  const cookieToken = req.cookies?.refreshToken;
  const bodyToken = req.body?.refreshToken;
  const refreshToken = cookieToken || bodyToken;

  console.log("🍪 Cookie token exists:", !!cookieToken);
  console.log("📝 Body token exists:", !!bodyToken);

  if (!refreshToken) {
    console.log("❌ No refresh token found in cookies or body");
    return res.status(401).json({ message: "Refresh token missing" });
  }

  console.log("🎫 Refresh token found, length:", refreshToken.length);
  console.log("🎫 Refresh token preview:", refreshToken.substring(0, 20) + "...");

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
    if (err) {
      console.log("❌ Refresh token verification failed:", err.name, err.message);
      if (err.name === "TokenExpiredError") {
        console.log("⏰ Refresh token expired at:", err.expiredAt);
        console.log("⏰ Current time:", new Date());
      }
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    console.log("✅ Refresh token verified for user ID:", decoded.id, "Role:", decoded.role);

    try {
      let user = null;

      if (decoded.role === "admin") {
        const [admin] = await dbSuperAdmin
          .promise()
          .query(
            "SELECT id, admin_name AS name, system_type FROM AdminAccounts WHERE id = ? AND is_archived = 0",
            [decoded.id]
          );
        if (admin.length) user = { ...admin[0], role: "admin", systemType: admin[0].system_type };
      } else if (decoded.role === "staff") {
        const [staff] = await dbSuperAdmin.promise().query(
          `SELECT s.id, s.staff_name AS name, s.admin_id, a.system_type
           FROM StaffAccounts s
           INNER JOIN AdminAccounts a ON s.admin_id = a.id
           WHERE s.id = ? AND a.is_archived = 0`,
          [decoded.id]
        );
        if (staff.length) user = { ...staff[0], role: "staff", systemType: staff[0].system_type, adminId: staff[0].admin_id };
      } else if (decoded.role === "superadmin") {
        const [superadmin] = await dbSuperAdmin
          .promise()
          .query("SELECT id, superadmin_name AS name, email FROM SuperAdminAccounts WHERE id = ?", [decoded.id]);
        if (superadmin.length) user = { ...superadmin[0], role: "superadmin" };
      }

      if (!user) {
        console.log("❌ User not found in database for ID:", decoded.id, "Role:", decoded.role);
        return res.status(404).json({ message: "User not found" });
      }

      const newAccessToken = jwt.sign(
        {
          id: user.id,
          role: user.role,
          name: user.name,
          systemType: user.systemType || null,
          adminId: user.adminId || null,
        },
        process.env.JWT_SECRET,
        { expiresIn: "3m" }
      );

      console.log("✅ New access token generated successfully");

      res.json({
        isAuthenticated: true,
        user: {
          id: user.id,
          role: user.role,
          systemType: user.systemType || null,
          adminId: user.adminId || null,
          name: user.name,
        },
        accessToken: newAccessToken,
      });
    } catch (dbErr) {
      console.log("❌ Database error during user lookup:", dbErr.message);
      res.status(500).json({ message: "Database error" });
    }
  });
};

module.exports = {
  authenticateJWT,
  requireRole,
  refreshTokenHandler,
};
