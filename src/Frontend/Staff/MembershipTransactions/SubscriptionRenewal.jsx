

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
      
      // Filter subscription plans and exclude system plans
      const subscriptionPlans = data.filter((plan) => {
        const isSubscription = plan.system_type === "subscription";
        const isSystemPlan = ['Key Fob', 'Membership Fee', 'Replacement Fee', 'Daily Session'].includes(plan.plan_name);
        
        // Only include subscription plans that are NOT system plans
        return isSubscription && !isSystemPlan;
      });
      
      setPlans(subscriptionPlans);
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
  <div className="min-h-screen w-fit bg-white p-2">
    <main className="max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
          Subscription Renewal
        </h1>
        <p className="text-xs text-gray-500">
          Renew a member’s subscription using RFID or manual entry.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white rounded-lg shadow items-start"
      >
        <div className="flex flex-col gap-4 h-full">
          <h2 className="text-sm font-semibold text-gray-700">
            Renewal Details & Payment
          </h2>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Scan or Enter RFID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={rfid}
                onChange={(e) => setRfid(e.target.value)}
                placeholder="Enter RFID tag"
                className="w-full border border-gray-300 px-3 py-2 rounded text-sm focus:ring focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={fetchMember}
                className="px-4 py-2 rounded bg-black text-white font-semibold text-sm hover:bg-blue-700"
              >
                Search
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Select Renewal Plan
            </label>
            <select
              value={selectedPlan?.plan_name || ""}
              onChange={(e) => {
                const plan = plans.find((p) => p.plan_name === e.target.value);
                setSelectedPlan(plan);
                setAmountToPay(plan ? plan.amount_to_pay : "");
              }}
              className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-white"
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

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Amount to Pay
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountToPay}
              onChange={(e) => setAmountToPay(e.target.value)}
              placeholder="Enter amount to pay"
              className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-white"
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
              <label className="block text-xs text-gray-600 mb-1">
                {paymentMethod.charAt(0).toUpperCase() +
                  paymentMethod.slice(1)}{" "}
                Reference No.
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="w-1/2 mt-4 px-4 py-2 rounded bg-black text-white font-semibold text-sm hover:bg-blue-700"
          >
            Confirm Renewal
          </button>

          {message && <p className="text-xs text-gray-500 mt-2">{message}</p>}
        </div>

        <div className="flex flex-col items-center gap-3 w-80">
          <h2 className="text-sm font-semibold text-gray-700">Member ID</h2>
          <div className="bg-white border rounded-lg shadow w-3/4">
            <div className="bg-black h-16 flex items-center justify-center">
              <h3 className="text-white font-semibold text-sm">
                GYM MEMBER ID
              </h3>
            </div>
            <div className="flex flex-col items-center p-4">
              <div className="w-32 h-32 border border-gray-300 rounded flex items-center justify-center bg-gray-50 overflow-hidden mb-3">
                {member?.profile_image_url ? (
                  <img
                    src={member.profile_image_url}
                    alt="Member Photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">
                    {member?.full_name
                      ? member.full_name.charAt(0).toUpperCase()
                      : "?"}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-semibold text-gray-800">
                {member?.full_name || "No Member Loaded"}
              </h4>
              <p className="text-xs text-gray-600">
                Plan:{" "}
                <span className="font-medium">
                  {member?.subscription_type || "N/A"}
                </span>
              </p>
              <p className="text-xs text-gray-600">
                Expires:{" "}
                <span className="font-medium">
                  {member?.subscription_expiry || "N/A"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </form>
    </main>
  </div>
);

};

export default SubscriptionRenewal;
