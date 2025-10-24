import React, { useState, useEffect } from "react";
import api from "../../../api";

const SubscriptionPricing = () => {
  const [adminId, setAdminId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user) throw new Error("Not authenticated");
        const id = data.user.adminId || data.user.id;
        if (!id) throw new Error("Missing admin ID");
        setAdminId(id);
      } catch (err) {
        console.error("❌ Failed to fetch user in SubscriptionPricing:", err);
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
      console.error("❌ Failed to fetch subscription plans:", err);
    }
  };

  const fetchPaymentMethods = async () => {
    if (!adminId) return;
    try {
      const { data } = await api.get(`/api/payment-methods/${adminId}`);
      setPaymentMethods(data);
    } catch (err) {
      console.error("❌ Failed to fetch payment methods:", err);
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
      alert(data.message);
      setForm({ plan_name: "", amount_to_pay: "", duration_in_days: "" });
      setEditingId(null);
      setShowForm(false);
      fetchPlans();
    } catch (err) {
      console.error("❌ Failed to save subscription plan:", err);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!adminId) return;
    const url = editingPaymentId ? `/api/update-payment-method/${editingPaymentId}` : "/api/add-payment-method";
    const method = editingPaymentId ? "put" : "post";
    try {
      const { data } = await api[method](url, {
        admin_id: adminId,
        ...paymentForm,
      });
      alert(data.message);
      setPaymentForm({ name: "", reference_number: "" });
      setEditingPaymentId(null);
      setIsAddingPayment(false);
      fetchPaymentMethods();
    } catch (err) {
      console.error("❌ Failed to save payment method:", err);
    }
  };

  const handleEdit = (plan) => {
    setForm({
      plan_name: plan.plan_name,
      amount_to_pay: plan.amount_to_pay,
      duration_in_days: plan.duration_in_days || "",
    });
    setEditingId(plan.id);
    setShowForm(true);
    setIsAddingPayment(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    try {
      const { data } = await api.delete(`/api/delete-pricing/${id}`);
      alert(data.message);
      fetchPlans();
    } catch (err) {
      console.error("❌ Failed to delete subscription plan:", err);
      alert(err.response?.data?.error || "Failed to delete plan");
    }
  };

  const handleEditPayment = (payment) => {
    setPaymentForm({
      name: payment.name,
      reference_number: payment.reference_number || "",
    });
    setEditingPaymentId(payment.id);
    setIsAddingPayment(true);
    setShowForm(false);
  };

  const handleDeletePayment = async (id) => {
    if (!confirm("Are you sure you want to delete this payment method?")) return;
    try {
      const { data } = await api.delete(`/api/delete-payment-method/${id}`);
      alert(data.message);
      fetchPaymentMethods();
    } catch (err) {
      console.error("❌ Failed to delete payment method:", err);
      alert(err.response?.data?.error || "Failed to delete payment method");
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 p-2">
        <div className="mb-2">
          <h1 className="text-lg sm:text-xl font-semibold mb-1">Subscription Pricing</h1>
          <p className="text-[10px] text-gray-500">Manage subscription plans and payment methods</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setShowForm(true);
                setIsAddingPayment(false);
                setForm({ plan_name: "", amount_to_pay: "", duration_in_days: "" });
                setEditingId(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded flex items-center gap-1 text-xs"
            >
              <span className="text-sm font-bold">+</span>
              <div>
                <div>Create New Plan</div>
                <div className="text-[9px] opacity-90">Add a new subscription plan</div>
              </div>
            </button>

            {showForm && (
              <div className="bg-white rounded shadow p-2 relative text-xs">
                <button onClick={() => setShowForm(false)} className="absolute top-1 right-1 text-gray-400 hover:text-gray-600">✕</button>
                <h3 className="font-medium mb-1">{editingId ? "Edit Plan" : "New Plan"}</h3>
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Plan Name (e.g., Monthly, Quarterly)"
                    value={form.plan_name}
                    onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
                    className="w-full p-1 border rounded focus:ring-1 focus:ring-blue-500"
                    required
                    disabled={editingId && plans.find(p => p.id === editingId)?.is_deletable === 0}
                  />
                  <input
                    type="number"
                    placeholder="Amount to Pay"
                    value={form.amount_to_pay}
                    onChange={(e) => setForm({ ...form, amount_to_pay: e.target.value })}
                    className="w-full p-1 border rounded focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Duration (Days)"
                    value={form.duration_in_days}
                    onChange={(e) => setForm({ ...form, duration_in_days: e.target.value })}
                    className="w-full p-1 border rounded focus:ring-1 focus:ring-blue-500"
                    disabled={editingId && plans.find(p => p.id === editingId)?.is_deletable === 0}
                  />
                  <div className="flex gap-1">
                    <button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded">
                      {editingId ? "Update" : "Save"}
                    </button>
                    <button onClick={() => setShowForm(false)} className="bg-gray-300 hover:bg-gray-400 px-2 py-1 rounded">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setIsAddingPayment(true);
                setShowForm(false);
                setPaymentForm({ name: "", reference_number: "" });
                setEditingPaymentId(null);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded flex items-center gap-1 text-xs"
            >
              <span className="text-sm">💳</span>
              <div>
                <div>Add Payment Method</div>
                <div className="text-[9px] opacity-90">Configure options</div>
              </div>
            </button>

            {isAddingPayment && (
              <div className="bg-white rounded shadow p-2 relative text-xs">
                <button onClick={() => setIsAddingPayment(false)} className="absolute top-1 right-1 text-gray-400 hover:text-gray-600">✕</button>
                <h3 className="font-medium mb-1">{editingPaymentId ? "Edit Payment Method" : "Add Payment Method"}</h3>
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Payment Method Name"
                    value={paymentForm.name}
                    onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                    className="w-full p-1 border rounded focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Reference Number (Optional)"
                    value={paymentForm.reference_number}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                    className="w-full p-1 border rounded focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-1">
                    <button onClick={handlePaymentSubmit} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded">
                      {editingPaymentId ? "Update" : "Save"}
                    </button>
                    <button onClick={() => setIsAddingPayment(false)} className="bg-gray-300 hover:bg-gray-400 px-2 py-1 rounded">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-medium text-xs mb-1">Current Plans ({plans.length})</h2>
          {plans.length === 0 ? (
            <div className="bg-white rounded shadow p-2 text-center text-gray-500 text-xs">
              No subscription plans yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-white rounded shadow hover:shadow-md p-2 text-xs">
                  <h3 className="truncate font-semibold mb-1">{plan.plan_name}</h3>
                  <p className="text-gray-600 text-[10px]">Duration: {plan.duration_in_days} days</p>
                  <p className="font-bold text-blue-600 text-sm mb-2">₱{parseFloat(plan.amount_to_pay).toFixed(2)}</p>

                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleEdit(plan)} 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-1 py-1 rounded text-[10px]"
                    >
                      Edit
                    </button>
                    {plan.is_deletable === 0 ? (
                      <div className="flex-1 bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-center text-[10px] flex items-center justify-center">
                        🔒 System Default
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleDelete(plan.id)} 
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-1 py-1 rounded text-[10px]"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-2">
          <h2 className="font-medium text-xs mb-1">Payment Methods ({paymentMethods.length})</h2>
          {paymentMethods.length === 0 ? (
            <div className="bg-white rounded shadow p-2 text-center text-gray-500 text-xs">
              No payment methods yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
              {paymentMethods.map((pm) => (
                <div key={pm.id} className="bg-white rounded shadow hover:shadow-md p-2 text-xs">
                  <h3 className="truncate font-semibold mb-1">{pm.name}</h3>
                  {pm.reference_number && (
                    <p className="text-gray-600 text-[10px] truncate mb-2">Ref: {pm.reference_number}</p>
                  )}
                  
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleEditPayment(pm)} 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-1 py-1 rounded text-[10px]"
                    >
                      Edit
                    </button>
                    {pm.is_default === 1 ? (
                      <div className="flex-1 bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-center text-[10px] flex items-center justify-center">
                        🔒 System Default
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleDeletePayment(pm.id)} 
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-1 py-1 rounded text-[10px]"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPricing;
