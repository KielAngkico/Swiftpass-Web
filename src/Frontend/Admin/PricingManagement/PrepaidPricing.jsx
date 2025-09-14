import React, { useState, useEffect } from "react";
import api from "../../../api";

const PrepaidPricing = () => {
  const [adminId, setAdminId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    plan_name: "",
    amount_to_pay: "",
    amount_to_credit: "",
  });

  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ name: "", reference_number: "" });
  const [paymentMethods, setPaymentMethods] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        console.log("📥 PrepaidPricing user:", data);

        if (!data.authenticated || !data.user) {
          throw new Error("Not authenticated");
        }

        const id = data.user.adminId || data.user.id;
        if (!id) throw new Error("Missing admin ID");

        setAdminId(id);
      } catch (err) {
        console.error("❌ Failed to fetch user in PrepaidPricing:", err);

        if (err.response?.status === 401) {
          window.location.href = "/login";
        }
      }
    };
    fetchUser();
  }, []);

  const fetchPlans = async () => {
    if (!adminId) return;
    try {
      const { data } = await api.get(`/api/get-pricing/${adminId}`);
      setPlans(data.filter((plan) => plan.system_type === "prepaid_entry"));
    } catch (err) {
      console.error("❌ Failed to fetch prepaid plans:", err);
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
        system_type: "prepaid_entry",
        admin_id: adminId,
      });

      alert(data.message);
      setForm({ plan_name: "", amount_to_pay: "", amount_to_credit: "" });
      setEditingId(null);
      setShowForm(false);
      fetchPlans();
    } catch (err) {
      console.error("❌ Failed to save prepaid plan:", err);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!adminId) return;

    try {
      const { data } = await api.post("/api/add-payment-method", {
        admin_id: adminId,
        ...paymentForm,
      });

      alert(data.message);
      setPaymentForm({ name: "", reference_number: "" });
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
      amount_to_credit: plan.amount_to_credit,
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
      console.error("❌ Failed to delete prepaid plan:", err);
    }
  };

  return (
  <div className="min-h-screen bg-gray-50 p-6 w-full">
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Prepaid Pricing</h1>
        <p className="text-gray-600">Manage your pricing plans and payment methods</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => {
            setShowForm(true);
            setIsAddingPayment(false);
            setForm({ plan_name: "", amount_to_pay: "", amount_to_credit: "" });
            setEditingId(null);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-colors flex items-center gap-3"
        >
          <span className="text-2xl font-bold">+</span>
          <div className="text-left">
            <div className="font-semibold">Create New Plan</div>
            <div className="text-sm opacity-90">Add a new prepaid plan</div>
          </div>
        </button>
        <button
          onClick={() => {
            setIsAddingPayment(true);
            setShowForm(false);
            setPaymentForm({ name: "", reference_number: "" });
          }}
          className="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-lg transition-colors flex items-center gap-3"
        >
          <span className="text-2xl">💳</span>
          <div className="text-left">
            <div className="font-semibold">Add Payment Method</div>
            <div className="text-sm opacity-90">Configure payment options</div>
          </div>
        </button>
      </div>
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">{editingId ? "Edit Plan" : "New Plan"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Plan Name"
              value={form.plan_name}
              onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Amount to Pay"
                value={form.amount_to_pay}
                onChange={(e) => setForm({ ...form, amount_to_pay: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <input
                type="number"
                placeholder="Amount to Credit"
                value={form.amount_to_credit}
                onChange={(e) => setForm({ ...form, amount_to_credit: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
                {editingId ? "Update Plan" : "Save Plan"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-300 hover:bg-gray-400 px-6 py-2 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {isAddingPayment && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Add Payment Method</h3>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Payment Method Name"
              value={paymentForm.name}
              onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Reference Number (Optional)"
              value={paymentForm.reference_number}
              onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex gap-3">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
                Save
              </button>
              <button type="button" onClick={() => setIsAddingPayment(false)} className="bg-gray-300 hover:bg-gray-400 px-6 py-2 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Plans ({plans.length})</h2>
        {plans.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No prepaid plans yet. Create your first plan above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 group">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-800">{plan.plan_name}</h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(plan)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(plan.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="flex justify-between mb-3">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Customer Pays</p>
                    <p className="text-2xl font-bold">₱{parseFloat(plan.amount_to_pay).toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Gets Credit</p>
                    <p className="text-2xl font-bold text-blue-600">₱{parseFloat(plan.amount_to_credit).toFixed(2)}</p>
                  </div>
                </div>
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-center text-sm font-medium">
                  +₱{(parseFloat(plan.amount_to_credit) - parseFloat(plan.amount_to_pay)).toFixed(2)} Bonus
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Methods ({paymentMethods.length})</h2>
        {paymentMethods.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No payment methods yet. Add one above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    💳
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 truncate">{method.name}</div>
                    {method.reference_number && (
                      <div className="text-sm text-gray-600 truncate">{method.reference_number}</div>
                    )}
                  </div>
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

export default PrepaidPricing;
