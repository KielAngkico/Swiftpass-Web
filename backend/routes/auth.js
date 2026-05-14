const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const dbSuperAdmin = require("../db");
const { authenticateJWT, refreshTokenHandler } = require("../middleware/auth");
const logAudit = require("../middleware/auditLogger");

dotenv.config();

const otpSessions = {};  

router.get('/auth-status', authenticateJWT, (req, res) => {
  res.json({
    isAuthenticated: true,
    needsLogin: false,
    user: req.user,  
  });
});

router.get('/auth-status-auto', (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return refreshTokenHandler(req, res);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return refreshTokenHandler(req, res);
    }

    return res.json({
      isAuthenticated: true,
      user: {
        id: decoded.id,
        role: decoded.role,
        systemType: decoded.systemType,
        adminId: decoded.adminId,
        name: decoded.name,
      },
      accessToken: token,  
    });
  });
});

router.get("/me", (req, res) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    console.log("❌ /me - No access token cookie found");
    return refreshTokenHandler(req, res);
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      console.log("❌ /me - Access token invalid/expired", err.message);
      return refreshTokenHandler(req, res);
    }

    try {
      const query = (sql, params) =>
        new Promise((resolve, reject) => {
          dbSuperAdmin.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
          });
        });

      let userData = null;

      if (user.role === "superadmin") {
        const rows = await query(
          `SELECT id, superadmin_name AS name, email, created_at 
           FROM SuperAdminAccounts WHERE id = ?`,
          [user.id]
        );
        if (rows.length) {
          userData = {
            id: rows[0].id,
            name: rows[0].name,
            email: rows[0].email,
            created_at: rows[0].created_at,
            role: "superadmin",
          };
        }

      } else if (user.role === "admin") {
  const rows = await query(
    `SELECT id, admin_name AS name, age, email, address, gym_name, 
            system_type, profile_image_url, session_fee, status, created_at,
            subscription_end_date
     FROM AdminAccounts WHERE id = ?`,
    [user.id]
  );
  if (rows.length) {
          userData = {
            id: rows[0].id,
            name: rows[0].name,
            age: rows[0].age,
            email: rows[0].email,
            address: rows[0].address,
            gym_name: rows[0].gym_name,
            system_type: rows[0].system_type,
            profile_image_url: rows[0].profile_image_url,
             subscription_end_date: rows[0].subscription_end_date, 
            session_fee: rows[0].session_fee,
            status: rows[0].status,
            created_at: rows[0].created_at,
            role: "admin",
            adminId: user.adminId,
            systemType: user.systemType,
          };
        }

      } else if (user.role === "staff") {
        const rows = await query(
          `SELECT s.id, s.staff_name AS name, s.age, s.email, s.address, 
                  s.contact_number, s.profile_image_url, s.status, s.created_at,
                  s.admin_id, a.gym_name, a.admin_name AS admin_name
           FROM StaffAccounts s
           LEFT JOIN AdminAccounts a ON s.admin_id = a.id
           WHERE s.id = ?`,
          [user.id]
        );
        if (rows.length) {
          userData = {
            id: rows[0].id,
            name: rows[0].name,
            age: rows[0].age,
            email: rows[0].email,
            address: rows[0].address,
            contact_number: rows[0].contact_number,
            profile_image_url: rows[0].profile_image_url,
            status: rows[0].status,
            created_at: rows[0].created_at,
            admin_id: rows[0].admin_id,
            gym_name: rows[0].gym_name,
            admin_name: rows[0].admin_name,
            role: "staff",
            adminId: user.adminId,
            systemType: user.systemType,
          };
        }
      }

      if (!userData) {
        return res.status(404).json({ authenticated: false, message: "User not found" });
      }

      console.log("✅ /me - User data fetched for:", userData.name);
      res.json({ authenticated: true, user: userData });

    } catch (error) {
      console.error("❌ /me - DB error:", error);
      res.status(500).json({ authenticated: false, message: "Server error" });
    }
  });
});

router.get("/gym-info/:adminId", (req, res) => {
  const { adminId } = req.params;

  dbSuperAdmin.query(
    "SELECT gym_name, admin_name FROM AdminAccounts WHERE id = ?",
    [adminId],
    (err, results) => {
      if (err) {
        console.error("❌ /gym-info - Database error:", err);
        return res.status(500).json({ message: "Failed to fetch gym info" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Gym not found for this admin" });
      }

      const gym = results[0];
      res.json({
        success: true,
        gym_name: gym.gym_name,
        admin_name: gym.admin_name,
      });
    }
  );
});

router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.clearCookie('accessToken', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

router.post('/signup', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  otpSessions[email] = {
    otp,
    createdAt: Date.now(),
  };

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'SwiftPass OTP Verification',
      text: `Your OTP is: ${otp}`,
    });
    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error('Email sending error:', err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  
  try {
    const tables = [
      {
        query: "SELECT id, superadmin_name AS name, email FROM SuperAdminAccounts WHERE email = ?",
        role: "superadmin"
      },
      {
        query: "SELECT id, admin_name AS name, email FROM AdminAccounts WHERE email = ? AND is_archived = 0",
        role: "admin"
      },
      {
        query: `SELECT s.id, s.staff_name AS name, s.email 
                FROM StaffAccounts s
                INNER JOIN AdminAccounts a ON s.admin_id = a.id
                WHERE s.email = ? AND a.is_archived = 0`,
        role: "staff"
      }
    ];

    let userResult = null;
    for (const table of tables) {
      const result = await new Promise((resolve, reject) => {
        dbSuperAdmin.query(table.query, [email], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });

      if (result.length > 0) {
        userResult = { user: result[0], role: table.role };
        break;
      }
    }

    if (!userResult) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    otpSessions[email] = {
      otp,
      userId: userResult.user.id,
      userName: userResult.user.name,
      userRole: userResult.role,
      type: 'password_reset',
      createdAt: Date.now(),
    };

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'SwiftPass Password Reset OTP',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${userResult.user.name},</p>
        <p>Your OTP code is:</p>
        <h1>${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      `,
    });

    await logAudit({
      req,
      action: "FORGOT_PASSWORD",
      module: "Auth",
      target: email,
      target_id: null,
      description: `Password reset requested for ${email}`,
      payload: { email },
    });

    res.json({ 
      message: 'Password reset OTP sent to your email',
      userRole: userResult.role,
      userName: userResult.user.name 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to send password reset email' });
  }
});

router.post('/verify-reset-otp', (req, res) => {
  const { email, otp } = req.body;

  const resetData = otpSessions[email];
  if (!resetData || resetData.type !== 'password_reset') {
    return res.status(400).json({ message: 'No pending password reset for this email' });
  }

  if (Date.now() > resetData.createdAt + 10 * 60 * 1000) {
    delete otpSessions[email];
    return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
  }

  if (resetData.otp !== otp) {
    return res.status(401).json({ message: 'Invalid OTP code' });
  }

  otpSessions[email].verified = true;
  otpSessions[email].verifiedAt = Date.now();
    
  res.json({ 
    message: 'OTP verified successfully. You can now reset your password.',
    success: true 
  });
});

router.post('/reset-password', async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  const resetData = otpSessions[email];
  if (!resetData || !resetData.verified || resetData.type !== 'password_reset') {
    return res.status(400).json({ message: 'Invalid password reset session. Please start over.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  if (Date.now() > resetData.verifiedAt + 30 * 60 * 1000) {
    delete otpSessions[email];
    return res.status(400).json({ message: 'Password reset session expired. Please start over.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    let updateQuery = '';

    switch (resetData.userRole) {
      case 'superadmin':
        updateQuery = 'UPDATE SuperAdminAccounts SET password = ? WHERE id = ?';
        break;
      case 'admin':
        updateQuery = 'UPDATE AdminAccounts SET password = ? WHERE id = ?';
        break;
      case 'staff':
        updateQuery = 'UPDATE StaffAccounts SET password = ? WHERE id = ?';
        break;
      default:
        return res.status(400).json({ message: 'Invalid user role' });
    }

    dbSuperAdmin.query(updateQuery, [hashedPassword, resetData.userId], async (err, result) => {
      if (err) {
        console.error('Password update error:', err);
        return res.status(500).json({ message: 'Failed to update password' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      await logAudit({
        req,
        action: "RESET_PASSWORD",
        module: "Auth",
        target: email,
        target_id: resetData.userId,
        description: `Password was reset for ${email}`,
        payload: { email, role: resetData.userRole },
      });

      delete otpSessions[email];
      res.json({ message: 'Password reset successfully. You can now login.', success: true });
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

module.exports = router;