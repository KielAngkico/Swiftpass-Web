import React, { useEffect, useState } from "react";
import API from "../../api";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import { useToast } from "../../components/ToastManager";

export default function PricingManagement() {
  const [packages, setPackages] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [activeTab, setActiveTab] = useState("packages"); // "packages" or "payments"
  
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
    is_enabled: true
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
    setPackageItems([
      ...packageItems,
      { item_name: item.name, quantity: selectedQty },
    ]);
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
        await API.put(`/api/packages/${editingPackage.id}`, {
          ...form,
          items: packageItems,
        });
        showToast({ message: "Package updated successfully!", type: "success" });
      } else {
        await API.post("/api/packages", {
          ...form,
          items: packageItems,
        });
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
    setForm({
      name: pkg.name,
      price: pkg.price,
      duration_days: pkg.duration_days,
    });
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

      setPaymentForm({
        payment_method: "",
        account_name: "",
        account_number: "",
        is_enabled: true
      });
      setQrCodeFile(null);
      setEditingPayment(null);
      fetchPaymentOptions();
    } catch (err) {
      console.error("Error submitting payment option:", err);
      showToast({ 
        message: err.response?.data?.error || "Failed to save payment option", 
        type: "error" 
      });
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
        showToast({ 
          message: err.response?.data?.error || "Failed to delete", 
          type: "error" 
        });
      }
    });
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setPaymentForm({
      payment_method: payment.payment_method,
      account_name: payment.account_name || "",
      account_number: payment.account_number || "",
      is_enabled: payment.is_enabled
    });
    setActiveTab("payments");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditPayment = () => {
    setEditingPayment(null);
    setPaymentForm({
      payment_method: "",
      account_name: "",
      account_number: "",
      is_enabled: true
    });
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
      <main className="flex-1 p-5">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            Pricing & Payment Management
          </h1>
          <p className="text-gray-600 text-xs">
            Manage subscription packages and payment options
          </p>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setActiveTab("packages")}
            className={`px-4 py-2 rounded text-sm font-medium ${
              activeTab === "packages"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            📦 Packages
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-2 rounded text-sm font-medium ${
              activeTab === "payments"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            💳 Payment Options
          </button>
        </div>

        {/* ========== PACKAGES TAB ========== */}
        {activeTab === "packages" && (
          <>
            <div className="flex gap-4 mb-5">
              <form
                onSubmit={handlePackageSubmit}
                className="flex flex-col gap-4 bg-white p-4 rounded-md shadow-sm max-w-4xl w-full"
              >
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Package Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="border border-gray-300 p-2 flex-1 text-xs rounded"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Price (₱)"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="border border-gray-300 p-2 w-32 text-xs rounded"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Duration (days)"
                    value={form.duration_days}
                    onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                    className="border border-gray-300 p-2 w-40 text-xs rounded"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    className="border border-gray-300 p-2 flex-1 text-xs rounded"
                  >
                    <option value="">Select Item</option>
                    {inventory.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} (Available: {inv.quantity})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(parseInt(e.target.value) || 1)}
                    className="border border-gray-300 p-2 w-20 text-xs rounded"
                  />
                  <button
                    type="button"
                    onClick={addItem}
                    className="bg-green-600 text-white px-4 py-2 rounded text-xs hover:bg-green-700"
                    disabled={!selectedItem}
                  >
                    Add Item
                  </button>
                </div>

                {packageItems.length > 0 && (
                  <div className="border border-gray-200 p-3 bg-gray-50 rounded">
                    <h4 className="font-semibold mb-2 text-xs">Included Items</h4>
                    <ul className="text-xs">
                      {packageItems.map((item, i) => (
                        <li key={i} className="flex justify-between items-center border-b py-1">
                          <span>{item.item_name} — {item.quantity} pcs</span>
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className={`${
                      editingPackage
                        ? "bg-yellow-500 hover:bg-yellow-600"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white px-4 py-2 rounded text-xs`}
                  >
                    {editingPackage ? "✏️ Update Package" : "💾 Save Package"}
                  </button>
                  {editingPackage && (
                    <button
                      type="button"
                      onClick={cancelEditPackage}
                      className="bg-gray-400 text-white px-4 py-2 rounded text-xs hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="max-w-4xl w-full bg-white rounded-md shadow-sm overflow-auto">
              <div className="p-3 bg-gray-50 border-b">
                <h2 className="font-semibold text-sm">Available Packages</h2>
              </div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 border">Package Name</th>
                    <th className="p-2 border">Price</th>
                    <th className="p-2 border">Duration</th>
                    <th className="p-2 border">Included Items</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.length > 0 ? (
                    packages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-gray-50">
                        <td className="border p-2 font-medium">{pkg.name}</td>
                        <td className="border p-2 text-center">₱{pkg.price}</td>
                        <td className="border p-2 text-center">{pkg.duration_days} days</td>
                        <td className="border p-2">
                          {pkg.items?.length ? (
                            <ul className="list-disc list-inside text-xs">
                              {pkg.items.map((it, j) => (
                                <li key={j}>{it.item_name} ({it.quantity} pcs)</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-gray-400">No items</span>
                          )}
                        </td>
                        <td className="border p-2 text-center space-x-2">
                          <button
                            onClick={() => handleEditPackage(pkg)}
                            className="bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deletePackage(pkg.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center p-4 text-gray-500">
                        No packages created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ========== PAYMENT OPTIONS TAB ========== */}
        {activeTab === "payments" && (
          <>
            <div className="flex gap-4 mb-5">
              <form
                onSubmit={handlePaymentSubmit}
                className="flex flex-col gap-4 bg-white p-4 rounded-md shadow-sm max-w-2xl w-full"
              >
                <input
                  type="text"
                  placeholder="Payment Method (e.g., GCash, PayMaya, Bank Transfer)"
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="border border-gray-300 p-2 text-xs rounded"
                  required
                />
                <input
                  type="text"
                  placeholder="Account Name (optional)"
                  value={paymentForm.account_name}
                  onChange={(e) => setPaymentForm({ ...paymentForm, account_name: e.target.value })}
                  className="border border-gray-300 p-2 text-xs rounded"
                />
                <input
                  type="text"
                  placeholder="Account Number (optional)"
                  value={paymentForm.account_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, account_number: e.target.value })}
                  className="border border-gray-300 p-2 text-xs rounded"
                />
                <div>
                  <label className="block text-xs text-gray-700 mb-1">QR Code (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setQrCodeFile(e.target.files[0])}
                    className="border border-gray-300 p-2 text-xs rounded w-full"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={paymentForm.is_enabled}
                    onChange={(e) => setPaymentForm({ ...paymentForm, is_enabled: e.target.checked })}
                  />
                  <span>Enabled</span>
                </label>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className={`${
                      editingPayment
                        ? "bg-yellow-500 hover:bg-yellow-600"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white px-4 py-2 rounded text-xs`}
                  >
                    {editingPayment ? "✏️ Update" : "💾 Add Payment Option"}
                  </button>
                  {editingPayment && (
                    <button
                      type="button"
                      onClick={cancelEditPayment}
                      className="bg-gray-400 text-white px-4 py-2 rounded text-xs hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="max-w-2xl w-full bg-white rounded-md shadow-sm overflow-auto">
              <div className="p-3 bg-gray-50 border-b">
                <h2 className="font-semibold text-sm">Payment Options</h2>
              </div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 border">Method</th>
                    <th className="p-2 border">Account Info</th>
                    <th className="p-2 border">Status</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentOptions.length > 0 ? (
                    paymentOptions.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="border p-2 font-medium">
                          {payment.payment_method}
                          {payment.is_default && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </td>
                        <td className="border p-2">
                          {payment.account_name && <div>{payment.account_name}</div>}
                          {payment.account_number && (
                            <div className="text-gray-600">{payment.account_number}</div>
                          )}
                          {payment.qr_code_url && (
                            <img
                              src={payment.qr_code_url}
                              alt="QR"
                              className="w-16 h-16 mt-1"
                            />
                          )}
                        </td>
                        <td className="border p-2 text-center">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              payment.is_enabled
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {payment.is_enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td className="border p-2 text-center space-x-2">
                          {!payment.is_default && (
                            <button
                              onClick={() => setDefaultPayment(payment.id)}
                              className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => handleEditPayment(payment)}
                            className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                          >
                            Edit
                          </button>
                          {!payment.is_default && (
                            <button
                              onClick={() => deletePaymentOption(payment.id)}
                              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center p-4 text-gray-500">
                        No payment options configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}