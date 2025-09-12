import React, { useState, useEffect } from "react";
import api from "../../../api"; 
const PrepaidTapUp = ({ rfid_tag, full_name, current_balance }) => {
  const [rfid, setRfid] = useState(rfid_tag || "");
  const [member, setMember] = useState(
    rfid_tag && full_name
      ? { rfid_tag, full_name, current_balance: parseFloat(current_balance) }
      : null
  );

  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [staffName, setStaffName] = useState("");
  const [adminId, setAdminId] = useState(null);
  const [message, setMessage] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const { data } = await api.get("/api/auth-status");
        if (!data.isAuthenticated || !data.user) throw new Error("Not authenticated");

        setStaffName(data.user.name);
        setAdminId(data.user.adminId);
      } catch (err) {
        console.error("❌ Failed to fetch staff user:", err);
        setMessage("Authentication required. Please login again.");
      }
    };
    fetchStaff();
  }, []);

  useEffect(() => {
    if (!adminId) return;

    const fetchPlans = async () => {
      try {
        const { data } = await api.get(`/api/get-pricing/${adminId}`);
        const prepaidPlans = data.filter((plan) => plan.system_type === "prepaid_entry");
        setPlans(prepaidPlans);
      } catch (err) {
        console.error("❌ Failed to fetch plans:", err);
      }
    };

    const fetchPaymentMethods = async () => {
      try {
        const { data } = await api.get(`/api/payment-methods/${adminId}`);
        setPaymentMethods(data);
      } catch (err) {
        console.error("❌ Failed to fetch payment methods:", err);
      }
    };

    fetchPlans();
    fetchPaymentMethods();
  }, [adminId]);

  const fetchMember = async () => {
    if (!rfid) return;
    try {
      const { data } = await api.get(`/api/member-by-rfid/${rfid}`);
      if (data && data.system_type === "prepaid_entry") {
        data.admin_id = data.admin_id || adminId;
        setMember(data);
        setMessage("");
      } else {
        setMember(null);
        setMessage("❌ Member not found or not a prepaid account.");
      }
    } catch (err) {
      console.error("Error fetching member:", err);
      setMessage("❌ Error fetching member.");
    }
  };

  
  const handleSubmit = async () => {
    if (!rfid || (!selectedPlan && !customAmount) || !paymentMethod) {
      setMessage("⚠️ Please complete all fields.");
      return;
    }

    const amountToPay = selectedPlan?.amount_to_pay || parseFloat(customAmount);
    const amountToCredit = selectedPlan?.amount_to_credit || parseFloat(customAmount);

    const payload = {
      rfid_tag: member?.rfid_tag || rfid,
      full_name: member?.full_name || full_name || "Unknown",
      admin_id: member?.admin_id || adminId,
      staff_name: staffName,
      plan_name: selectedPlan?.plan_name || "Custom",
      subscription_type: selectedPlan?.plan_name || "Custom",
      amount_to_pay: Number(amountToPay),
      amount_to_credit: Number(amountToCredit),
      payment_method: paymentMethod,
      reference: paymentMethod === "gcash" ? reference : null,
    };

    try {
      const { data } = await api.post("/api/tapup-member", payload);
      setMessage("✅ Tap-up successful!");
      setMember(null);
      setRfid("");
      setSelectedPlan(null);
      setCustomAmount("");
      setPaymentMethod("");
      setReference("");
    } catch (err) {
      console.error("❌ Error submitting tap-up:", err);
      setMessage("❌ Failed to tap-up member.");
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex gap-6">
      {/* Left: Tap-Up Form */}
      <div className="flex-1">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">
          Prepaid Tap-Up
        </h2>

        {/* RFID Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">
            Scan or Enter RFID
          </label>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={rfid}
              onChange={(e) => setRfid(e.target.value)}
              placeholder="Enter RFID tag"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none"
            />
            <button
              onClick={fetchMember}
              className="bg-black text-white px-5 py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              Search
            </button>
          </div>
        </div>

        {/* Plan Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">
            Select Top-Up Plan
          </label>
          <select
            value={selectedPlan?.plan_name || ""}
            onChange={(e) => {
              const plan = plans.find((p) => p.plan_name === e.target.value);
              setSelectedPlan(plan);
              setCustomAmount("");
            }}
            className="w-full p-3 border rounded-lg mt-2 focus:ring-2 focus:ring-black focus:border-black outline-none"
          >
            <option value="">-- Choose a Plan (or enter custom) --</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.plan_name}>
                {plan.plan_name} — ₱{plan.amount_to_pay} → ₱
                {plan.amount_to_credit}
              </option>
            ))}
          </select>
        </div>

        {/* Manual Input */}
        {!selectedPlan && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">
              Amount
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full p-3 border rounded-lg mt-2 focus:ring-2 focus:ring-black focus:border-black outline-none"
            />
          </div>
        )}

        {/* Payment Method */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-3 border rounded-lg mt-2 focus:ring-2 focus:ring-black focus:border-black outline-none"
            >
              <option value="">Select</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.name.toLowerCase()}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>

          {paymentMethod === "gcash" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                GCash Ref No.
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="GCash Reference"
                className="w-full p-3 border rounded-lg mt-2 focus:ring-2 focus:ring-black focus:border-black outline-none"
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition"
        >
          Confirm Tap-Up
        </button>

        {/* Message */}
        {message && (
          <p className="mt-6 text-center text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border">
            {message}
          </p>
        )}
      </div>

      {/* Right: Member ID Card */}
      <div className="w-80 mt-20">
        <div className="bg-white border rounded-2xl shadow-lg overflow-hidden w-full">
          {/* Banner */}
          <div className="bg-black h-20 flex items-center justify-center">
            <h3 className="text-white font-bold text-lg">GYM MEMBER ID</h3>
          </div>

          {/* Profile Section */}
          <div className="flex flex-col items-center p-6">
            <div className="w-40 h-40 bg-gray-200 flex items-center justify-center overflow-hidden mb-4">
              {member?.profile_image_url ? (
                <img src={member.profile_image_url} alt="Member Photo" />
              ) : (
                <span className="text-2xl text-gray-500 font-bold">
                  {member?.full_name
                    ? member.full_name.charAt(0).toUpperCase()
                    : "?"}
                </span>
              )}
            </div>

            <h4 className="text-lg font-semibold text-gray-900">
              {member?.full_name || "No Member Loaded"}
            </h4>
            <p className="text-sm text-gray-600 mb-2">
              Balance:{" "}
              <span className="font-medium">
                {member
                  ? `₱${parseFloat(member.current_balance).toFixed(2)}`
                  : "N/A"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrepaidTapUp;
