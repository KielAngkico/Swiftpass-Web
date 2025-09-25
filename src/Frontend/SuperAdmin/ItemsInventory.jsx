import React, { useEffect, useState } from "react";
import api from "../../api";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import { useAuth } from "../../App";
import { useWebSocket } from "../../contexts/WebSocketContext"; 

const ItemsInventory = () => {
  const { user } = useAuth();
  const { rfidData } = useWebSocket(); 
  const [items, setItems] = useState([]);
  const [rfids, setRfids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [form, setForm] = useState({ name: "", quantity: 1 });
  const [selectedItem, setSelectedItem] = useState(null);
  const [addQty, setAddQty] = useState("");
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
  <div className="flex min-h-screen bg-gray-50">
    <SuperAdminSidebar />
    <main className="flex-1 p-5">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Inventory Management</h1>
        <p className="text-gray-600 text-xs">Manage items and RFID tags</p>
      </div>

      <div className="flex gap-4 mb-5 items-start">
        <form
          onSubmit={addManualItem}
          className="w-[380px] flex gap-2 bg-white p-2 rounded-md shadow-sm"
        >
          <input
            type="text"
            placeholder="Item Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
            required
          />
          <input
            type="number"
            placeholder="Qty"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="w-12 px-2 py-1 border border-gray-300 rounded text-xs"
            min="1"
            required
          />
          <button className="bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 text-xs">
            Add
          </button>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addScannedItem();
          }}
          className="w-[300px] flex gap-2 bg-white p-2 rounded-md shadow-sm"
        >
          <input
            type="text"
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            placeholder="Scan RFID..."
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
          />
          <button className="bg-green-600 text-white px-2 py-1 rounded-md hover:bg-green-700 text-xs">
            Add RFID
          </button>
        </form>
      </div>

      <div className="flex gap-4">
        {/* Inventory Table */}
        <div className="flex-1 bg-white rounded-md shadow-sm p-2 overflow-auto max-h-[60vh]">
          <div className="font-semibold mb-2 text-xs">Inventory</div>
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
                Add Quantity for <span className="font-bold">{selectedItem.name}</span>
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

      {/* RFID Table */}
      <div className="bg-white rounded-md shadow-sm mt-5">
        <div className="p-2 border-b font-semibold text-xs">Registered RFIDs</div>
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
