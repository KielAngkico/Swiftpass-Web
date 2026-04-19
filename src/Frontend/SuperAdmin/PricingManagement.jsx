import React, { useEffect, useState } from "react";
import API from "../../api";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import { useToast } from "../../components/ToastManager";

export default function PricingManagement() {
  const [packages, setPackages] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [activeTab, setActiveTab] = useState("packages");

  // Package form
  const [form, setForm] = useState({ name: "", price: "", duration_days: "" });
  const [packageItems, setPackageItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedQty, setSelectedQty] = useState(1);
  const [editingPackage, setEditingPackage] = useState(null);

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    payment_method: "",
    account_name: "",
    account_number: "",
    is_enabled: true,
  });
  const [editingPayment, setEditingPayment] = useState(null);
  const [qrCodeFile, setQrCodeFile] = useState(null);

  const { showToast, showConfirm } = useToast();

  useEffect(() => {
    fetchPackages();
    fetchInventory();
    fetchPaymentOptions();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await API.get("/api/packages");
      const data = Array.isArray(res.data) ? res.data : res.data?.packages || [];
      setPackages(data);
    } catch (err) {
      console.error("Error fetching packages:", err);
      setPackages([]);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await API.get("/api/inventory");
      const data = Array.isArray(res.data) ? res.data : res.data?.inventory || [];
      setInventory(data);
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setInventory([]);
    }
  };

  const fetchPaymentOptions = async () => {
    try {
      const res = await API.get("/api/payment-options");
      setPaymentOptions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching payment options:", err);
      setPaymentOptions([]);
    }
  };

  // ========== PACKAGE FUNCTIONS ==========
  const addItem = () => {
    if (!selectedItem || selectedQty <= 0) return;
    const item = inventory.find((i) => i.id === parseInt(selectedItem));
    if (!item) return;
    setPackageItems([...packageItems, { item_name: item.name, quantity: selectedQty }]);
    setSelectedItem("");
    setSelectedQty(1);
  };

  const removeItem = (index) => {
    setPackageItems(packageItems.filter((_, i) => i !== index));
  };

  const handlePackageSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPackage) {
        await API.put(`/api/packages/${editingPackage.id}`, { ...form, items: packageItems });
        showToast({ message: "Package updated successfully!", type: "success" });
      } else {
        await API.post("/api/packages", { ...form, items: packageItems });
        showToast({ message: "Package created successfully!", type: "success" });
      }
      setForm({ name: "", price: "", duration_days: "" });
      setPackageItems([]);
      setEditingPackage(null);
      fetchPackages();
    } catch (err) {
      console.error("Error submitting package:", err);
      showToast({ message: "Failed to save package", type: "error" });
    }
  };

  const deletePackage = async (id) => {
    showConfirm("Delete this package?", async () => {
      try {
        await API.delete(`/api/packages/${id}`);
        showToast({ message: "Package deleted", type: "success" });
        fetchPackages();
      } catch (err) {
        console.error("Error deleting package:", err);
        showToast({ message: "Failed to delete package", type: "error" });
      }
    });
  };

  const handleEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setForm({ name: pkg.name, price: pkg.price, duration_days: pkg.duration_days });
    setPackageItems(pkg.items || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditPackage = () => {
    setEditingPackage(null);
    setForm({ name: "", price: "", duration_days: "" });
    setPackageItems([]);
  };

  // ========== PAYMENT FUNCTIONS ==========
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("payment_method", paymentForm.payment_method);
      formData.append("account_name", paymentForm.account_name);
      formData.append("account_number", paymentForm.account_number);
      formData.append("is_enabled", paymentForm.is_enabled ? 1 : 0);
      if (qrCodeFile) formData.append("qr_code", qrCodeFile);

      if (editingPayment) {
        await API.put(`/api/payment-options/${editingPayment.id}`, formData);
        showToast({ message: "Payment option updated!", type: "success" });
      } else {
        await API.post("/api/payment-options", formData);
        showToast({ message: "Payment option added!", type: "success" });
      }

      setPaymentForm({ payment_method: "", account_name: "", account_number: "", is_enabled: true });
      setQrCodeFile(null);
      setEditingPayment(null);
      fetchPaymentOptions();
    } catch (err) {
      console.error("Error submitting payment option:", err);
      showToast({ message: err.response?.data?.error || "Failed to save payment option", type: "error" });
    }
  };

  const deletePaymentOption = async (id) => {
    showConfirm("Delete this payment option?", async () => {
      try {
        await API.delete(`/api/payment-options/${id}`);
        showToast({ message: "Payment option deleted", type: "success" });
        fetchPaymentOptions();
      } catch (err) {
        console.error("Error deleting payment option:", err);
        showToast({ message: err.response?.data?.error || "Failed to delete", type: "error" });
      }
    });
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setPaymentForm({
      payment_method: payment.payment_method,
      account_name: payment.account_name || "",
      account_number: payment.account_number || "",
      is_enabled: payment.is_enabled,
    });
    setActiveTab("payments");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditPayment = () => {
    setEditingPayment(null);
    setPaymentForm({ payment_method: "", account_name: "", account_number: "", is_enabled: true });
    setQrCodeFile(null);
  };

  const setDefaultPayment = async (id) => {
    try {
      await API.put(`/api/payment-options/${id}/set-default`);
      showToast({ message: "Default payment updated", type: "success" });
      fetchPaymentOptions();
    } catch (err) {
      showToast({ message: "Failed to set default", type: "error" });
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />

      <main className="flex-1 p-6">
        {/* Page header */}
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">
            Pricing & Payment Management
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage subscription packages and payment options
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 border border-gray-200 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("packages")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "packages"
                ? "bg-white text-gray-900 border border-gray-200 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Packages
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "payments"
                ? "bg-white text-gray-900 border border-gray-200 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Payment Options
          </button>
        </div>

        {/* ========== PACKAGES TAB ========== */}
        {activeTab === "packages" && (
          <div className="flex gap-5 items-start">

            {/* Left: Form */}
            <div className="w-72 flex-shrink-0">
              <form
                onSubmit={handlePackageSubmit}
                className="bg-white border border-gray-200 rounded-xl p-4"
              >
                <h2 className="text-sm font-medium text-gray-900 mb-3 pb-3 border-b border-gray-100">
                  {editingPackage ? "Edit package" : "Add package"}
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Package name</label>
                    <input
                      type="text"
                      placeholder="e.g. Monthly Basic"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Price (₱)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Duration (days)</label>
                      <input
                        type="number"
                        placeholder="30"
                        value={form.duration_days}
                        onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Included items */}
                  {/* Included items */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Included items
                    </label>

                    {/* Selector FIRST */}
                    <div className="flex flex-col gap-2 mb-3">
                      <select
                        value={selectedItem}
                        onChange={(e) => setSelectedItem(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="">Select item...</option>
                        {inventory.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} ({inv.quantity} avail.)
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={selectedQty}
                            onChange={(e) => {
                              const val = e.target.value;

                              // allow only digits or empty input
                              if (/^\d*$/.test(val)) {
                                setSelectedQty(val === "" ? "" : Number(val));
                              }
                            }}
                            onBlur={() => {
                              if (!selectedQty || selectedQty < 1) {
                                setSelectedQty(1);
                              }
                            }}
                            className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="1"
                          />

                        <button
                          type="button"
                          onClick={addItem}
                          disabled={!selectedItem}
                          className="flex-1 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Add item
                        </button>
                      </div>
                    </div>

                    {/* Included items BELOW */}
                    {packageItems.length > 0 && (
                      <div className="space-y-1">
                        {packageItems.map((item, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5"
                          >
                            <span className="text-xs text-gray-700">
                              {item.item_name} — {item.quantity} pcs
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(i)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium ml-2"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                  >
                    {editingPackage ? "Update package" : "Save package"}
                  </button>
                  {editingPackage && (
                    <button
                      type="button"
                      onClick={cancelEditPackage}
                      className="px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right: Package cards */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-gray-900">Available packages</h2>
                <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                  {packages.length} {packages.length === 1 ? "package" : "packages"}
                </span>
              </div>

              {packages.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                  <p className="text-sm text-gray-400">No packages created yet.</p>
                  <p className="text-xs text-gray-300 mt-1">Use the form to add your first package.</p>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`bg-white border rounded-xl p-4 flex flex-col ${
                        editingPackage?.id === pkg.id
                          ? "border-blue-400 ring-1 ring-blue-200"
                          : "border-gray-200"
                      }`}
                    >
                      <p className="text-xs font-medium text-gray-900 leading-snug mb-1">{pkg.name}</p>

                      <p className="text-base font-semibold text-blue-600 mb-1.5">
                        ₱{Number(pkg.price).toLocaleString()}
                      </p>

                      <span className="inline-block text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-0.5 w-fit mb-3">
                        {pkg.duration_days} days
                      </span>

                      {pkg.items?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {pkg.items.map((it, j) => (
                            <span
                              key={j}
                              className="text-[11px] bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2 py-0.5"
                            >
                              {it.item_name} ×{it.quantity}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-1.5 mt-auto pt-2.5 border-t border-gray-100">
                        <button
                          onClick={() => handleEditPackage(pkg)}
                          className="flex-1 bg-white text-gray-700 border border-gray-200 rounded-lg py-1.5 text-[11px] font-medium hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deletePackage(pkg.id)}
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
        )}

        {/* ========== PAYMENT OPTIONS TAB ========== */}
        {activeTab === "payments" && (
          <div className="flex gap-5 items-start">

            {/* Left: Form */}
            <div className="w-72 flex-shrink-0">
              <form
                onSubmit={handlePaymentSubmit}
                className="bg-white border border-gray-200 rounded-xl p-4"
              >
                <h2 className="text-sm font-medium text-gray-900 mb-3 pb-3 border-b border-gray-100">
                  {editingPayment ? "Edit payment option" : "Add payment option"}
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Payment method</label>
                    <input
                      type="text"
                      placeholder="e.g. GCash, PayMaya, Bank Transfer"
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Account name (optional)</label>
                    <input
                      type="text"
                      placeholder="Account name"
                      value={paymentForm.account_name}
                      onChange={(e) => setPaymentForm({ ...paymentForm, account_name: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Account number (optional)</label>
                    <input
                      type="text"
                      placeholder="Account number"
                      value={paymentForm.account_number}
                      onChange={(e) => setPaymentForm({ ...paymentForm, account_number: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">QR code (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setQrCodeFile(e.target.files[0])}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentForm.is_enabled}
                      onChange={(e) => setPaymentForm({ ...paymentForm, is_enabled: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-700">Enabled</span>
                  </label>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                  >
                    {editingPayment ? "Update" : "Add payment option"}
                  </button>
                  {editingPayment && (
                    <button
                      type="button"
                      onClick={cancelEditPayment}
                      className="px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right: Payment options table */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-gray-900">Payment options</h2>
                <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                  {paymentOptions.length} {paymentOptions.length === 1 ? "option" : "options"}
                </span>
              </div>

              {paymentOptions.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                  <p className="text-sm text-gray-400">No payment options configured.</p>
                  <p className="text-xs text-gray-300 mt-1">Use the form to add a payment method.</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Method</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Account info</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paymentOptions.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800">{payment.payment_method}</span>
                              {payment.is_default && (
                                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {payment.account_name && (
                              <p className="text-gray-700">{payment.account_name}</p>
                            )}
                            {payment.account_number && (
                              <p className="text-gray-400">{payment.account_number}</p>
                            )}
                            {payment.qr_code_url && (
                              <img src={payment.qr_code_url} alt="QR" className="w-12 h-12 mt-1 rounded" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                payment.is_enabled
                                  ? "bg-green-50 text-green-700 border-green-100"
                                  : "bg-red-50 text-red-600 border-red-100"
                              }`}
                            >
                              {payment.is_enabled ? "Enabled" : "Disabled"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 justify-end">
                              {!payment.is_default && (
                                <button
                                  onClick={() => setDefaultPayment(payment.id)}
                                  className="px-2.5 py-1 bg-white text-blue-600 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors"
                                >
                                  Set default
                                </button>
                              )}
                              <button
                                onClick={() => handleEditPayment(payment)}
                                className="px-2.5 py-1 bg-white text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                              >
                                Edit
                              </button>
                              {!payment.is_default && (
                                <button
                                  onClick={() => deletePaymentOption(payment.id)}
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
      </main>
    </div>
  );
}