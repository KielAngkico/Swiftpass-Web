import React, { useState, useEffect } from "react";
import api from "../../../api";
import { useToast } from "../../../components/ToastManager";

const SubscriptionPricing = () => {
  const [adminId, setAdminId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    plan_name: "",
    amount_to_pay: "",
    duration_in_days: "",
  });

  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ name: "", reference_number: "" });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [activeTab, setActiveTab] = useState("plans");
  const { showToast, showConfirm } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user) throw new Error("Not authenticated");
        const id = data.user.adminId || data.user.id;
        if (!id) throw new Error("Missing admin ID");
        setAdminId(id);
      } catch (err) {
        console.error("Failed to fetch user in SubscriptionPricing:", err);
        if (err.response?.status === 401) window.location.href = "/login";
      }
    };
    fetchUser();
  }, []);

  const fetchPlans = async () => {
    if (!adminId) return;
    try {
      const { data } = await api.get(`/api/get-pricing/${adminId}`);
      setPlans(data.filter((plan) => plan.system_type === "subscription"));
    } catch (err) {
      console.error("Failed to fetch subscription plans:", err);
    }
  };

  const fetchPaymentMethods = async () => {
    if (!adminId) return;
    try {
      const { data } = await api.get(`/api/payment-methods/${adminId}`);
      setPaymentMethods(data);
    } catch (err) {
      console.error("Failed to fetch payment methods:", err);
    }
  };

  useEffect(() => {
    if (!adminId) return;
    fetchPlans();
    fetchPaymentMethods();
  }, [adminId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adminId) return;
    const url = editingId ? `/api/update-pricing/${editingId}` : "/api/add-pricing";
    const method = editingId ? "put" : "post";
    try {
      const { data } = await api[method](url, {
        ...form,
        system_type: "subscription",
        admin_id: adminId,
      });
      showToast({ message: data.message, type: "success" });
      setForm({ plan_name: "", amount_to_pay: "", duration_in_days: "" });
      setEditingId(null);
      fetchPlans();
    } catch (err) {
      console.error("Failed to save subscription plan:", err);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!adminId) return;
    const url = editingPaymentId
      ? `/api/update-payment-method/${editingPaymentId}`
      : "/api/add-payment-method";
    const method = editingPaymentId ? "put" : "post";
    try {
      const { data } = await api[method](url, { admin_id: adminId, ...paymentForm });
      showToast({ message: data.message, type: "success" });
      setPaymentForm({ name: "", reference_number: "" });
      setEditingPaymentId(null);
      setIsAddingPayment(false);
      fetchPaymentMethods();
    } catch (err) {
      console.error("Failed to save payment method:", err);
    }
  };

  const handleEdit = (plan) => {
    setForm({
      plan_name: plan.plan_name,
      amount_to_pay: plan.amount_to_pay,
      duration_in_days: plan.duration_in_days || "",
    });
    setEditingId(plan.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    showConfirm("Are you sure you want to delete this plan?", async () => {
      try {
        const { data } = await api.delete(`/api/delete-pricing/${id}`);
        showToast({ message: data.message, type: "success" });
        fetchPlans();
      } catch (err) {
        showToast({ message: err.response?.data?.error || "Failed to delete plan", type: "error" });
      }
    });
  };

  const handleEditPayment = (payment) => {
    setPaymentForm({ name: payment.name, reference_number: payment.reference_number || "" });
    setEditingPaymentId(payment.id);
    setIsAddingPayment(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeletePayment = async (id) => {
    showConfirm("Are you sure you want to delete this payment method?", async () => {
      try {
        const { data } = await api.delete(`/api/delete-payment-method/${id}`);
        showToast({ message: data.message, type: "success" });
        fetchPaymentMethods();
      } catch (err) {
        showToast({ message: err.response?.data?.error || "Failed to delete payment method", type: "error" });
      }
    });
  };

  const editingPlan = plans.find((p) => p.id === editingId);

  return (
    <div>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Subscription Pricing</h1>
        <p className="text-xs text-gray-500 mt-0.5">Manage subscription plans and payment methods</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 border border-gray-200 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === "plans"
              ? "bg-white text-gray-900 border border-gray-200 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Plans
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === "payments"
              ? "bg-white text-gray-900 border border-gray-200 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Payment Methods
        </button>
      </div>

      {/* ── PLANS TAB ── */}
      {activeTab === "plans" && (
        <div className="flex gap-5 items-start">
          {/* Left: Form */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-medium text-gray-900 mb-3 pb-3 border-b border-gray-100">
                {editingId ? "Edit plan" : "Add plan"}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Plan name</label>
                  <input
                    type="text"
                    placeholder="e.g. Monthly, Quarterly"
                    value={form.plan_name}
                    onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                    disabled={editingPlan?.is_deletable === 0}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Price (₱)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={form.amount_to_pay}
                      onChange={(e) => setForm({ ...form, amount_to_pay: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Duration (days)</label>
                    <input
                      type="number"
                      placeholder="30"
                      value={form.duration_in_days}
                      onChange={(e) => setForm({ ...form, duration_in_days: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                      disabled={editingPlan?.is_deletable === 0}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  {editingId ? "Update plan" : "Save plan"}
                </button>
                {editingId && (
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setForm({ plan_name: "", amount_to_pay: "", duration_in_days: "" });
                    }}
                    className="px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Plan cards */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Default Plans */}
            {(() => {
              const defaultPlans = plans.filter((p) => p.is_deletable === 0);
              if (defaultPlans.length === 0) return null;
              return (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-medium text-gray-900">Default Pricing</h2>

                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                    {defaultPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`bg-gray-50 border rounded-xl p-4 flex flex-col ${
                          editingId === plan.id
                            ? "border-blue-400 ring-1 ring-blue-200"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-gray-700 truncate">{plan.plan_name}</p>
                          <span className="text-[10px] text-gray-400 ml-1 flex-shrink-0"></span>
                        </div>
                        <p className="text-base font-semibold text-blue-500 mb-1.5">
                          ₱{parseFloat(plan.amount_to_pay).toLocaleString()}
                        </p>
                        <span className="inline-block text-[11px] bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2.5 py-0.5 w-fit mb-3">
                          {plan.duration_in_days} days
                        </span>
                        <div className="mt-auto pt-2.5 border-t border-gray-200">
                          <button
                            onClick={() => handleEdit(plan)}
                            className="w-full bg-white text-gray-600 border border-gray-200 rounded-lg py-1.5 text-[11px] font-medium hover:bg-gray-100 transition-colors"
                          >
                            Edit amount
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Custom Plans */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-900">Your Plans</h2>
                <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                  {plans.filter((p) => p.is_deletable !== 0).length} custom
                </span>
              </div>
              {plans.filter((p) => p.is_deletable !== 0).length === 0 ? (
                <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <p className="text-sm text-gray-400">No custom plans yet.</p>
                  <p className="text-xs text-gray-300 mt-1">Use the form on the left to add one.</p>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                  {plans.filter((p) => p.is_deletable !== 0).map((plan) => (
                    <div
                      key={plan.id}
                      className={`bg-white border rounded-xl p-4 flex flex-col ${
                        editingId === plan.id
                          ? "border-blue-400 ring-1 ring-blue-200"
                          : "border-gray-200"
                      }`}
                    >
                      <p className="text-xs font-medium text-gray-900 leading-snug mb-1 truncate">
                        {plan.plan_name}
                      </p>
                      <p className="text-base font-semibold text-blue-600 mb-1.5">
                        ₱{parseFloat(plan.amount_to_pay).toLocaleString()}
                      </p>
                      <span className="inline-block text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-0.5 w-fit mb-3">
                        {plan.duration_in_days} days
                      </span>
                      <div className="flex gap-1.5 mt-auto pt-2.5 border-t border-gray-100">
                        <button
                          onClick={() => handleEdit(plan)}
                          className="flex-1 bg-white text-gray-700 border border-gray-200 rounded-lg py-1.5 text-[11px] font-medium hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="flex-1 bg-white text-red-500 border border-red-100 rounded-lg py-1.5 text-[11px] font-medium hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── PAYMENT METHODS TAB ── */}
      {activeTab === "payments" && (
        <div className="flex gap-5 items-start">
          {/* Left: Form */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-medium text-gray-900 mb-3 pb-3 border-b border-gray-100">
                {editingPaymentId ? "Edit payment method" : "Add payment method"}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Method name</label>
                  <input
                    type="text"
                    placeholder="e.g. GCash, PayMaya, Bank Transfer"
                    value={paymentForm.name}
                    onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Reference number (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 09xx-xxx-xxxx"
                    value={paymentForm.reference_number}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={handlePaymentSubmit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  {editingPaymentId ? "Update" : "Add payment method"}
                </button>
                {editingPaymentId && (
                  <button
                    onClick={() => {
                      setEditingPaymentId(null);
                      setIsAddingPayment(false);
                      setPaymentForm({ name: "", reference_number: "" });
                    }}
                    className="px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Payment methods table */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-medium text-gray-900">Payment methods</h2>
              <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                {paymentMethods.length} {paymentMethods.length === 1 ? "method" : "methods"}
              </span>
            </div>

            {paymentMethods.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-sm text-gray-400">No payment methods configured.</p>
                <p className="text-xs text-gray-300 mt-1">Use the form to add one.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Method</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Reference</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paymentMethods.map((pm) => (
                      <tr key={pm.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{pm.name}</span>
                            {pm.is_default === 1 && (
                              <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {pm.reference_number || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => handleEditPayment(pm)}
                              className="px-2.5 py-1 bg-white text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                            >
                              Edit
                            </button>
                            {pm.is_default === 1 ? (
                              <span className="px-2.5 py-1 bg-gray-50 text-gray-400 border border-gray-100 rounded-lg text-xs">
                                 Default
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDeletePayment(pm.id)}
                                className="px-2.5 py-1 bg-white text-red-500 border border-red-100 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPricing;