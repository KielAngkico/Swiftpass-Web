import React, { useEffect, useState } from "react";
import api from "../../api";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import { useAuth } from "../../App";
import { useWebSocket } from "../../contexts/WebSocketContext";
import { useLocation } from "react-router-dom";

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

  const [form, setForm] = useState({
    name: "",
    purchase_price: "",
    selling_price: "",
    quantity: 1,
  });

  const [selectedItem, setSelectedItem] = useState(null);
  const [addQty, setAddQty] = useState("");

  // ✅ Fetch items from backend
  const fetchItems = async () => {
    try {
      const { data } = await api.get("/api/inventory");
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      alert("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch RFIDs from backend database
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

  // ✅ Add scanned RFID to database
  const addScannedItem = async (rfidTag) => {
    const tag = rfidTag || scanValue.trim();
    if (!tag) {
      alert("Please scan an RFID tag or enter one manually");
      return;
    }

    // Check if already registered
    if (rfids.some((r) => r.rfid_tag === tag)) {
      alert(`RFID ${tag} is already registered.`);
      return;
    }

    try {
      const response = await api.post("/api/rfid", { rfid_tag: tag });
      console.log("RFID registered successfully:", response.data);

      // Refresh the RFID list
      await fetchRfids();

      if (!rfidTag) setScanValue("");
      alert("RFID registered successfully!");
    } catch (error) {
      console.error("Failed to add RFID:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Failed to add RFID");
    }
  };

  // Add manual item
  const addManualItem = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.quantity < 1) {
      alert("Please fill in all required fields");
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
      alert("Item added successfully!");
    } catch (error) {
      console.error("Failed to add item:", error);
      alert("Failed to add item");
    }
  };

  // Update item quantity
  const updateQuantity = async (id, newQty) => {
    if (!newQty || newQty < 0) {
      alert("Invalid quantity");
      return;
    }

    try {
      await api.put(`/api/inventory/${id}`, { quantity: parseInt(newQty) });
      await fetchItems();
      setSelectedItem(null);
      setAddQty("");
      alert("Quantity updated!");
    } catch (error) {
      console.error("Failed to update quantity:", error);
      alert("Failed to update quantity");
    }
  };

  // Delete item
  const deleteItem = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;

    try {
      await api.delete(`/api/inventory/${id}`);
      await fetchItems();
      alert("Item deleted!");
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert("Failed to delete item");
    }
  };

  // ✅ Initialize on component mount
  useEffect(() => {
    if (user) {
      fetchItems();
      fetchRfids();
    }
  }, [user]);

  // ✅ Check both WebSocket data AND navigation state for RFID
  useEffect(() => {
    let rfidTagToUse = null;

    // First priority: Check if RFID came from navigation state
    if (location.state?.rfid_tag) {
      console.log("📍 RFID from navigation state:", location.state.rfid_tag);
      rfidTagToUse = location.state.rfid_tag;
    }
    // Second priority: Check WebSocket data
    else if (rfidData?.rfid_tag && rfidData?.type === "rfid-registration-check") {
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
        <div className="flex gap-4 mb-5 items-start">
          <div className="flex flex-wrap gap-2 bg-white p-2 rounded-md shadow-sm">
            <input
              type="text"
              placeholder="Item Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-2 py-1 border border-gray-300 rounded text-xs"
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Purchase Price"
              value={form.purchase_price}
              onChange={(e) =>
                setForm({ ...form, purchase_price: e.target.value })
              }
              className="px-2 py-1 border border-gray-300 rounded text-xs"
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Selling Price"
              value={form.selling_price}
              onChange={(e) =>
                setForm({ ...form, selling_price: e.target.value })
              }
              className="px-2 py-1 border border-gray-300 rounded text-xs"
              required
            />
            <input
              type="number"
              placeholder="Qty"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
              min="1"
              required
            />
            <button
              onClick={addManualItem}
              className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-xs"
            >
              Add Item
            </button>
          </div>

          <div className="w-[300px] flex gap-2 bg-white p-2 rounded-md shadow-sm">
            <input
              type="text"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              placeholder="Scan RFID..."
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
              autoFocus
            />
            <button
              onClick={() => addScannedItem()}
              className="bg-green-600 text-white px-2 py-1 rounded-md hover:bg-green-700 text-xs"
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
          <div className="p-2 border-b font-semibold text-xs flex justify-between items-center">
            <span>Registered RFIDs ({rfids.length})</span>
            <button
              onClick={fetchRfids}
              className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-300"
            >
              Refresh
            </button>
          </div>

          {rfidError && (
            <div className="p-2 bg-red-50 text-red-700 text-xs border-b border-red-200">
              {rfidError}
            </div>
          )}

          <div className="p-2">
            {rfids.length === 0 ? (
              <p className="text-xs">No RFIDs registered</p>
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 border">#</th>
                    <th className="p-2 border">RFID Tag</th>
                    <th className="p-2 border">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {rfids.map((rfid, index) => (
                    <tr key={rfid.id}>
                      <td className="p-2 border">{index + 1}</td>
                      <td className="p-2 border font-mono">{rfid.rfid_tag}</td>
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
