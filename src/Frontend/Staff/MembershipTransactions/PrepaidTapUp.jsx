import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import { useToast } from "../../../components/ToastManager";

const PrepaidTapUp = ({ rfid_tag, full_name, current_balance, staffUser }) => {
  const staffName = staffUser?.name || "";
  const adminId = staffUser?.adminId || staffUser?.admin_id || staffUser?.userId;
  const navigate = useNavigate();

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
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (rfid_tag && full_name) {
      setMember({ rfid_tag, full_name, current_balance: parseFloat(current_balance) });
    }
  }, [rfid_tag, full_name, current_balance]);

  useEffect(() => {
    if (!adminId) return;

    const fetchPlans = async () => {
      try {
        const { data } = await api.get(`/api/get-pricing/${adminId}`);
        
        // Filter prepaid plans and exclude system plans
        const prepaidPlans = data.filter((plan) => {
          const isPrepaid = plan.system_type === "prepaid_entry";
          const isSystemPlan = ['Key Fob', 'Membership Fee', 'Replacement Fee', 'Daily Session'].includes(plan.plan_name);
          
          // Only include prepaid plans that are NOT system plans
          return isPrepaid && !isSystemPlan;
        });
        
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
    if (rfid && rfid.length >= 8 && adminId) {
      fetchMember();
    }
  }, [rfid, adminId]);

  const fetchMember = async () => {
    if (!rfid || !adminId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/member-by-rfid/${rfid}`);
      if (data && data.system_type === "prepaid_entry") {
        data.admin_id = data.admin_id || adminId;
        setMember(data);
      } else {
        setMember(null);
        showToast({ message: "Member not found or not a prepaid account.", type: "error" });
      }
    } catch (err) {
      console.error("Error fetching member:", err);
      showToast({ message: "Error fetching member data.", type: "error" });
      setMember(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!member || (!selectedPlan && !customAmount) || !paymentMethod || !staffName) {
      showToast({ message: "Please complete all required fields.", type: "error" });
      return;
    }

    if (paymentMethod && paymentMethod.toLowerCase() !== "cash" && !reference) {
      showToast({ message: "Please enter payment reference number.", type: "error" });
      return;
    }

    setLoading(true);

    const amountToPay = selectedPlan?.amount_to_pay || parseFloat(customAmount);
    const amountToCredit = selectedPlan?.amount_to_credit || parseFloat(customAmount);

    const payload = {
      rfid_tag: member.rfid_tag,
      full_name: member.full_name,
      admin_id: member.admin_id || adminId,
      staff_name: staffName,
      plan_name: selectedPlan?.plan_name || "Custom",
      subscription_type: selectedPlan?.plan_name || "Custom",
      amount_to_pay: Number(amountToPay),
      amount_to_credit: Number(amountToCredit),
      payment_method: paymentMethod.toLowerCase().includes("gcash") ? "gcash" : paymentMethod,
      reference: paymentMethod.toLowerCase().includes("gcash") || paymentMethod.toLowerCase() !== "cash" ? reference || "" : null
    };

    console.log("📤 Payload to submit:", payload);

    try {
      const { data } = await api.post("/api/tapup-member", payload);
      
      showToast({ message: "Tap-up successful!", type: "success" });
      setMember(null);
      setRfid("");
      setSelectedPlan(null);
      setCustomAmount("");
      setPaymentMethod("");
      setReference("");
    } catch (err) {
      console.error("❌ Error submitting tap-up:", err);
      showToast({ message: "Failed to tap-up member.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-fit bg-white p-2">
      <main className="max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
            Prepaid Tap-Up
          </h1>
          <p className="text-xs text-gray-500">
            Load prepaid credits to a member using RFID or manual entry.
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
              Tap-Up Details & Payment
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
                Select Top-Up Plan
              </label>
              <select
                value={selectedPlan?.plan_name || ""}
                onChange={(e) => {
                  const plan = plans.find((p) => p.plan_name === e.target.value);
                  setSelectedPlan(plan);
                  setCustomAmount("");
                }}
                className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-white"
              >
                <option value="">-- Choose a Plan (or enter custom) --</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.plan_name}>
                    {plan.plan_name} — ₱{plan.amount_to_pay} → ₱{plan.amount_to_credit}
                  </option>
                ))}
              </select>
            </div>

            {!selectedPlan && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">Amount</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                />
              </div>
            )}

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
                  {paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Reference No.
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
              disabled={loading}
              className="w-1/2 mt-4 px-4 py-2 rounded bg-black text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Confirm Tap-Up"}
            </button>
          </div>

          <div className="flex flex-col items-center gap-3 w-80">
            <h2 className="text-sm font-semibold text-gray-700">Member ID</h2>
            <div className="bg-white border rounded-lg shadow w-3/4">
              <div className="bg-black h-16 flex items-center justify-center">
                <h3 className="text-white font-semibold text-sm">GYM MEMBER ID</h3>
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
        </form>
      </main>
    </div>
  );
};

export default PrepaidTapUp;