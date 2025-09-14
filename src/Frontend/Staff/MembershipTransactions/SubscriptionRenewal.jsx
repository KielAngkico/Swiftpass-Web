import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";

const SubscriptionRenewal = ({ rfid_tag, full_name, subscription_expiry, staffUser }) => {
  const staffName = staffUser?.name || "";
  const adminId = staffUser?.adminId || staffUser?.admin_id || staffUser?.userId;
  const navigate = useNavigate();

  const [rfid, setRfid] = useState(rfid_tag || "");
  const [member, setMember] = useState(
    rfid_tag && full_name
      ? { rfid_tag, full_name, subscription_expiry, subscription_type: null }
      : null
  );

  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [amountToPay, setAmountToPay] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rfid_tag && full_name) {
      setMember({ rfid_tag, full_name, subscription_expiry, subscription_type: null });
    }
  }, [rfid_tag, full_name, subscription_expiry]);


   useEffect(() => {
    if (!adminId) return;

    const fetchPlans = async () => {
      try {
        const { data } = await api.get(`/api/get-pricing/${adminId}`);
        const prepaidPlans = data.filter((plan) => plan.system_type === "subscription");
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

  useEffect(() => {
    if (rfid && rfid.length >= 8) fetchMember();
  }, [rfid]);

  const fetchMember = async () => {
    if (!rfid) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/member-by-rfid/${rfid}`);
      if (data && data.system_type === "subscription") {
        data.admin_id = data.admin_id || adminId;
        setMember(data);
        setMessage("");
      } else {
        setMember(null);
        setMessage("❌ Member not found or not a subscription account.");
      }
    } catch (err) {
      console.error("❌ Error fetching member:", err);
      setMessage("❌ Error fetching member data.");
      setMember(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!member || !selectedPlan || !paymentMethod || !staffName || !amountToPay) {
      setMessage("⚠️ Please complete all required fields.");
      return;
    }

    setLoading(true);
    try {
      const currentExpiry = new Date(member.subscription_expiry);
      const baseDate = isNaN(currentExpiry.getTime()) ? new Date() : currentExpiry;
      const start = baseDate.toISOString().split("T")[0];
      const expiry = new Date(baseDate);
      expiry.setDate(expiry.getDate() + selectedPlan.duration_in_days);
      const end = expiry.toISOString().split("T")[0];

 const payload = {
  rfid_tag: member.rfid_tag,
  full_name: member.full_name,
  admin_id: member.admin_id || adminId,
  staff_name: staffName,
  plan_name: selectedPlan.plan_name,
  payment: Number(amountToPay),
  subscription_type: selectedPlan.plan_name,
  subscription_start: start,
  subscription_expiry: end,
  payment_Method: paymentMethod.toLowerCase().includes("gcash") ? "gcash" : paymentMethod, 
  reference: paymentMethod.toLowerCase().includes("gcash") ? reference || "" : null
};

      console.log("📤 Payload to submit:", payload);

      const { data } = await api.post("/api/renew-subscription", payload);

      setMessage("✅ Subscription renewed successfully!");
      setMember(null);
      setRfid("");
      setSelectedPlan(null);
      setAmountToPay("");
      setPaymentMethod("");
      setReference("");
    } catch (err) {
      console.error("❌ Error submitting renewal:", err);
      setMessage("❌ Failed to renew subscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="p-6 bg-gray-50 min-h-screen flex gap-6">
    {/* Left: Renewal Form */}
    <div className="flex-1">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Subscription Renewal
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
          Select Renewal Plan
        </label>
        <select
          value={selectedPlan?.plan_name || ""}
          onChange={(e) => {
            const plan = plans.find((p) => p.plan_name === e.target.value);
            setSelectedPlan(plan);
            setAmountToPay(plan ? plan.amount_to_pay : "");
          }}
          className="w-full p-3 border rounded-lg mt-2 focus:ring-2 focus:ring-black focus:border-black outline-none"
        >
          <option value="">-- Choose a Plan --</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.plan_name}>
              {plan.plan_name} — ₱{plan.amount_to_pay} for{" "}
              {plan.duration_in_days} day
              {plan.duration_in_days > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Amount to Pay */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700">
          Amount to Pay
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amountToPay}
          onChange={(e) => setAmountToPay(e.target.value)}
          placeholder="Enter amount to pay"
          className="w-full p-3 border rounded-lg mt-2 focus:ring-2 focus:ring-black focus:border-black outline-none"
        />
      </div>

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

{paymentMethod !== "cash" && paymentMethod !== "" && (
  <div>
    <label className="block text-sm font-medium">
      {paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Reference No.
    </label>
    <input
      type="text"
      value={reference}
      onChange={(e) => setReference(e.target.value)}
      className="w-full p-3 border rounded-lg mt-2 focus:ring-2 focus:ring-black focus:border-black outline-none"
      required
    />
  </div>
)}
</div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition"
      >
        Confirm Renewal
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
      <div className="bg-white border rounded-2xl shadow-lg overflow-hidden">
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
            Plan:{" "}
            <span className="font-medium">
              {member?.subscription_type || "N/A"}
            </span>
          </p>
          <p className="text-sm text-gray-600">
            Expires:{" "}
            <span className="font-medium">
              {member?.subscription_expiry || "N/A"}
            </span>
          </p>
        </div>
      </div>
    </div>
  </div>
);

};

export default SubscriptionRenewal;