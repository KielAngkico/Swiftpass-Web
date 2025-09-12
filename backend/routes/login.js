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

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const tryLogin = (sql, role) => {
    return new Promise((resolve, reject) => {
      dbSuperAdmin.query(sql, [email], (err, results) => {
        if (err) return reject(err);
        if (!results.length) return resolve(null);
        const user = results[0];

        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) return reject(err);
          if (!isMatch) return resolve(null);
          resolve({ ...user, role });
        });
      });
    });
  };

  (async () => {
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
          const adminResult = await new Promise((resolve, reject) => {
            dbSuperAdmin.query(
              "SELECT system_type FROM AdminAccounts WHERE id = ? AND is_archived = 0",
              [staff.admin_id],
              (err, result) => (err ? reject(err) : resolve(result))
            );
          });

          if (!adminResult || !adminResult.length) {
            return res
              .status(401)
              .json({ message: "Access denied - Admin account is archived" });
          }

          staff.systemType = adminResult[0].system_type;
          user = staff;
        }
      }

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const otp = generateOTP();

      otpLoginSessions[email] = {
        otp,
        userId: user.id,
        role: user.role,
        systemType: user.systemType || null,
        adminId:
          user.role === "admin"
            ? user.id
            : user.role === "staff"
            ? user.admin_id
            : null,
        name: user.name,
        createdAt: Date.now(),
        userData: user,
      };

      await sendOTPEmail(email, otp, user.name);

      res.json({
        message: "Credentials verified. Check your email for the verification code.",
        requiresOTP: true,
        success: false,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  })();
});

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
      await new Promise((resolve, reject) => {
        dbSuperAdmin.query(
          `INSERT INTO StaffSessionLogs (staff_id, staff_name, admin_id, system_type, status) 
           VALUES (?, ?, ?, ?, 'online')`,
          [
            sessionData.userData.id,
            sessionData.userData.name,
            sessionData.userData.admin_id,
            sessionData.systemType,
          ],
          (err) => (err ? reject(err) : resolve())
        );
      });
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
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign({ id: sessionData.userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 15 * 60 * 1000,
    path: "/",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
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
  });
});




router.post("/refresh", (req, res) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "No refresh token provided" });
  }

  jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid refresh token" });
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
          { expiresIn: "15m" }
        );

        res.json({ accessToken: newAccessToken });
      }
    );
  });
});




router.post("/resend-login-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  const sessionData = otpLoginSessions[email];
  if (!sessionData) {
    return res
      .status(400)
      .json({ message: "No pending login session. Please start login again." });
  }

  const newOTP = generateOTP();
  sessionData.otp = newOTP;
  sessionData.createdAt = Date.now();

  try {
    await sendOTPEmail(email, newOTP, sessionData.name);
    return res.json({ message: "New verification code sent to your email" });
  } catch (emailError) {
    console.error("Resend OTP error:", emailError);
    return res
      .status(500)
      .json({ message: "Failed to send verification code. Please try again." });
  }
});

router.post("/staff/logout", async (req, res) => {
  const { staff_id } = req.body;

  if (!staff_id) {
    return res.status(400).json({ message: "staff_id is required" });
  }

  try {
    await new Promise((resolve, reject) => {
      dbSuperAdmin.query(
        `UPDATE StaffSessionLogs 
         SET status = 'offline', logout_time = NOW() 
         WHERE staff_id = ? AND status = 'online' 
         ORDER BY login_time DESC 
         LIMIT 1`,
        [staff_id],
        (err) => (err ? reject(err) : resolve())
      );
    });

    return res.json({ message: "Logout logged successfully" });
  } catch (err) {
    console.error("Logout session log error:", err);
    return res.status(500).json({ message: "Logout logging failed" });
  }
});

module.exports = router;
