import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OwnerSidebar from "../../components/OwnerSidebar";
import api from "../../api";
import { useToast } from "../../components/ToastManager";

const ROWS_PER_PAGE = 20;

const MyRfidsInventory = () => {
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState({ stats: {}, rfids: [] });
  const [filteredRfids, setFilteredRfids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
const [page, setPage] = useState(1);

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

  useEffect(() => {
    let filtered = (inventory.rfids || []).filter(r => r.status !== 'replaced' && r.status !== 'deactivated');
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (rfid) =>
          rfid.customer_number_display?.toLowerCase().includes(term) ||
          rfid.assigned_to_name?.toLowerCase().includes(term) ||
          rfid.rfid_tag?.toLowerCase().includes(term)
      );
    }
    if (filterType !== "All") filtered = filtered.filter((rfid) => rfid.role === filterType);
if (filterStatus === "Available") filtered = filtered.filter((rfid) => rfid.status === 'allocated');
else if (filterStatus === "In Use") filtered = filtered.filter((rfid) => rfid.status === 'in_use');
    setFilteredRfids(filtered);
setPage(1);
  }, [searchTerm, filterType, filterStatus, inventory.rfids]);

  const getRoleLabel = (role) => {
    const labels = { Member: "Member", Partner: "Staff/Admin", DayPass: "Day Pass" };
    return labels[role] || role;
  };

  const getRoleBadge = (role) => {
    const config = {
      Member: "bg-blue-50 text-blue-700 border-blue-100",
      Partner: "bg-purple-50 text-purple-700 border-purple-100",
      DayPass: "bg-amber-50 text-amber-700 border-amber-100",
    };
    return config[role] || "bg-gray-100 text-gray-500 border-gray-200";
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
const totalPages = Math.max(1, Math.ceil(filteredRfids.length / ROWS_PER_PAGE));
const paginated = filteredRfids.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

return (
  <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />
      <main className="flex-1 min-w-0 p-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">My RFID Inventory</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage and track your RFID assets</p>
        </div>

        {!loading && inventory.stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <KpiCard
              title="Total RFIDs"
              value={inventory.stats.total || 0}
              sub={`${inventory.stats.in_use || 0} in use · ${inventory.stats.available || 0} available`}
            />
            <KpiCard
              title="Staff RFIDs"
              value={inventory.stats.staff_left || 0}
              sub={`available of ${inventory.stats.staff_total || 0}`}
            />
            <KpiCard
              title="Member RFIDs"
              value={inventory.stats.member_left || 0}
              sub={`available of ${inventory.stats.member_total || 0}`}
            />
            <KpiCard
              title="Day Pass RFIDs"
              value={inventory.stats.daypass_left || 0}
              sub={`available of ${inventory.stats.daypass_total || 0}`}
            />
          </div>
        )}

        <div className="inline-flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 mb-5">
          <label className="text-xs text-gray-500">Filter:</label>
          <input
            type="text"
            placeholder="Search warehouse, name, or tag"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Types</option>
            <option value="Member">Members</option>
            <option value="Partner">Staff/Admin</option>
            <option value="DayPass">Day Pass</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Status</option>
            <option value="Available">Available Only</option>
            <option value="In Use">In Use Only</option>
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">RFID</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">RFID Tag</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Allocated To</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Received Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center">
                    <p className="text-xs text-gray-400">Loading inventory...</p>
                  </td>
                </tr>
              ) : filteredRfids.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center">
                    <p className="text-xs text-gray-400">No RFIDs found</p>
                  </td>
                </tr>
              ) : (
                paginated.map((rfid) => (
                  <tr key={rfid.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{rfid.customer_number || "—"}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-800">
                      {rfid.customer_number_display ? (
                        rfid.customer_number_display
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] border bg-green-50 text-green-700 border-green-100 font-medium">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono">{rfid.rfid_tag}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] border font-medium ${getRoleBadge(rfid.role)}`}>
                        {getRoleLabel(rfid.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-800">
                      {rfid.assigned_to_name ? (
                        rfid.assigned_to_name
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] border bg-green-50 text-green-700 border-green-100 font-medium">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {rfid.allocation_date ? formatDate(rfid.allocation_date) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
</table>
        </div>

        {filteredRfids.length > ROWS_PER_PAGE && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 bg-white rounded-b-xl">
            <p className="text-xs text-gray-400">
              {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filteredRfids.length)} of {filteredRfids.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">Prev</button>
              <span className="text-xs text-gray-500 px-2">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">Next</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors">»</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const KpiCard = ({ title, value, sub }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4">
    <p className="text-xs text-gray-500">{title}</p>
    <p className="text-lg font-semibold text-gray-900 mt-0.5">{value}</p>
    <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
  </div>
);

export default MyRfidsInventory;