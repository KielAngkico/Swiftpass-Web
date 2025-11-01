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

  // RFID type/role options
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

  const [selectedItem, setSelectedItem] = useState(null);
  const [addQty, setAddQty] = useState("");

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
      await fetchItems(); // Refresh inventory to show updated count

      if (!rfidTag) setScanValue("");
      showToast({ message: "RFID registered successfully!", type: "success" });
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

  const updateQuantity = async (id, newQty) => {
    if (!newQty || newQty < 0) {
      showToast({ message: "Invalid quantity", type: "error" });
      return;
    }

    try {
      await api.put(`/api/inventory/${id}`, { quantity: parseInt(newQty) });
      await fetchItems();
      setSelectedItem(null);
      setAddQty("");
      showToast({ message: "Quantity updated!", type: "success" });
    } catch (error) {
      console.error("Failed to update quantity:", error);
      showToast({ message: "Failed to update quantity", type: "error" });
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
    }
    else if (rfidData?.rfid_tag && rfidData?.type === "rfid-registration-check") {
      console.log("📡 RFID from WebSocket:", rfidData.rfid_tag);
      rfidTagToUse = rfidData.rfid_tag;
      
      // Show toast based on role
      if (rfidData.role) {
        if (rfidData.role === 'Member') {
          showToast({ message: `Member RFID scanned: ${rfidTagToUse}`, type: "info" });
        } else if (rfidData.role === 'DayPass') {
          showToast({ message: `Day Pass RFID scanned: ${rfidTagToUse}`, type: "info" });
        }
      }
    }

    if (rfidTagToUse) {
      setScanValue(rfidTagToUse);
      console.log("✅ Auto-populated scan input with:", rfidTagToUse);
    }
  }, [location.state, rfidData]);

  const filteredItems = items.filter((it) =>
    it.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return <div>Checking authentication...</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />

      <main className="flex-1 p-5">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            Inventory Management
          </h1>
          <p className="text-gray-600 text-xs">Manage items and RFID tags</p>
        </div>

        {/* Add Item & RFID Forms */}
        <div className="flex gap-2 mb-5 items-center">
          <div className="flex gap-2 bg-white p-2 rounded-md shadow-sm">
            <input
              type="text"
              placeholder="Item Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-32 px-2 py-1 border border-gray-300 rounded text-xs"
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Purchase"
              value={form.purchase_price}
              onChange={(e) =>
                setForm({ ...form, purchase_price: e.target.value })
              }
              className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Selling"
              value={form.selling_price}
              onChange={(e) =>
                setForm({ ...form, selling_price: e.target.value })
              }
              className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
              required
            />
            <input
              type="number"
              placeholder="Qty"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-14 px-2 py-1 border border-gray-300 rounded text-xs"
              min="1"
              required
            />
            <button
              onClick={addManualItem}
              className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-xs whitespace-nowrap"
            >
              Add Item
            </button>
          </div>

          {/* RFID Registration Form with Dropdown */}
          <div className="flex gap-2 bg-white p-2 rounded-md shadow-sm">
            <select
              value={JSON.stringify(selectedRfidOption)}
              onChange={(e) => setSelectedRfidOption(JSON.parse(e.target.value))}
              className="w-40 px-2 py-1 border border-gray-300 rounded text-xs"
            >
              {rfidOptions.map((option, idx) => (
                <option key={idx} value={JSON.stringify(option)}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              placeholder="Scan RFID..."
              className="w-32 px-2 py-1 border border-gray-300 rounded text-xs"
              autoFocus
            />
            <button
              onClick={() => addScannedItem()}
              className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-xs whitespace-nowrap"
            >
              Add RFID
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-4">
          {/* Inventory Table */}
          <div className="flex-1 bg-white rounded-md shadow-sm p-2 overflow-auto max-h-[60vh]">
            <div className="font-semibold mb-2 text-xs flex justify-between items-center">
              <span>Inventory</span>
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs w-40"
              />
            </div>

            {loading ? (
              <p className="text-xs">Loading...</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-xs">No items found</p>
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 border">#</th>
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Purchase Price</th>
                    <th className="p-2 border">Selling Price</th>
                    <th className="p-2 border">Quantity</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-2 border text-center">{index + 1}</td>
                      <td className="p-2 border">{item.name}</td>
                      <td className="p-2 border text-center">
                        ₱{item.purchase_price}
                      </td>
                      <td className="p-2 border text-center">
                        ₱{item.selling_price}
                      </td>
                      <td className="p-2 border text-center">{item.quantity}</td>
                      <td className="p-2 border flex justify-center gap-2">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="bg-blue-500 text-white px-2 py-1 rounded-md text-xs hover:bg-blue-600"
                        >
                          Add Qty
                        </button>
                        <button
                          onClick={() => deleteItem(item.id, item.name)}
                          className="bg-red-500 text-white px-2 py-1 rounded-md text-xs hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Add Quantity Panel */}
          <div className="w-1/2 bg-white rounded-md shadow-sm p-3">
            {selectedItem ? (
              <>
                <h2 className="text-sm font-semibold mb-2">
                  Add Quantity for{" "}
                  <span className="font-bold">{selectedItem.name}</span>
                </h2>
                <input
                  type="number"
                  placeholder="Enter quantity"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-xs mb-2"
                  min="1"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setAddQty("");
                    }}
                    className="px-3 py-1 bg-gray-400 text-white rounded-md text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      updateQuantity(
                        selectedItem.id,
                        selectedItem.quantity + parseInt(addQty)
                      )
                    }
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-xs">
                Select an item from the table to add quantity
              </p>
            )}
          </div>
        </div>

        {/* Registered RFIDs Table */}
        <div className="bg-white rounded-md shadow-sm mt-5">
          <div className="p-2 border-b font-semibold text-xs">
            <span>Registered RFIDs ({rfids.length})</span>
          </div>

          {rfidError && (
            <div className="p-2 bg-red-50 text-red-700 text-xs border-b border-red-200">
              {rfidError}
            </div>
          )}

          <div className="overflow-auto max-h-[400px]">
            {rfids.length === 0 ? (
              <p className="text-xs p-2">No RFIDs registered</p>
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead className="bg-gray-900 text-white sticky top-0">
                  <tr>
                    <th className="p-2 border border-gray-700">#</th>
                    <th className="p-2 border border-gray-700">RFID Tag / Type</th>
                    <th className="p-2 border border-gray-700">Role</th>
                    <th className="p-2 border border-gray-700">Status</th>
                    <th className="p-2 border border-gray-700">Allocated To</th>
                    <th className="p-2 border border-gray-700">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {rfids.map((rfid, index) => (
                    <tr key={rfid.id} className="hover:bg-gray-50">
                      <td className="p-2 border text-center">{index + 1}</td>
                      <td className="p-2 border">
                        <div className="font-mono">{rfid.rfid_tag}</div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          {rfid.rfid_type || 'N/A'}
                        </div>
                      </td>
                      <td className="p-2 border text-center">
                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                          {rfid.role || 'N/A'}
                        </span>
                      </td>
                      <td className="p-2 border text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs ${
                          rfid.status === 'in_stock' ? 'bg-green-100 text-green-800' :
                          rfid.status === 'allocated' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {rfid.status || 'N/A'}
                        </span>
                      </td>
                      <td className="p-2 border text-center">
                        {rfid.allocated_to_admin ? (
                          <span className="text-blue-600 font-medium">
                            {rfid.gym_name || `Admin #${rfid.allocated_to_admin}`}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-2 border">
                        {new Date(rfid.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ItemsInventory;