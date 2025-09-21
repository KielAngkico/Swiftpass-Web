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

  // Unified notification system
  const [notification, setNotification] = useState({ message: "", type: "" });

  const showNotification = (message, type = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: "" }), 5000);
  };

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
        credentials: "include", 
      });
      const data = await res.json();

      if (res.ok && data.user) {
        closeModal?.();
        setUser(data.user);
        if (data.accessToken) setAccessToken(data.accessToken);
        navigateBasedOnRole(data.user);
      } else {
        clearAccessToken();
        setUser(null);
      }
    } catch (error) {
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
        credentials: "include", 
      });
      const userData = await res.json();

      if (res.ok && userData.user) {
        setUser(userData.user);
        closeModal?.();
        navigateBasedOnRole(userData.user, true);
      } else {
        showNotification("Failed to fetch user info after login");
      }
    } catch (error) {
      showNotification("Error occurred during login process");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotification({ message: "", type: "" });

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
          showNotification(data.message || "Verification code sent to your email", "success");
          setResendTimer(60);
        } else if (data.accessToken) {
          await handleSuccessfulLogin(data);
        }
      } else {
        showNotification(data.message || "Invalid email or password");
      }
    } catch (err) {
      showNotification("Network error. Please check your connection");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setOtpLoading(true);
    setNotification({ message: "", type: "" });

    try {
      const response = await fetch(`${API_URL}/api/verify-login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: loginOtp }),
        credentials: "include", 
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.accessToken) setAccessToken(data.accessToken);
        window.dispatchEvent(new Event("auth-changed"));
        await handleSuccessfulLogin(data);
      } else {
        showNotification(data.message || "Invalid verification code");
      }
    } catch (err) {
      showNotification("Network error. Please check your connection");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setResendLoading(true);
    setNotification({ message: "", type: "" });
    
    try {
      const res = await fetch(`${API_URL}/api/resend-login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (res.ok) {
        showNotification(data.message || "Verification code resent", "success");
        setResendTimer(60);
      } else {
        showNotification(data.message || "Failed to resend verification code");
      }
    } catch (err) {
      showNotification("Network error. Please check your connection");
    } finally {
      setResendLoading(false);
    }
  };

  const navigateBasedOnRole = (user, replace = false) => {
    if (!user || !user.role) {
      showNotification("Invalid user data received");
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
          showNotification(`Invalid user role: ${role}`);
          navigate("/dashboard", navigateOptions);
          break;
      }
    } catch (navigationError) {
      showNotification("Navigation failed. Please refresh the page");
    }
  };

  const handleSendOtp = async () => {
    if (!email) {
      showNotification("Please enter your email");
      return;
    }
    
    setForgotLoading(true);
    setNotification({ message: "", type: "" });
    
    try {
      const res = await fetch(`${API_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        showNotification(data.message || "OTP sent to your email", "success");
        setForgotStep(2);
      } else {
        showNotification(data.message || "Failed to send OTP");
      }
    } catch (err) {
      showNotification("Network error. Please check your connection");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      showNotification("Please enter the OTP");
      return;
    }
    
    setForgotLoading(true);
    setNotification({ message: "", type: "" });
    
    try {
      const res = await fetch(`${API_URL}/api/verify-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (res.ok) {
        showNotification("OTP verified successfully", "success");
        setForgotStep(3);
      } else {
        showNotification(data.message || "Invalid OTP");
      }
    } catch (err) {
      showNotification("Network error. Please check your connection");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      showNotification("Please fill all fields");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showNotification("Passwords do not match");
      return;
    }

    setForgotLoading(true);
    setNotification({ message: "", type: "" });
    
    try {
      const res = await fetch(`${API_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword, confirmPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        showNotification(data.message || "Password reset successfully", "success");
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotStep(1);
          setOtp("");
          setNewPassword("");
          setConfirmPassword("");
        }, 2000);
      } else {
        showNotification(data.message || "Failed to reset password");
      }
    } catch (err) {
      showNotification("Network error. Please check your connection");
    } finally {
      setForgotLoading(false);
    }
  };

  const resetToLogin = () => {
    setShowOTPVerification(false);
    setShowForgotPassword(false);
    setLoginOtp("");
    setNotification({ message: "", type: "" });
    setPassword("");
    setResendTimer(0);
    setForgotStep(1);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const NotificationMessage = ({ message, type }) => {
    if (!message) return null;
    
    const bgColor = type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200";
    const textColor = type === "success" ? "text-green-700" : "text-red-700";
    
    return (
      <div className={`p-3 mb-4 rounded-md border ${bgColor} ${textColor} text-sm`}>
        {message}
      </div>
    );
  };

  return (
    <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-white p-6 rounded-lg shadow-xl w-70 max-w-sm relative">
        <button 
          onClick={closeModal} 
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-sm font-bold"
        >
          ✕
        </button>

        <h1 className="text-2xl text-black font-bold text-center mb-6">
          {showOTPVerification ? "Verify Login" : showForgotPassword ? "Reset Password" : "Login"}
        </h1>

        {showOTPVerification ? (
          <div>
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-600 mb-4">
                We've sent a 6-digit verification code to <strong>{email}</strong>
              </p>
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
                  className="w-full border text-black border-gray-300 rounded-md px-3 py-2 text-sm text-center tracking-wider shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="000000"
                  maxLength="6"
                  required
                  disabled={otpLoading}
                />
              </div>

              <NotificationMessage message={notification.message} type={notification.type} />

              <button
                type="submit"
                className="w-full bg-blue-500 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 mb-3"
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
                className="text-blue-500 hover:text-blue-700 font-medium text-sm disabled:opacity-50"
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
          <div>
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
                  className="w-full border text-black border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full border text-black border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="text-right mb-4">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-blue-500 hover:text-blue-700 text-xs font-medium focus:outline-none"
                  disabled={loading}
                >
                  Forgot Password?
                </button>
              </div>

              <NotificationMessage message={notification.message} type={notification.type} />

              <button
                type="submit"
                className="w-full bg-blue-500 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Login"}
              </button>
            </form>
          </div>
        ) : (
          /* Forgot Password Flow */
          <div>
            {forgotStep === 1 && (
              <div>
                <div className="mb-4">
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="reset-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full border text-black border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={forgotLoading}
                    required
                  />
                </div>
                
                <NotificationMessage message={notification.message} type={notification.type} />
                
                <button
                  onClick={handleSendOtp}
                  className="w-full bg-blue-500 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 mb-3"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Sending OTP..." : "Send OTP"}
                </button>
              </div>
            )}
            
            {forgotStep === 2 && (
              <div>
                <div className="mb-4">
                  <label htmlFor="reset-otp" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    id="reset-otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="w-full border text-black border-gray-300 rounded-md px-3 py-2 text-sm text-center tracking-wider shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength="6"
                    required
                  />
                </div>
                
                <NotificationMessage message={notification.message} type={notification.type} />
                
                <button
                  onClick={handleVerifyOtp}
                  className="w-full bg-blue-500 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 mb-3"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
            )}
            
            {forgotStep === 3 && (
              <div>
                <div className="mb-4">
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full border text-black border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full border text-black border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <NotificationMessage message={notification.message} type={notification.type} />
                
                <button
                  onClick={handleResetPassword}
                  className="w-full bg-green-500 text-white font-medium py-2 px-4 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 mb-3"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            )}
            
            <div className="text-center">
              <button
                type="button"
                onClick={resetToLogin}
                className="text-gray-500 hover:text-gray-700 text-sm"
                disabled={forgotLoading}
              >
                ← Back to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;