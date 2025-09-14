import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { useAuth } from "../App"; 

import { getAccessToken, setAccessToken, clearAccessToken } from "../tokenMemory";




const Login = ({ closeModal }) => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);


  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [loginOtp, setLoginOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);


  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [message, setMessage] = useState("");

useEffect(() => {
  let timer;
  if (resendTimer > 0) {
    timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
  }
  return () => clearTimeout(timer);
}, [resendTimer]);

useEffect(() => {
  checkExistingAuth();
}, []);


const checkExistingAuth = async () => {
  try {
    const res = await fetch(`${API_URL}/api/me`, {
      method: "GET",
      credentials: "include", // rely on HttpOnly cookie
    });
    const data = await res.json();
    console.log("📡 /me response:", data);

    if (res.ok && data.user) {
      closeModal?.();
      setUser(data.user);
      // set accessToken in memory if provided by server
      if (data.accessToken) setAccessToken(data.accessToken);
      navigateBasedOnRole(data.user);
    } else {
      console.warn("⚠ User not authenticated via cookie");
      clearAccessToken();
      setUser(null);
    }
  } catch (error) {
    console.error("❌ Auth check failed:", error);
    clearAccessToken();
    setUser(null);
  }
};

const handleSuccessfulLogin = async (data) => {
  try {
    if (data.accessToken) setAccessToken(data.accessToken);
    window.dispatchEvent(new Event("auth-changed"));
    const res = await fetch(`${API_URL}/api/me`, {
      method: "GET",
      credentials: "include", // rely on HttpOnly cookie
    });
    const userData = await res.json();

    if (res.ok && userData.user) {
      setUser(userData.user);
      closeModal?.();
      navigateBasedOnRole(userData.user, true);
    } else {
      console.error("❌ Failed to fetch /me after login", userData);
      alert("Failed to fetch user info after login");
    }
  } catch (error) {
    console.error("❌ Error during successful login:", error);
  }
};


const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    clearAccessToken();
    await fetch(`${API_URL}/api/logout`, {
      method: "POST",
      credentials: "include",
    });

    const response = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const data = await response.json();

    if (response.ok) {
      if (data.requiresOTP) {
        setShowOTPVerification(true);
        setMessage(data.message);
        setResendTimer(60);
      } else if (data.accessToken) {
        await handleSuccessfulLogin(data);
      }
    } else {
      alert(data.message || "Login failed");
    }
  } catch (err) {
    console.error("❌ Login error:", err);
    alert("Network error");
  } finally {
    setLoading(false);
  }
};

const handleOTPSubmit = async (e) => {
  e.preventDefault();
  setOtpLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/verify-login-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: loginOtp }),
      credentials: "include", 
    });

    const data = await response.json();
    console.log("🔑 OTP Verification Raw Response:", data);

    if (response.ok && data.success) {
      if (data.accessToken) setAccessToken(data.accessToken);
      window.dispatchEvent(new Event("auth-changed"));
      await handleSuccessfulLogin(data);
    } else {
      alert(data.message || "Invalid code");
    }
  } catch (err) {
    console.error("❌ OTP Verification Error:", err);
    alert("Network error");
  } finally {
    setOtpLoading(false);
  }
};

const handleResendOTP = async () => {
  if (resendTimer > 0) return;
  setResendLoading(true);
  
  try {
    const res = await fetch(`${API_URL}/api/resend-login-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    
    if (res.ok) {
      setMessage(data.message);
      setResendTimer(60);
    } else {
      alert(data.message || "Failed to resend OTP");
    }
  } catch (err) {
    console.error("❌ Resend OTP error:", err);
    alert("Network error");
  } finally {
    setResendLoading(false);
  }
};

  const navigateBasedOnRole = (user, replace = false) => {
    console.log("➡️ Navigating user:", user);

    if (!user || !user.role) {
      console.error("❌ Invalid user data:", user);
      alert("Invalid user data received");
      return;
    }

    const { role } = user;
    const navigateOptions = replace
      ? { replace: true, state: { role, user } }
      : { state: { role, user } };

    try {
      switch (role) {
        case "superadmin":
          navigate("/SuperAdmin/addClient", navigateOptions);
          break;
        case "admin":
          navigate("/Admin/StaffManagement", navigateOptions);
          break;
        case "staff":
          navigate("/Staff/member-entry", navigateOptions);
          break;
        default:
          console.error("❌ Unknown role:", role);
          alert(`Invalid user role: ${role}`);
          navigate("/dashboard", navigateOptions);
          break;
      }
    } catch (navigationError) {
      console.error("❌ Navigation error:", navigationError);
      alert("Navigation failed. Please refresh the page.");
    }
  };

  const handleSendOtp = async () => {
    if (!email) return alert("Please enter your email");
    setForgotLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      console.log("📩 Forgot password send OTP response:", data);

      if (res.ok) {
        setMessage(data.message);
        setForgotStep(2);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error("❌ Forgot password send OTP error:", err);
      alert("Network error");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return alert("Enter OTP");
    setForgotLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/verify-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      console.log("🔑 Verify reset OTP response:", data);

      if (res.ok) {
        setForgotStep(3);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error("❌ Verify reset OTP error:", err);
      alert("Network error");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) return alert("Fill all fields");
    if (newPassword !== confirmPassword) return alert("Passwords do not match");

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword, confirmPassword }),
      });
      const data = await res.json();
      console.log("🔒 Reset password response:", data);

      if (res.ok) {
        alert(data.message);
        setShowForgotPassword(false);
        setForgotStep(1);
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error("❌ Reset password error:", err);
      alert("Network error");
    } finally {
      setForgotLoading(false);
    }
  };

  const resetToLogin = () => {
    setShowOTPVerification(false);
    setShowForgotPassword(false);
    setLoginOtp("");
    setMessage("");
    setPassword("");
    setResendTimer(0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded shadow-lg w-full max-w-sm relative">
        <button onClick={closeModal} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800">
          ✕
        </button>

        <h1 className="text-2xl text-black font-bold text-center mb-6">
          {showOTPVerification ? "Verify Login" : "Login"}
        </h1>

        {/* 2FA OTP Verification */}
        {showOTPVerification ? (
          <div>
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-600 mb-4">
                We've sent a 6-digit verification code to <strong>{email}</strong>
              </p>
              {message && <p className="text-green-600 text-sm mb-3">{message}</p>}
            </div>

            <form onSubmit={handleOTPSubmit}>
              <div className="mb-4">
                <label htmlFor="loginOtp" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="loginOtp"
                  value={loginOtp}
                  onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full border text-black border-gray-300 rounded px-3 py-2 text-sm text-center tracking-wider shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="000000"
                  maxLength="6"
                  required
                  disabled={otpLoading}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-500 text-white font-medium py-2 px-4 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 mb-3"
                disabled={otpLoading || loginOtp.length !== 6}
              >
                {otpLoading ? "Verifying..." : "Verify & Login"}
              </button>
            </form>

           <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendLoading || resendTimer > 0}
                className="text-blue-500 hover:text-blue-700 font-medium text-base disabled:opacity-50"
              >
                {resendLoading
                  ? "Sending..."
                  : resendTimer > 0
                  ? `Resend Code in ${resendTimer}s`
                  : "Resend Code"}
              </button>

              <br />

              <button
                type="button"
                onClick={resetToLogin}
                className="text-gray-500 hover:text-gray-700 text-sm"
                disabled={otpLoading}
              >
                ← Back to Login
              </button>
            </div>
          </div>
        ) : !showForgotPassword ? (
          /* Regular Login Form */
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border text-black border-gray-300 rounded px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>
            <div className="mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border text-black border-gray-300 rounded px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>
            <div className="text-right mb-6">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-black hover:text-blue-800 text-sm font-medium focus:outline-none"
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white font-medium py-2 px-4 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Login"}
            </button>
          </form>
        ) : (
          /* Forgot Password Flow */
          <div>
            {forgotStep === 1 && (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full border px-3 py-2 rounded mb-3"
                  disabled={forgotLoading}
                />
                <button
                  onClick={handleSendOtp}
                  className="w-full bg-blue-500 text-white py-2 rounded"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Sending OTP..." : "Send OTP"}
                </button>
              </>
            )}
            {forgotStep === 2 && (
              <>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  className="w-full border px-3 py-2 rounded mb-3"
                />
                <button
                  onClick={handleVerifyOtp}
                  className="w-full bg-blue-500 text-white py-2 rounded"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </>
            )}
            {forgotStep === 3 && (
              <>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password"
                  className="w-full border px-3 py-2 rounded mb-3"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full border px-3 py-2 rounded mb-3"
                />
                <button
                  onClick={handleResetPassword}
                  className="w-full bg-green-500 text-white py-2 rounded"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Resetting..." : "Reset Password"}
                </button>
              </>
            )}
            {message && <p className="text-green-600 mt-3">{message}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;