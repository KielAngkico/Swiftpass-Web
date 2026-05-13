import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import { useToast } from "../../../components/ToastManager";

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
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

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
        const subscriptionPlans = data.filter((plan) => {
          const isSubscription = plan.system_type === "subscription";
          const isSystemPlan = ['Key Fob', 'Membership Fee', 'Replacement Fee', 'Daily Session'].includes(plan.plan_name);
          return isSubscription && !isSystemPlan;
        });
        setPlans(subscriptionPlans);
      } catch (err) {
        console.error("Failed to fetch plans:", err);
      }
    };

    const fetchPaymentMethods = async () => {
      try {
        const { data } = await api.get(`/api/payment-methods/${adminId}`);
        setPaymentMethods(data);
      } catch (err) {
        console.error("Failed to fetch payment methods:", err);
      }
    };

    fetchPlans();
    fetchPaymentMethods();
  }, [adminId]);

  useEffect(() => {
    if (rfid && rfid.length >= 8 && adminId) {
      fetchMember();
    }
  }, [rfid, adminId]);

const fetchMember = async () => {
    if (!rfid || !adminId) return;
    setLoading(true);
    try {
      let data;
      try {
        const res = await api.get(`/api/member-by-rfid/${rfid}`);
        data = res.data;
      } catch {
        const res = await api.get(`/api/member-by-id/${rfid}`);
        data = res.data;
      }
      if (data && data.system_type === "subscription") {
        data.admin_id = data.admin_id || adminId;
        data.member_id = data.id;
        setMember(data);
      } else {
        setMember(null);
        showToast({ message: "Member not found or not a subscription account.", type: "error" });
      }
    } catch (err) {
      console.error("Error fetching member:", err);
      showToast({ message: "Member not found.", type: "error" });
      setMember(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!member || !selectedPlan || !paymentMethod || !staffName || !amountToPay) {
      showToast({ message: "Please complete all required fields.", type: "error" });
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
        member_id: member.member_id || member.id,
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
      console.log("🔍 Renewal payload:", JSON.stringify(payload, null, 2));
      await api.post("/api/renew-subscription", payload);

      showToast({ message: "Subscription renewed successfully!", type: "success" });
      setMember(null);
      setRfid("");
      setSelectedPlan(null);
      setAmountToPay("");
      setPaymentMethod("");
      setReference("");
    } catch (err) {
      console.error("Error submitting renewal:", err);
      showToast({ message: "Failed to renew subscription.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-xs text-gray-500 mb-1";
  const readonlyClass = "w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 bg-gray-50 cursor-not-allowed";

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Subscription Renewal</h1>
        <p className="text-xs text-gray-500 mt-0.5">Renew a member's subscription using RFID or manual entry.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-900 pb-2 border-b border-gray-100">Member Lookup</p>
            <div className="space-y-2">
              <div>
                <label className={labelClass}>Scan RFID or Enter Member ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rfid}
                    onChange={(e) => setRfid(e.target.value)}
                    placeholder="Enter RFID tag"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={fetchMember}
                    className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap"
                  >
                    Search
                  </button>
                </div>
              </div>
<div>
                <label className={labelClass}>Member Name</label>
                <input type="text" value={member?.full_name || ""} readOnly placeholder="No member loaded" className={readonlyClass} />
<div>
  <label className={labelClass}>Customer ID</label>
  <input
    type="text"
    value={member?.customer_number_display || ""}
    readOnly
    placeholder="—"
    className={readonlyClass}
  />
</div>
              </div>
              <div>
                <label className={labelClass}>Current Expiry</label>
                <input type="text" value={member?.subscription_expiry || ""} readOnly placeholder="—" className={readonlyClass} />
              </div>
              {member?.subscription_type && (
                <div>
                  <label className={labelClass}>Current Plan</label>
                  <input type="text" value={member.subscription_type} readOnly className={readonlyClass} />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-900 pb-2 border-b border-gray-100">Renewal & Payment</p>
            <div className="space-y-2">
              <div>
                <label className={labelClass}>Select Renewal Plan</label>
                <select
                  value={selectedPlan?.plan_name || ""}
                  onChange={(e) => {
                    const plan = plans.find((p) => p.plan_name === e.target.value);
                    setSelectedPlan(plan);
                    setAmountToPay(plan ? plan.amount_to_pay : "");
                  }}
                  className={`${inputClass} bg-white`}
                >
                  <option value="">Choose a plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.plan_name}>
                      {plan.plan_name} — ₱{plan.amount_to_pay} for {plan.duration_in_days} day{plan.duration_in_days > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Amount to Pay</label>
                <input
                  type="text"
                  value={amountToPay}
                  onChange={(e) => setAmountToPay(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="Enter amount to pay"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={`${inputClass} bg-white`}
                >
                  <option value="">Select</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.name.toLowerCase()}>{method.name}</option>
                  ))}
                </select>
              </div>
              {paymentMethod !== "cash" && paymentMethod !== "" && (
                <div>
                  <label className={labelClass}>
                    {paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Reference No.
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Reference number"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Processing..." : "Confirm Renewal"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-900 pb-2 border-b border-gray-100">Member Preview</p>
            <div className="flex flex-col items-center gap-2">
              <div className="w-80 h-80 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
                {member?.profile_image_url ? (
                  <img src={member.profile_image_url} alt="Member Photo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-medium text-gray-300">
                    {member?.full_name ? member.full_name.charAt(0).toUpperCase() : "?"}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-gray-900 text-center">
                {member?.full_name || "No member loaded"}
              </p>
              {member?.subscription_type && (
                <p className="text-xs text-gray-400 text-center">Plan: {member.subscription_type}</p>
              )}
              {member?.subscription_expiry && (
                <p className="text-xs text-gray-400 text-center">Expires: {member.subscription_expiry}</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SubscriptionRenewal;