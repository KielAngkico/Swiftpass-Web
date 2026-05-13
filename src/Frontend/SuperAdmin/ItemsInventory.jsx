import React, { useEffect, useState } from "react";
import api from "../../api";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import { useAuth } from "../../App";
import { useWebSocket } from "../../contexts/WebSocketContext";
import { useLocation } from "react-router-dom";
import { useToast } from "../../components/ToastManager";

const ItemsInventory = () => {
  const { user } = useAuth();
  const { rfidData } = useWebSocket();
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [rfids, setRfids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [rfidError, setRfidError] = useState(null);
  const { showToast, showConfirm } = useToast();
  const [inventoryPage, setInventoryPage] = useState(1);
const [rfidPage, setRfidPage] = useState(1);
const [rfidStatusFilter, setRfidStatusFilter] = useState("all");
const [rfidRoleFilter, setRfidRoleFilter] = useState("all");const inventoryPerPage = 10;
const rfidPerPage = 10;

  const rfidOptions = [
    { label: "Partner/Staff - Card", rfid_type: "card", role: "Partner", inventory_item: "Partner/Staff - Card" },
    { label: "Member - Wristband", rfid_type: "wristband", role: "Member", inventory_item: "Member - Wristband" },
    { label: "Day Pass - Key Fob", rfid_type: "key_fob", role: "DayPass", inventory_item: "Day Pass - KeyFob" }
  ];

  const [selectedRfidOption, setSelectedRfidOption] = useState(rfidOptions[0]);

  const [form, setForm] = useState({
    name: "",
    purchase_price: "",
    selling_price: "",
    quantity: 1,
  });

  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    purchase_price: "",
    selling_price: "",
    quantity: 0
  });

  const fetchItems = async () => {
    try {
      const { data } = await api.get("/api/inventory");
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      showToast({ message: "Failed to fetch inventory", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchRfids = async () => {
    try {
      setRfidError(null);
      const { data } = await api.get("/api/rfid");
      console.log("Fetched RFIDs from backend:", data);
      setRfids(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("RFID fetch error:", error.response?.data || error.message);
      setRfidError("Failed to fetch RFIDs from backend");
      setRfids([]);
    }
  };

  const addScannedItem = async (rfidTag) => {
    const tag = rfidTag || scanValue.trim();
    if (!tag) {
      showToast({ message: "Please scan an RFID tag or enter one manually", type: "error" });
      return;
    }

    if (rfids.some((r) => r.rfid_tag === tag)) {
      showToast({ message: `RFID ${tag} is already registered.`, type: "error" });
      return;
    }

    try {
      const response = await api.post("/api/rfid", {
        rfid_tag: tag,
        rfid_type: selectedRfidOption.rfid_type,
        role: selectedRfidOption.role
      });
      console.log("RFID registered successfully:", response.data);

      await fetchRfids();
      await fetchItems();

      if (!rfidTag) setScanValue("");
      showToast({
        message: `RFID registered successfully! Warehouse #: ${response.data.warehouse_number}`,
        type: "success"
      });
    } catch (error) {
      console.error("Failed to add RFID:", error.response?.data || error.message);
      showToast({ message: error.response?.data?.message || "Failed to add RFID", type: "error" });
    }
  };

  const addManualItem = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.quantity < 1) {
      showToast({ message: "Please fill in all required fields", type: "error" });
      return;
    }

    try {
      await api.post("/api/inventory", {
        name: form.name.trim(),
        purchase_price: parseFloat(form.purchase_price) || 0,
        selling_price: parseFloat(form.selling_price) || 0,
        quantity: parseInt(form.quantity) || 1,
      });

      setForm({ name: "", purchase_price: "", selling_price: "", quantity: 1 });
      await fetchItems();
      showToast({ message: "Item added successfully!", type: "success" });
    } catch (error) {
      console.error("Failed to add item:", error);
      showToast({ message: "Failed to add item", type: "error" });
    }
  };

  const startEdit = (item) => {
    setEditingItem(item.id);
    setEditForm({
      name: item.name,
      purchase_price: item.purchase_price,
      selling_price: item.selling_price,
      quantity: item.quantity
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditForm({ name: "", purchase_price: "", selling_price: "", quantity: 0 });
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/api/inventory/${id}`, editForm);
      await fetchItems();
      setEditingItem(null);
      showToast({ message: "Item updated successfully!", type: "success" });
    } catch (error) {
      console.error("Failed to update item:", error);
      showToast({ message: "Failed to update item", type: "error" });
    }
  };

  const deleteItem = async (id, name) => {
    showConfirm(
      `Delete "${name}"?`,
      async () => {
        try {
          await api.delete(`/api/inventory/${id}`);
          await fetchItems();
          showToast({ message: "Item deleted!", type: "success" });
        } catch (error) {
          console.error("Failed to delete item:", error);
          showToast({ message: "Failed to delete item", type: "error" });
        }
      }
    );
  };

  useEffect(() => {
    if (user) {
      fetchItems();
      fetchRfids();
    }
  }, [user]);

  useEffect(() => {
    let rfidTagToUse = null;

    if (location.state?.rfid_tag) {
      console.log("📍 RFID from navigation state:", location.state.rfid_tag);
      rfidTagToUse = location.state.rfid_tag;
    } else if (rfidData?.rfid_tag && rfidData?.type === "rfid-registration-check") {
      console.log("📡 RFID from WebSocket:", rfidData.rfid_tag);
      rfidTagToUse = rfidData.rfid_tag;
    }

    if (rfidTagToUse) {
      setScanValue(rfidTagToUse);
      console.log("✅ Auto-populated scan input with:", rfidTagToUse);
    }
  }, [location.state, rfidData]);

  const filteredItems = items.filter((it) =>
    it.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
const inventoryTotalPages = Math.ceil(filteredItems.length / inventoryPerPage);
const inventoryStartIndex = (inventoryPage - 1) * inventoryPerPage;
const currentInventoryItems = filteredItems.slice(inventoryStartIndex, inventoryStartIndex + inventoryPerPage);
const filteredRfids = rfids.filter((r) => {
  const matchesStatus = rfidStatusFilter === "all"
    ? true
    : rfidStatusFilter === "allocated"
      ? r.status === "allocated" || r.status === "in_use"
      : r.status === rfidStatusFilter;
  const matchesRole = rfidRoleFilter === "all" ? true : r.role === rfidRoleFilter;
  return matchesStatus && matchesRole;
});
const rfidTotalPages = Math.ceil(filteredRfids.length / rfidPerPage);
const rfidStartIndex = (rfidPage - 1) * rfidPerPage;
const currentRfids = filteredRfids.slice(rfidStartIndex, rfidStartIndex + rfidPerPage);

const PaginationBar = ({ page, totalPages, onPageChange }) => (
  <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 bg-white">
    <span className="text-xs text-gray-400">
      Page {page} of {Math.max(totalPages, 1)}
    </span>
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      {Array.from({ length: Math.max(totalPages, 1) }, (_, i) => i + 1)
        .filter(p => p === 1 || p === Math.max(totalPages, 1) || Math.abs(p - page) <= 1)
        .reduce((acc, p, idx, arr) => {
          if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
          acc.push(p);
          return acc;
        }, [])
        .map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-xs text-gray-400">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors border ${
                page === p
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          )
        )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= Math.max(totalPages, 1)}
        className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  </div>
);
const getStatusDisplay = (status) => {
  if (status === "in_stock") return { label: "In Stock", color: "bg-green-50 text-green-700 border-green-100" };
  if (status === "allocated" || status === "in_use") return { label: "Allocated", color: "bg-blue-50 text-blue-700 border-blue-100" };
  if (status === "deactivated") return { label: "Deactivated", color: "bg-red-50 text-red-700 border-red-100" };
  return { label: status || "N/A", color: "bg-gray-50 text-gray-500 border-gray-200" };
};
  if (!user) return <div>Checking authentication...</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />

      <main className="flex-1 min-w-0 p-6">

        {/* Page header */}
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Inventory Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage items and RFID tags</p>
        </div>

        {/* ── Two-column layout ── */}
        <div className="flex items-start gap-5">

          {/* Left column: Add Item form + Add RFID form */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-4">

            {/* Add Item form */}
            <form
              onSubmit={addManualItem}
              className="bg-white border border-gray-200 rounded-xl p-4"
            >
              <h2 className="text-sm font-medium text-gray-900 mb-3 pb-3 border-b border-gray-100">
                Add item
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Item name</label>
                  <input
                    type="text"
                    placeholder="e.g. Gym Towel"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Purchase price (₱)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={form.purchase_price}
                      onChange={(e) => {
                        if (/^\d*\.?\d*$/.test(e.target.value)) setForm({ ...form, purchase_price: e.target.value });
                      }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Selling price (₱)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={form.selling_price}
                      onChange={(e) => {
                        if (/^\d*\.?\d*$/.test(e.target.value)) setForm({ ...form, selling_price: e.target.value });
                      }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1"
                    value={form.quantity}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value)) setForm({ ...form, quantity: e.target.value });
                    }}
                    onBlur={() => { if (!form.quantity || form.quantity < 1) setForm({ ...form, quantity: 1 }); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Add item
                </button>
              </div>
            </form>

            {/* Add RFID form */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-medium text-gray-900 mb-3 pb-3 border-b border-gray-100">
                Register RFID
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">RFID type</label>
                  <select
                    value={JSON.stringify(selectedRfidOption)}
                    onChange={(e) => setSelectedRfidOption(JSON.parse(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    {rfidOptions.map((option, idx) => (
                      <option key={idx} value={JSON.stringify(option)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">RFID tag</label>
                  <input
                    type="text"
                    value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                    placeholder="Scan or enter RFID..."
                    autoFocus
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => addScannedItem()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Register RFID
                </button>
              </div>
            </div>
          </div>

          {/* Right column: Inventory table + RFID table */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Inventory table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">Inventory</span>
                  <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                    {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setInventoryPage(1); }}
                  className="border border-black rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-40"
                />
              </div>

              <div className="overflow-auto max-h-[40vh]">
                {loading ? (
                  <p className="text-xs text-gray-500 p-4">Loading...</p>
                ) : filteredItems.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4 text-center">No items found</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0">
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">#</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Name</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Purchase price</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Selling price</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Quantity</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                    {currentInventoryItems.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400">{inventoryStartIndex + index + 1}</td>

                          <td className="px-4 py-3 text-xs font-medium text-gray-800">
                            {editingItem === item.id ? (
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                disabled={item.is_deletable === 0}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : item.name}
                          </td>

                          <td className="px-4 py-3 text-xs text-gray-800">
                            {editingItem === item.id ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editForm.purchase_price}
                                onChange={(e) => {
                                  if (/^\d*\.?\d*$/.test(e.target.value)) setEditForm({ ...editForm, purchase_price: e.target.value });
                                }}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : `₱${item.purchase_price}`}
                          </td>

                          <td className="px-4 py-3 text-xs text-gray-800">
                            {editingItem === item.id ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editForm.selling_price}
                                onChange={(e) => {
                                  if (/^\d*\.?\d*$/.test(e.target.value)) setEditForm({ ...editForm, selling_price: e.target.value });
                                }}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : `₱${item.selling_price}`}
                          </td>

                          <td className="px-4 py-3 text-xs text-gray-800">
                            {editingItem === item.id ? (
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editForm.quantity}
                                disabled={item.is_deletable === 0}
                                onChange={(e) => {
                                  if (/^\d*$/.test(e.target.value)) setEditForm({ ...editForm, quantity: e.target.value });
                                }}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : item.quantity}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex gap-2 justify-end">
                              {editingItem === item.id ? (
                                <>
                                  <button
                                    onClick={() => saveEdit(item.id)}
                                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[13px] font-medium transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="px-3 py-1.5 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg text-[13px] font-medium transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEdit(item)}
                                    className="px-3 py-1.5 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg text-[13px] font-medium transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteItem(item.id, item.name)}
                                    className="px-3 py-1.5 bg-white text-red-500 border border-red-100 hover:bg-red-50 rounded-lg text-[13px] font-medium transition-colors"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
</table>
                )}
              </div>
              <PaginationBar
                page={inventoryPage}
                totalPages={inventoryTotalPages}
                onPageChange={setInventoryPage}
              />
            </div>

            {/* RFID table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
<div className="flex justify-between items-center px-4 py-2.5 bg-gray-50 border-b border-gray-100">
  <span className="text-sm font-medium text-gray-900">Registered RFIDs</span>
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
      {filteredRfids.length} {filteredRfids.length === 1 ? "tag" : "tags"}
    </span>
<select
  value={rfidRoleFilter}
  onChange={(e) => { setRfidRoleFilter(e.target.value); setRfidPage(1); }}
  className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
>
  <option value="all">All Types</option>
  <option value="Partner">Partner / Staff</option>
  <option value="Member">Member</option>
  <option value="DayPass">Day Pass</option>
</select>
<select
  value={rfidStatusFilter}
  onChange={(e) => { setRfidStatusFilter(e.target.value); setRfidPage(1); }}
  className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
>
  <option value="all">All Status</option>
  <option value="in_stock">In Stock</option>
  <option value="allocated">Allocated</option>
  <option value="deactivated">Deactivated</option>
</select>
  </div>
</div>

              {rfidError && (
                <div className="px-4 py-2 bg-red-50 text-red-600 text-xs border-b border-red-100">
                  {rfidError}
                </div>
              )}

              <div className="overflow-auto max-h-[400px]">
                {rfids.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4 text-center">No RFIDs registered</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0">
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">#</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Warehouse #</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">RFID tag / type</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Role</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Customer No.</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Allocated to</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Created at</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {currentRfids.map((rfid, index) => (
                        <tr key={rfid.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-400">{index + 1}</td>

                          <td className="px-4 py-3">
                            <span className="font-mono font-medium text-blue-600 text-xs">
                              {rfid.warehouse_number || "N/A"}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <p className="font-mono text-xs text-gray-800">{rfid.rfid_tag}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{rfid.rfid_type || "N/A"}</p>
                          </td>

                          <td className="px-4 py-3">
                            <span className="text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-full px-2.5 py-0.5">
                              {rfid.role || "N/A"}
                            </span>
                          </td>
<td className="px-4 py-3 text-xs text-gray-600">
                            {rfid.customer_number_display || "—"}
                          </td>
                          <td className="px-4 py-3">
                          <span className={`text-xs rounded-full px-2.5 py-0.5 border ${getStatusDisplay(rfid.status).color}`}>
                            {getStatusDisplay(rfid.status).label}
                          </span>
                          </td>

                          <td className="px-4 py-3">
                            {rfid.allocated_to_admin ? (
                              <span className="text-xs font-medium text-blue-600">
                                {rfid.gym_name || `Admin #${rfid.allocated_to_admin}`}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-xs text-gray-400">
                            {new Date(rfid.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
         </div>
                <PaginationBar
  page={rfidPage}
  totalPages={rfidTotalPages}
  onPageChange={setRfidPage}
/>
     
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default ItemsInventory;