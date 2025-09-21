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

    <main className="flex-1 p-4 space-y-3">
      {/* Header */}
      <div className="mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-2xl font-semibold text-gray-800">
            Prepaid Analytical Dashboard
          </h1>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="px-2 py-1 w-32 border border-gray-300 rounded-md text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last-7-days">Last 7 Days</option>
          </select>
        </div>
        <p className="text-gray-600 text-xs mt-1">
          Overview of prepaid logins, revenue, and activity trends
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Active Members Inside"
          value={analytics.active_members_inside}
          color="text-blue-600"
          textSize="text-sm"
        />
        <KpiCard
          title="Prepaid Revenue Today"
          value={`₱${Number(analytics?.prepaid_revenue_today ?? 0).toLocaleString()}`}
          color="text-green-600"
          textSize="text-sm"
        />
        <KpiCard
          title="Total Prepaid Logins"
          value={Number(analytics?.total_logins_today ?? 0)}
          color="text-purple-600"
          textSize="text-sm"
        />
        <KpiCard
          title="Peak Hour"
          value={analytics.peak_hour}
          color="text-gray-700"
          textSize="text-sm"
        />
      </div>

      {/* Charts */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="lg:w-3/4 w-full bg-white rounded-md shadow-sm p-2">
          <h2 className="text-xs font-semibold mb-2">Login Trends by Hour</h2>
          <Line data={scanLineData} options={{ maintainAspectRatio: false }} />
        </div>
        <div className="lg:w-1/4 w-full bg-white rounded-md shadow-sm p-2">
          <h2 className="text-xs font-semibold mb-2">Top-Up vs Session Breakdown</h2>
          <Pie data={actionsData} options={pieOptions} />
        </div>
      </div>

      {/* Recent Events Table */}
      <div className="bg-white p-2 rounded-md shadow-sm max-h-[20rem] overflow-y-auto">
        <h2 className="text-xs font-semibold text-gray-800 mb-1">
          Recent Prepaid Events
        </h2>
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="text-gray-600 border-b">
              <th className="p-2 w-8 text-center">#</th>
              <th className="p-2 text-left">Member</th>
              <th className="p-2">RFID</th>
              <th className="p-2">Action</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Time</th>
              <th className="p-2">Balance After</th>
            </tr>
          </thead>
          <tbody>
            {analytics?.recent_events?.length > 0 ? (
              analytics.recent_events.map((event, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2 text-center text-gray-500">{index + 1}</td>
                  <td className="p-2">{event.name}</td>
                  <td className="p-2 font-mono">{event.rfid}</td>
                  <td className="p-2">{event.action}</td>
                  <td className="p-2">₱{event.amount}</td>
                  <td className="p-2">{event.time}</td>
                  <td className="p-2">₱{event.balance}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-3 text-center text-gray-500 text-xs">
                  No recent prepaid events available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  </div>
);



};

export default ItemsInventory;
