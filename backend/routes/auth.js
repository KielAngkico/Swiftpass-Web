  const express = require('express');
  const router = express.Router();
  const nodemailer = require('nodemailer');
  const crypto = require('crypto');
  const dotenv = require('dotenv');
  const bcrypt = require('bcrypt');
  const jwt = require("jsonwebtoken");
  const dbSuperAdmin = require("../db");
  const { authenticateJWT, refreshTokenHandler } = require("../middleware/auth");

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
    return res.status(401).json({ authenticated: false, message: "No access token - please login" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ authenticated: false, message: "Token expired - please login again" });
    }

    res.json({
      authenticated: true,
      user: { id: user.id, role: user.role, systemType: user.systemType, adminId: user.adminId, name: user.name },
    });
  });
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

      dbSuperAdmin.query(updateQuery, [hashedPassword, resetData.userId], (err, result) => {
        if (err) {
          console.error('Password update error:', err);
          return res.status(500).json({ message: 'Failed to update password' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'User not found' });
        }

        delete otpSessions[email];
        res.json({ message: 'Password reset successfully. You can now login.', success: true });
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

router.post("/refresh-token", (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return res.status(401).json({ success: false, message: "No refresh token" });

  const { expectedUserId } = req.body; 

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ success: false, message: "Invalid refresh token" });

    if (expectedUserId && decoded.id !== expectedUserId) {
      return res.status(403).json({ success: false, message: "Token mismatch" });
    }

    try {
      let user = null;

      const superadmin = await new Promise((resolve, reject) => {
        dbSuperAdmin.query(
          "SELECT id, superadmin_name AS name, email FROM SuperAdminAccounts WHERE id = ?",
          [decoded.id],
          (err, result) => (err ? reject(err) : resolve(result[0] || null))
        );
      });

      if (superadmin) user = { ...superadmin, role: "superadmin" };

      if (!user) {
        const admin = await new Promise((resolve, reject) => {
          dbSuperAdmin.query(
            "SELECT id, admin_name AS name, system_type FROM AdminAccounts WHERE id = ? AND is_archived = 0",
            [decoded.id],
            (err, result) => (err ? reject(err) : resolve(result[0] || null))
          );
        });

        if (admin) user = { ...admin, role: "admin", systemType: admin.system_type };
      }

      if (!user) {
        const staff = await new Promise((resolve, reject) => {
          dbSuperAdmin.query(
            `SELECT s.id, s.staff_name AS name, s.admin_id, a.system_type
             FROM StaffAccounts s
             INNER JOIN AdminAccounts a ON s.admin_id = a.id
             WHERE s.id = ? AND a.is_archived = 0`,
            [decoded.id],
            (err, result) => (err ? reject(err) : resolve(result[0] || null))
          );
        });

        if (staff) user = { ...staff, role: "staff", systemType: staff.system_type, adminId: staff.admin_id };
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
        { expiresIn: "15m" }
      );

      const newRefreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        path: "/",
        maxAge: 15 * 60 * 1000,
      });

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
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


  module.exports = router;
