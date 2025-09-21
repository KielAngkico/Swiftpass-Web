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
      
      if (err.name === 'TokenExpiredError') {
        console.log("⏰ Token expired at:", err.expiredAt);
        console.log("⏰ Current time:", new Date());
        console.log("⏰ Time difference:", new Date() - new Date(err.expiredAt), "ms");
      }
      
      return res.status(403).json({ message: "Invalid or expired access token" });
    }

    console.log("✅ Token verified successfully for user:", {
      id: user.id,
      role: user.role,
      exp: new Date(user.exp * 1000),
      timeUntilExpiry: (user.exp * 1000 - Date.now()) / 1000 / 60, // minutes
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

const refreshTokenHandler = (req, res) => {
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

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) {
      console.log("❌ Refresh token verification failed:", err.name, err.message);
      
      if (err.name === 'TokenExpiredError') {
        console.log("⏰ Refresh token expired at:", err.expiredAt);
        console.log("⏰ Current time:", new Date());
        console.log("⏰ Refresh token was expired for:", new Date() - new Date(err.expiredAt), "ms");
      }
      
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    console.log("✅ Refresh token verified for user ID:", decoded.id);
    console.log("⏰ Refresh token expires at:", new Date(decoded.exp * 1000));

    const queryStartTime = Date.now();
    console.log("🔍 Querying database for user:", decoded.id);

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
        const queryDuration = Date.now() - queryStartTime;
        console.log(`📊 Database query completed in ${queryDuration}ms`);

        if (err) {
          console.log("❌ Database error during user lookup:", err.message);
          return res.status(500).json({ message: "Database error" });
        }

        if (results.length === 0) {
          console.log("❌ User not found in database for ID:", decoded.id);
          return res.status(404).json({ message: "User not found" });
        }

        const user = results[0];
        console.log("✅ User found in database:", {
          id: user.id,
          role: user.role,
          name: user.name,
          systemType: user.system_type,
          adminId: user.adminId
        });

        const tokenIssuedAt = new Date();
        const tokenExpiresAt = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour from now
        
        console.log("🎫 Generating new access token:");
        console.log("   Issued at:", tokenIssuedAt);
        console.log("   Expires at:", tokenExpiresAt);

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

        console.log("✅ New access token generated successfully");
        console.log("📤 Sending refresh response to client");

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