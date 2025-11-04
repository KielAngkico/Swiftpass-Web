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
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRfid, setSelectedRfid] = useState(null);
  const [assignName, setAssignName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { showToast, showConfirm } = useToast();

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

  const handleAssignClick = (rfid) => {
    setSelectedRfid(rfid);
    setAssignName(rfid.assigned_to_name || "");
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();

    if (!assignName.trim()) {
      showToast({ message: "Please enter a name", type: "error" });
      return;
    }

    try {
      setSubmitting(true);
      const adminId = user.adminId || user.id;

      await api.put(`/api/partner-rfids/${selectedRfid.id}/assign`, {
        assigned_to_name: assignName.trim(),
        admin_id: adminId,
      });

      showToast({
        message: `${selectedRfid.warehouse_number} assigned to ${assignName.trim()}`,
        type: "success",
      });

      setShowAssignModal(false);
      setSelectedRfid(null);
      setAssignName("");

      // Refresh inventory
      const { data } = await api.get(`/api/partner-rfids/inventory/${adminId}`);
      setInventory(data);
      setFilteredRfids(data.rfids || []);
    } catch (error) {
      console.error("Failed to assign RFID:", error);
      showToast({
        message: error.response?.data?.error || "Failed to assign RFID",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassign = (rfid) => {
    showConfirm(
      `Make ${rfid.warehouse_number} available again?`,
      async () => {
        try {
          const adminId = user.adminId || user.id;

          await api.put(`/api/partner-rfids/${rfid.id}/unassign`, {
            admin_id: adminId,
          });

          showToast({
            message: `${rfid.warehouse_number} is now available`,
            type: "success",
          });

          // Refresh inventory
          const { data } = await api.get(`/api/partner-rfids/inventory/${adminId}`);
          setInventory(data);
          setFilteredRfids(data.rfids || []);
        } catch (error) {
          console.error("Failed to unassign RFID:", error);
          showToast({
            message: error.response?.data?.error || "Failed to unassign RFID",
            type: "error",
          });
        }
      }
    );
  };

  const getRoleLabel = (role) => {
    const labels = {
      Member: "Member",
      Partner: "Staff",
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

        {/* KPI Cards */}
        {!loading && inventory.stats && (
          <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white shadow rounded p-4 text-center border-l-4 border-blue-500">
              <h3 className="text-xs text-gray-600 mb-1">Total RFIDs</h3>
              <p className="text-2xl font-bold text-gray-800">
                {inventory.stats.total || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {inventory.stats.in_use || 0} in use • {inventory.stats.available || 0} available
              </p>
            </div>

            <div className="bg-white shadow rounded p-4 text-center border-l-4 border-purple-500">
              <h3 className="text-xs text-gray-600 mb-1">Staff RFIDs</h3>
              <p className="text-2xl font-bold text-purple-600">
                {inventory.stats.staff_left || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                available of {inventory.stats.staff_total || 0}
              </p>
            </div>

            <div className="bg-white shadow rounded p-4 text-center border-l-4 border-green-500">
              <h3 className="text-xs text-gray-600 mb-1">Member RFIDs</h3>
              <p className="text-2xl font-bold text-green-600">
                {inventory.stats.member_left || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                available of {inventory.stats.member_total || 0}
              </p>
            </div>

            <div className="bg-white shadow rounded p-4 text-center border-l-4 border-orange-500">
              <h3 className="text-xs text-gray-600 mb-1">DayPass RFIDs</h3>
              <p className="text-2xl font-bold text-orange-600">
                {inventory.stats.daypass_left || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
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
            <option value="Partner">Staff</option>
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
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Allocated To</th>
                <th className="px-3 py-2">Received Date</th>
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-3 py-6 text-center bg-white">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full"></div>
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
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-1 rounded-full text-[9px] font-medium ${
                          rfid.role === "Member"
                            ? "bg-green-100 text-green-700"
                            : rfid.role === "Partner"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {getRoleLabel(rfid.role)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {rfid.assigned_to_name ? (
                        <span className="font-medium text-gray-800">
                          {rfid.assigned_to_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Available</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {rfid.allocation_date
                        ? formatDate(rfid.allocation_date)
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2 justify-center">
                        {rfid.assigned_to_name ? (
                          <button
                            onClick={() => handleUnassign(rfid)}
                            className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-[9px] sm:text-xs font-medium transition-colors"
                          >
                            Unassign
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssignClick(rfid)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-[9px] sm:text-xs font-medium transition-colors"
                          >
                            Assign
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Assign Modal */}
        {showAssignModal && selectedRfid && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-lg">
                <h2 className="text-xl font-bold text-white">
                  Assign RFID
                </h2>
                <p className="text-blue-100 text-sm">
                  {selectedRfid.warehouse_number}
                </p>
              </div>

              <form onSubmit={handleAssignSubmit} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {getRoleLabel(selectedRfid.role)} Name *
                  </label>
                  <input
                    type="text"
                    value={assignName}
                    onChange={(e) => setAssignName(e.target.value)}
                    placeholder={`Enter ${getRoleLabel(selectedRfid.role).toLowerCase()} name`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This RFID will be assigned to this person
                  </p>
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">
                      {getRoleLabel(selectedRfid.role)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">RFID Tag:</span>
                    <span className="font-mono font-medium">
                      {selectedRfid.rfid_tag}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Received:</span>
                    <span className="font-medium">
                      {formatDate(selectedRfid.allocation_date)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedRfid(null);
                      setAssignName("");
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !assignName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-blue-400 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Assigning...
                      </>
                    ) : (
                      "Assign RFID"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyRfidsInventory;