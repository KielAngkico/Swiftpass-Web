import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import { API_URL } from "../config";

const ChangePassword = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [notification, setNotification] = useState({ message: "", type: "" });

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setLoading(false);
      setResendTimer(0);
      setNotification({ message: "", type: "" });
    }
  }, [isOpen]);

  useEffect(() => {
    let t;
    if (resendTimer > 0) t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const showNotification = (message, type = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: "" }), 5000);
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Verification code sent to your email", "success");
        setStep(2);
        setResendTimer(60);
      } else {
        showNotification(data.message || "Failed to send code");
      }
    } catch {
      showNotification("Network error. Please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("New code sent", "success");
        setResendTimer(60);
      } else {
        showNotification(data.message || "Failed to resend");
      }
    } catch {
      showNotification("Network error. Please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      showNotification("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/verify-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Code verified", "success");
        setStep(3);
      } else {
        showNotification(data.message || "Invalid code");
      }
    } catch {
      showNotification("Network error. Please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      showNotification("Please fill in both fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      showNotification("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Password changed successfully", "success");
        setTimeout(() => onClose(), 1500);
      } else {
        showNotification(data.message || "Failed to reset password");
      }
    } catch {
      showNotification("Network error. Please try again");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const steps = ["Send code", "Verify", "New password"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Change Password</span>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-600 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pt-4 pb-1">
          <div className="flex items-center gap-1 mb-5">
            {steps.map((label, i) => {
              const idx = i + 1;
              const active = step === idx;
              const done = step > idx;
              return (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${
                      done ? "bg-green-500 text-white" : active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
                    }`}>
                      {done ? "✓" : idx}
                    </div>
                    <span className={`text-[10px] whitespace-nowrap ${active ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                      {label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-px mx-1 ${done ? "bg-green-300" : "bg-gray-200"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="px-5 pb-5">
          {notification.message && (
            <div className={`mb-4 px-3 py-2 rounded-lg text-xs border ${
              notification.type === "success"
                ? "bg-green-50 text-green-700 border-green-100"
                : "bg-red-50 text-red-600 border-red-100"
            }`}>
              {notification.message}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                We will send a verification code to:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-700 font-medium">
                {user?.email}
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send verification code"}
                </button>
                <button
                  onClick={onClose}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Enter the 6-digit code sent to <span className="font-medium text-gray-700">{user?.email}</span>
              </p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 text-center tracking-widest placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="text-center">
                <button
                  onClick={handleResend}
                  disabled={resendTimer > 0 || loading}
                  className="text-xs text-blue-500 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
                </button>
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify code"}
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save new password"}
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;