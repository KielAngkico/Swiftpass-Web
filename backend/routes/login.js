const express = require("express");
const router = express.Router();
const dbSuperAdmin = require("../db");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const otpLoginSessions = {};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email, otp, name) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Login Verification Code",
    html: `
      <h2>Login Verification</h2>
      <p>Hello ${name},</p>
      <p>Your verification code is: <strong>${otp}</strong></p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

// ============ LOGIN =============
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password required" });
  }

  const tryLogin = async (sql, role) => {
    const [results] = await dbSuperAdmin.promise().query(sql, [email]);
    if (!results.length) return null;
    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;
    return { ...user, role };
  };

  try {
    let user = await tryLogin(
      "SELECT id, superadmin_name AS name, email, password FROM SuperAdminAccounts WHERE email = ?",
      "superadmin"
    );

    if (!user) {
      user = await tryLogin(
        "SELECT id, admin_name AS name, age, email, password, address, gym_name, system_type FROM AdminAccounts WHERE email = ? AND is_archived = 0",
        "admin"
      );
    }

    if (!user) {
      const staff = await tryLogin(
        `SELECT s.id, s.staff_name AS name, s.admin_id, s.age, s.contact_number, s.address, s.email, s.password
         FROM StaffAccounts s
         INNER JOIN AdminAccounts a ON s.admin_id = a.id
         WHERE s.email = ? AND a.is_archived = 0`,
        "staff"
      );

      if (staff) {
        const [adminResult] = await dbSuperAdmin
          .promise()
          .query("SELECT system_type FROM AdminAccounts WHERE id = ? AND is_archived = 0", [staff.admin_id]);

        if (!adminResult || !adminResult.length) {
          return res.status(401).json({ success: false, message: "Access denied - Admin account is archived" });
        }

        staff.systemType = adminResult[0].system_type;
        user = staff;
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const otp = generateOTP();
    otpLoginSessions[email] = {
      otp,
      userId: user.id,
      role: user.role,
      systemType: user.systemType || user.system_type || null,
      adminId: user.role === "admin" ? user.id : user.role === "staff" ? user.admin_id : null,
      name: user.name,
      createdAt: Date.now(),
      userData: user,
    };

    await sendOTPEmail(email, otp, user.name);

    res.json({
      message: "Credentials verified. Check your email for the verification code.",
      requiresOTP: true,
      success: true,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============ VERIFY LOGIN OTP =============
router.post("/verify-login-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const sessionData = otpLoginSessions[email];
  if (!sessionData) return res.status(400).json({ message: "No pending OTP for this email" });

  if (Date.now() > sessionData.createdAt + 10 * 60 * 1000) {
    delete otpLoginSessions[email];
    return res.status(400).json({ message: "OTP expired, please login again" });
  }

  if (sessionData.otp !== otp) {
    return res.status(401).json({ message: "Invalid OTP" });
  }

  res.clearCookie("accessToken", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });

  if (sessionData.role === "staff") {
    try {
      await dbSuperAdmin
        .promise()
        .query(
          `INSERT INTO StaffSessionLogs (staff_id, staff_name, admin_id, system_type, status)
           VALUES (?, ?, ?, ?, 'online')`,
          [sessionData.userData.id, sessionData.userData.name, sessionData.userData.admin_id, sessionData.systemType]
        );
    } catch (err) {
      console.error("Failed to log staff session:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  const accessToken = jwt.sign(
    {
      id: sessionData.userId,
      role: sessionData.role,
      systemType: sessionData.systemType,
      adminId: sessionData.adminId,
      name: sessionData.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "3m" }
  );

  const refreshToken = jwt.sign({ id: sessionData.userId, role:sessionData.role }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "1d",
  });

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 3 * 60 * 1000,
    path: "/",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
  });

  delete otpLoginSessions[email];

  res.json({
    message: "Login successful",
    success: true,
    user: {
      id: sessionData.userId,
      role: sessionData.role,
      systemType: sessionData.systemType,
      adminId: sessionData.adminId,
      name: sessionData.name,
    },
	accessToken,
  });
});
// ============ REFRESH TOKEN =============
router.post("/refresh-token", async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return res.status(401).json({ success: false, message: "No refresh token" });

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ success: false, message: "Invalid refresh token" });

    try {
      let user = null;

      // ✅ FIX: Check role from decoded token first, then query the correct table
      if (decoded.role === "superadmin") {
        const [superadmin] = await dbSuperAdmin
          .promise()
          .query("SELECT id, superadmin_name AS name, email FROM SuperAdminAccounts WHERE id = ?", [decoded.id]);

        if (superadmin.length) {
          user = { ...superadmin[0], role: "superadmin" };
        }
      } else if (decoded.role === "admin") {
        const [admin] = await dbSuperAdmin
          .promise()
          .query("SELECT id, admin_name AS name, system_type FROM AdminAccounts WHERE id = ? AND is_archived = 0", [
            decoded.id,
          ]);

        if (admin.length) {
          user = { ...admin[0], role: "admin", systemType: admin[0].system_type };
        }
      } else if (decoded.role === "staff") {
        const [staff] = await dbSuperAdmin.promise().query(
          `SELECT s.id, s.staff_name AS name, s.admin_id, a.system_type
           FROM StaffAccounts s
           INNER JOIN AdminAccounts a ON s.admin_id = a.id
           WHERE s.id = ? AND a.is_archived = 0`,
          [decoded.id]
        );

        if (staff.length) {
          user = { ...staff[0], role: "staff", systemType: staff[0].system_type, adminId: staff[0].admin_id };
        }
      }

      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const accessToken = jwt.sign(
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

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        maxAge: 3 * 60 * 1000,
        path: "/",
      });

      const newRefreshToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: "1d" });

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.json({
        success: true,
        message: "Tokens refreshed successfully",
        user: {
          id: user.id,
          role: user.role,
          name: user.name,
          systemType: user.systemType || null,
          adminId: user.adminId || null,
        },
        accessToken,
      });
    } catch (error) {
      console.error("Refresh token error:", error);
      res.status(500).json({ success: false, message: "Failed to refresh tokens" });
    }
  });
});
router.post("/resend-login-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  const sessionData = otpLoginSessions[email];
  if (!sessionData) {
    return res.status(400).json({ message: "No pending login session. Please start login again." });
  }

  const newOTP = generateOTP();
  sessionData.otp = newOTP;
  sessionData.createdAt = Date.now();

  try {
    await sendOTPEmail(email, newOTP, sessionData.name);
    return res.json({ message: "New verification code sent to your email" });
  } catch (emailError) {
    console.error("Resend OTP error:", emailError);
    return res.status(500).json({ message: "Failed to send verification code. Please try again." });
  }
});

// ============ STAFF LOGOUT =============
router.post("/staff/logout", async (req, res) => {
  const { staff_id } = req.body;

  if (!staff_id) {
    return res.status(400).json({ message: "staff_id is required" });
  }

  try {
    await dbSuperAdmin
      .promise()
      .query(
        `UPDATE StaffSessionLogs
         SET status = 'offline', logout_time = NOW()
         WHERE staff_id = ? AND status = 'online'
         ORDER BY login_time DESC
         LIMIT 1`,
        [staff_id]
      );

    return res.json({ message: "Logout logged successfully" });
  } catch (err) {
    console.error("Logout session log error:", err);
    return res.status(500).json({ message: "Logout logging failed" });
  }
});

module.exports = router;
