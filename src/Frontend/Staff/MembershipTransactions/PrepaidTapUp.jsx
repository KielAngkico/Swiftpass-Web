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
  const [pendingDebt, setPendingDebt] = useState(null);
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
        const prepaidPlans = data.filter((plan) => {
          const isPrepaid = plan.system_type === "prepaid_entry";
          const isSystemPlan = ['Key Fob', 'Membership Fee', 'Replacement Fee', 'Daily Session'].includes(plan.plan_name);
          return isPrepaid && !isSystemPlan;
        });
        setPlans(prepaidPlans);
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
if (data && data.system_type === "prepaid_entry") {
        data.admin_id = data.admin_id || adminId;
        data.member_id = data.id;
        setMember(data);

        // Check for pending debt
        try {
          const debtRes = await api.get(`/api/member-pending-debt/${data.id}`);
          setPendingDebt(debtRes.data);
        } catch {
          setPendingDebt(null);
        }
      } else {
        setMember(null);
        showToast({ message: "Member not found or not a prepaid account.", type: "error" });
      }
    } catch (err) {
      console.error("Error fetching member:", err);
      showToast({ message: "Member not found.", type: "error" });
      setMember(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

    if (pendingDebt?.has_pending && amountToCredit < pendingDebt.minimum_to_credit) {
      showToast({
        message: `Minimum top-up is ₱${pendingDebt.minimum_to_credit.toFixed(2)} to cover unpaid sessions.`,
        type: "error"
      });
      setLoading(false);
      return;
    }

const payload = {
      member_id: member.member_id || member.id,
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

    try 
    {console.log("🔍 Tapup payload:", JSON.stringify(payload, null, 2));
      await api.post("/api/tapup-member", payload);
      showToast({ message: "Tap-up successful!", type: "success" });
      setMember(null);
      setRfid("");
      setSelectedPlan(null);
      setCustomAmount("");
      setPaymentMethod("");
      setReference("");
    } catch (err) {
      console.error("Error submitting tap-up:", err);
      showToast({ message: "Failed to tap-up member.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-xs text-gray-500 mb-1";
  const readonlyClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 bg-gray-50 cursor-not-allowed";

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Prepaid Tap-Up</h1>
        <p className="text-xs text-gray-500 mt-0.5">Load prepaid credits to a member using RFID or manual entry.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="flex flex-col gap-4 h-full self-stretch">
            <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100">Member Lookup</p>
            <div className="space-y-3">
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
                <input
                  type="text"
                  value={member?.full_name || ""}
                  readOnly
                  placeholder="No member loaded"
                  className={readonlyClass}
                />
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
                <label className={labelClass}>Current Balance</label>
                <input
                  type="text"
                  value={member ? `₱${parseFloat(member.current_balance).toFixed(2)}` : ""}
                  readOnly
                  placeholder="—"
                  className={readonlyClass}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 h-full self-stretch">
            <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100">Top-Up & Payment</p>
            <div className="space-y-3">
<div>
                <label className={labelClass}>Select Plan</label>
                <select
                  value={selectedPlan?.plan_name || ""}
                  onChange={(e) => {
                    const plan = plans.find((p) => p.plan_name === e.target.value);
                    setSelectedPlan(plan);
                    setCustomAmount("");
                  }}
                  className={`${inputClass} bg-white`}
                >
                  <option value="">No plan / Custom amount</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.plan_name}>
                      {plan.plan_name}
                    </option>
                  ))}
                </select>
              </div>
<div>
                <label className={labelClass}>Amount to Pay</label>
                <input
                  type="text"
                  value={selectedPlan ? `₱${Number(selectedPlan.amount_to_pay).toFixed(2)}` : customAmount}
                  onChange={(e) => {
                    if (!selectedPlan) setCustomAmount(e.target.value.replace(/[^0-9.]/g, ""));
                  }}
                  readOnly={!!selectedPlan}
                  placeholder="Enter amount"
                  className={selectedPlan ? readonlyClass : inputClass}
                />
              </div>
              {selectedPlan && (
                <div>
                  <label className={labelClass}>Amount to Credit</label>
                  <input
                    type="text"
                    value={`₱${Number(selectedPlan.amount_to_credit).toFixed(2)}`}
                    readOnly
                    className={readonlyClass}
                  />
                </div>
              )}
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
                  <label className={labelClass}>Account Number</label>
                  <input
                    type="text"
                    value={paymentMethods.find(m => m.name.toLowerCase() === paymentMethod)?.reference_number || "—"}
                    readOnly
                    placeholder="—"
                    className={readonlyClass}
                  />
                </div>
              )}
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
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Processing..." : "Confirm Tap-Up"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 h-full self-stretch">
            <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100">Member Preview</p>
            <div className="flex flex-col items-center gap-2">
              <div className="w-80 h-80 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
                {member?.profile_image_url ? (
                  <img
                    src={member.profile_image_url}
                    alt="Member Photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-medium text-gray-300">
                    {member?.full_name ? member.full_name.charAt(0).toUpperCase() : "?"}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-gray-900 text-center">
                {member?.full_name || "No member loaded"}
              </p>
 {member && (
                <p className="text-xs text-gray-400 text-center">
                  Balance: ₱{parseFloat(member.current_balance).toFixed(2)}
                </p>
              )}
              {pendingDebt && pendingDebt.has_pending && (
                <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-center">
                  <p className="text-xs font-medium text-red-600">Member has unpaid sessions</p>
                  <p className="text-xs text-red-500 mt-0.5">
                    Owed: ₱{pendingDebt.total_owed.toFixed(2)}
                  </p>
                  <p className="text-xs text-red-500 mt-0.5">
                    Minimum to credit: ₱{pendingDebt.minimum_to_credit.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

export default PrepaidTapUp;