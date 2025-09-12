
import React, { useState } from "react";
import { API_URL } from "../config";

const ForgotPassword = ({ closeModal }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOtp = async () => {
    if (!email) return alert("Email is required");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setOtpSent(true);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <button className="absolute top-2 right-2" onClick={closeModal}>✕</button>
        <h2 className="text-xl font-bold mb-4">Forgot Password</h2>

        {!otpSent ? (
          <>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded mb-4"
              disabled={loading}
            />
            <button
              onClick={handleSendOtp}
              className="w-full bg-blue-500 text-white py-2 rounded"
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </>
        ) : (
          <ResetPassword email={email} closeModal={closeModal} />
        )}

        {message && <p className="text-green-600 mt-3">{message}</p>}
      </div>
    </div>
  );
};

export default ForgotPassword;
