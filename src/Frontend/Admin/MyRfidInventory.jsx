import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OwnerSidebar from "../../components/OwnerSidebar";
import api from "../../api";
import { useToast } from "../../components/ToastManager";

const MyRfidsInventory = () => {
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState({ stats: {}, rfids: [] });
  const [filteredRfids, setFilteredRfids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        if (!data?.authenticated || !data?.user) throw new Error("Not authenticated");
        setUser(data.user);
      } catch {
        navigate("/login");
      }
    };
    fetchUser();
  }, [navigate]);

  useEffect(() => {
    if (!user?.id && !user?.adminId) return;

    const fetchInventory = async () => {
      try {
        setLoading(true);
        const adminId = user.adminId || user.id;
        const { data } = await api.get(`/api/partner-rfids/inventory/${adminId}`);
        setInventory(data);
        setFilteredRfids(data.rfids || []);
      } catch (error) {
        console.error("Failed to load RFID inventory:", error);
        showToast({ message: "Failed to load RFID inventory.", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, [user]);

  // Apply filters
  useEffect(() => {
    let filtered = inventory.rfids || [];

    // Search by warehouse number or assigned name
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (rfid) =>
          rfid.warehouse_number?.toLowerCase().includes(term) ||
          rfid.assigned_to_name?.toLowerCase().includes(term) ||
          rfid.rfid_tag?.toLowerCase().includes(term)
      );
    }

    // Filter by type (role)
    if (filterType !== "All") {
      filtered = filtered.filter((rfid) => rfid.role === filterType);
    }

    // Filter by status (available/in use)
    if (filterStatus === "Available") {
      filtered = filtered.filter((rfid) => !rfid.assigned_to_name);
    } else if (filterStatus === "In Use") {
      filtered = filtered.filter((rfid) => rfid.assigned_to_name);
    }

    setFilteredRfids(filtered);
  }, [searchTerm, filterType, filterStatus, inventory.rfids]);

  const getRoleLabel = (role) => {
    const labels = {
      Member: "Member",
      Partner: "Staff/Admin",
      DayPass: "DayPass",
    };
    return labels[role] || role;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />
      <main className="flex-1 p-5">
        <div className="mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            My RFID Inventory
          </h2>
          <p className="text-xs text-gray-500">
            Manage and track your RFID assets
          </p>
        </div>

        {/* KPI Cards - Simple Black & White */}
        {!loading && inventory.stats && (
          <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border-2 border-black rounded p-4">
              <h3 className="text-xs text-gray-600 mb-1 font-semibold">Total RFIDs</h3>
              <p className="text-2xl font-bold text-black">
                {inventory.stats.total || 0}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {inventory.stats.in_use || 0} in use • {inventory.stats.available || 0} available
              </p>
            </div>

            <div className="bg-white border-2 border-black rounded p-4">
              <h3 className="text-xs text-gray-600 mb-1 font-semibold">Staff RFIDs</h3>
              <p className="text-2xl font-bold text-black">
                {inventory.stats.staff_left || 0}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                available of {inventory.stats.staff_total || 0}
              </p>
            </div>

            <div className="bg-white border-2 border-black rounded p-4">
              <h3 className="text-xs text-gray-600 mb-1 font-semibold">Member RFIDs</h3>
              <p className="text-2xl font-bold text-black">
                {inventory.stats.member_left || 0}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                available of {inventory.stats.member_total || 0}
              </p>
            </div>

            <div className="bg-white border-2 border-black rounded p-4">
              <h3 className="text-xs text-gray-600 mb-1 font-semibold">DayPass RFIDs</h3>
              <p className="text-2xl font-bold text-black">
                {inventory.stats.daypass_left || 0}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                available of {inventory.stats.daypass_total || 0}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <input
            type="text"
            placeholder="🔍 Search warehouse #, name, or tag"
            className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm placeholder:text-gray-400 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm bg-white"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Member">Members</option>
            <option value="Partner">Staff/Admin</option>
            <option value="DayPass">DayPass</option>
          </select>

          <select
            className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm bg-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Available">Available Only</option>
            <option value="In Use">In Use Only</option>
          </select>
        </div>

        {/* RFID Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-[10px] sm:text-xs text-left border-collapse">
            <thead className="bg-gray-700 text-white uppercase text-[9px] sm:text-[10px]">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Warehouse #</th>
                <th className="px-3 py-2">RFID Tag</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Allocated To</th>
                <th className="px-3 py-2">Received Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-3 py-6 text-center bg-white">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-6 w-6 border-b-2 border-gray-600 rounded-full"></div>
                      <span className="ml-2 text-gray-500 text-xs">
                        Loading inventory...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredRfids.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-3 py-6 text-center bg-white text-xs text-gray-400"
                  >
                    No RFIDs found
                  </td>
                </tr>
              ) : (
                filteredRfids.map((rfid, index) => (
                  <tr
                    key={rfid.id}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-3 py-2 text-gray-600">
                      {rfid.customer_number || "-"}
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold text-gray-800">
                      {rfid.warehouse_number}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-700">
                      {rfid.rfid_tag}
                    </td>
                    <td className="px-3 py-2 text-gray-800">
                      {getRoleLabel(rfid.role)}
                    </td>
                    <td className="px-3 py-2 text-gray-800">
                      {rfid.assigned_to_name || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {rfid.allocation_date
                        ? formatDate(rfid.allocation_date)
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default MyRfidsInventory;