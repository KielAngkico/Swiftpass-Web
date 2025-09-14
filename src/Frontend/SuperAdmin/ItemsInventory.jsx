import React, { useEffect, useState } from "react";
import api from "../../api";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import { useAuth } from "../../App";
import { useWebSocket } from "../../contexts/WebSocketContext"; // Adjust path

const ItemsInventory = () => {
  const { user } = useAuth();
  const { rfidData } = useWebSocket(); // <-- listen to WS from provider
  const [items, setItems] = useState([]);
  const [rfids, setRfids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [form, setForm] = useState({ name: "", quantity: 1 });
  const [selectedItem, setSelectedItem] = useState(null);
  const [addQty, setAddQty] = useState("");

  // Fetch inventory
  const fetchItems = async () => {
    try {
      const { data } = await api.get("/api/inventory");
      setItems(data);
    } catch {
      alert("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  // Fetch RFIDs
  const fetchRfids = async () => {
    try {
      const { data } = await api.get("/api/rfid");
      setRfids(data);
    } catch {
      console.error("RFID fetch error");
    }
  };

  const addScannedItem = async (rfidTag) => {
    const tag = rfidTag || scanValue.trim();
    if (!tag) return;
    if (rfids.some((r) => r.rfid_tag === tag)) {
      console.warn(`RFID ${tag} already registered.`);
      return;
    }
    try {
      await api.post("/api/rfid", { rfid_tag: tag });
      fetchRfids();
      if (!rfidTag) setScanValue("");
    } catch {
      alert("Failed to add RFID");
    }
  };

  // Add item manually
  const addManualItem = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.quantity < 1) return;
    try {
      await api.post("/api/inventory", {
        name: form.name.trim(),
        quantity: parseInt(form.quantity) || 1,
      });
      setForm({ name: "", quantity: 1 });
      fetchItems();
    } catch {
      alert("Failed to add item");
    }
  };

  const updateQuantity = async (id, newQty) => {
    if (!newQty || newQty < 0) return;
    try {
      await api.put(`/api/inventory/${id}`, { quantity: parseInt(newQty) });
      fetchItems();
      setSelectedItem(null);
      setAddQty("");
    } catch {
      alert("Failed to update quantity");
    }
  };

  const deleteItem = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/api/inventory/${id}`);
      fetchItems();
    } catch {
      alert("Failed to delete item");
    }
  };

  useEffect(() => {
    if (user) {
      fetchItems();
      fetchRfids();
    }
  }, [user]);

  // Fill scan input whenever a new SUPERADMIN RFID comes from WebSocket
  useEffect(() => {
    if (rfidData?.location === "SUPERADMIN" && rfidData.rfid_tag) {
      console.log("📥 Received SUPERADMIN RFID:", rfidData.rfid_tag);
      setScanValue(rfidData.rfid_tag);
    }
  }, [rfidData]);

  const filteredItems = items.filter((it) =>
    it.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return <div>Checking authentication...</div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <SuperAdminSidebar />
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">Inventory Management</h1>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-1/3 p-2 border border-gray-300 rounded"
          />
        </div>

        {/* Add Item / RFID */}
        <div className="flex gap-4 mb-6">
          <form
            onSubmit={addManualItem}
            className="flex-1 flex gap-2 bg-white p-3 rounded shadow-sm"
          >
            <input
              type="text"
              placeholder="Item Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="flex-1 p-2 border border-gray-300 rounded"
              required
            />
            <input
              type="number"
              placeholder="Qty"
              value={form.quantity}
              onChange={(e) =>
                setForm({ ...form, quantity: e.target.value })
              }
              className="w-24 p-2 border border-gray-300 rounded"
              min="1"
              required
            />
            <button className="bg-blue-600 text-white px-4 py-2 rounded">
              Add
            </button>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addScannedItem();
            }}
            className="flex-1 flex gap-2 bg-white p-3 rounded shadow-sm"
          >
            <input
              type="text"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              placeholder="Scan RFID..."
              className="flex-1 p-2 border border-gray-300 rounded"
            />
            <button className="bg-green-600 text-white px-4 py-2 rounded">
              Add RFID
            </button>
          </form>
        </div>

        {/* Inventory Table */}
        <div className="flex gap-6">
          <div className="flex-1 bg-white rounded shadow-sm p-3 overflow-auto max-h-[70vh]">
            <div className="font-semibold mb-3">Inventory</div>
            {loading ? (
              <p>Loading...</p>
            ) : filteredItems.length === 0 ? (
              <p>No items found</p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 border">#</th>
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Quantity</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-2 border text-center">{index + 1}</td>
                      <td className="p-2 border text-center">{item.name}</td>
                      <td className="p-2 border text-center">{item.quantity}</td>
                      <td className="p-2 border flex justify-center gap-2">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="bg-blue-500 text-white px-3 py-1 rounded"
                        >
                          Add Qty
                        </button>
                        <button
                          onClick={() => deleteItem(item.id, item.name)}
                          className="bg-red-500 text-white px-3 py-1 rounded"
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

          <div className="w-1/2 bg-white rounded shadow-sm p-4">
            {selectedItem ? (
              <>
                <h2 className="text-lg font-semibold mb-4">
                  Add Quantity for{" "}
                  <span className="font-bold">{selectedItem.name}</span>
                </h2>
                <input
                  type="number"
                  placeholder="Enter quantity"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  className="w-full p-2 border rounded mb-4"
                  min="1"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setAddQty("");
                    }}
                    className="px-4 py-2 bg-gray-400 text-white rounded"
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
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Save
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-500">
                Select an item from the table to add quantity
              </p>
            )}
          </div>
        </div>

        {/* Registered RFIDs Table */}
        <div className="bg-white rounded shadow-sm mt-6">
          <div className="p-3 border-b font-semibold">Registered RFIDs</div>
          <div className="p-3">
            {rfids.length === 0 ? (
              <p>No RFIDs registered</p>
            ) : (
              <table className="w-full border-collapse">
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
