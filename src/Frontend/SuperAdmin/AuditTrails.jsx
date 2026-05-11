import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import { API_URL } from "../../config";
import { useToast } from "../../components/ToastManager";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ROWS_PER_PAGE = 20;

const KpiBox = ({ title, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1">
    <p className="text-xs text-gray-500">{title}</p>
    <p className={`text-base font-semibold ${color}`}>{value}</p>
  </div>
);

const AuditTrails = () => {
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("All");
  const [filterAction, setFilterAction] = useState("All");
  const [filterRole, setFilterRole] = useState("All");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedPayload, setExpandedPayload] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/audit/logs`, { withCredentials: true });
      setLogs(res.data.logs || res.data);
      setFiltered(res.data.logs || res.data);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      showToast({ message: "Failed to fetch audit logs", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let data = logs;

    if (search) {
      const s = search.toLowerCase();
      data = data.filter((log) =>
        (log.user_name || "").toLowerCase().includes(s) ||
        (log.target || "").toLowerCase().includes(s) ||
        (log.description || "").toLowerCase().includes(s) ||
        (log.user_id || "").toString().includes(s)
      );
    }

    if (filterModule !== "All") {
      data = data.filter((log) => log.module === filterModule);
    }

    if (filterAction !== "All") {
      data = data.filter((log) => log.action === filterAction);
    }

    if (filterRole !== "All") {
      data = data.filter((log) => log.user_role === filterRole);
    }

    if (startDate) {
      data = data.filter((log) => new Date(log.created_at) >= startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      data = data.filter((log) => new Date(log.created_at) <= end);
    }

    setFiltered(data);
    setPage(1);
  }, [search, filterModule, filterAction, filterRole, startDate, endDate, logs]);

  const modules = ["All", ...Array.from(new Set(logs.map((l) => l.module).filter(Boolean)))];
  const actions = ["All", "CREATE", "UPDATE", "DELETE", "LOGIN_SUCCESS", "LOGIN_FAILED", "FORGOT_PASSWORD", "RESET_PASSWORD", "RFID_REPLACEMENT", "PAGE_VISIT"];
  const roles = ["All", "superadmin", "admin", "staff"];

  const totalLogs = filtered.length;
  const createCount = filtered.filter((l) => l.action === "CREATE").length;
  const updateCount = filtered.filter((l) => l.action === "UPDATE").length;
  const deleteCount = filtered.filter((l) => l.action === "DELETE").length;
  const failedLogins = filtered.filter((l) => l.action === "LOGIN_FAILED").length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const handleClearFilters = () => {
    setSearch("");
    setFilterModule("All");
    setFilterAction("All");
    setFilterRole("All");
    setStartDate(null);
    setEndDate(null);
  };

  const actionBadge = (action) => {
    const map = {
      CREATE: "bg-green-50 text-green-700 border-green-100",
      UPDATE: "bg-blue-50 text-blue-700 border-blue-100",
      DELETE: "bg-red-50 text-red-500 border-red-100",
      LOGIN_SUCCESS: "bg-green-50 text-green-700 border-green-100",
      LOGIN_FAILED: "bg-red-50 text-red-500 border-red-100",
      FORGOT_PASSWORD: "bg-gray-50 text-gray-500 border-gray-200",
      RESET_PASSWORD: "bg-gray-50 text-gray-500 border-gray-200",
      RFID_REPLACEMENT: "bg-blue-50 text-blue-700 border-blue-100",
      PAGE_VISIT: "bg-gray-50 text-gray-400 border-gray-200",
    };
    return map[action] || "bg-gray-50 text-gray-500 border-gray-200";
  };

  const roleBadge = (role) => {
    const map = {
      superadmin: "bg-blue-50 text-blue-700 border-blue-100",
      admin: "bg-green-50 text-green-700 border-green-100",
      staff: "bg-gray-50 text-gray-500 border-gray-200",
    };
    return map[role] || "bg-gray-50 text-gray-400 border-gray-200";
  };

return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />
      <main className="flex-1 min-w-0 p-6 flex flex-col h-screen overflow-hidden">

        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Audit Trails</h1>
          <p className="text-xs text-gray-500 mt-0.5">Full activity log of all system actions</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          <KpiBox title="Total Logs" value={totalLogs} color="text-blue-600" />
          <KpiBox title="Created" value={createCount} color="text-green-700" />
          <KpiBox title="Updated" value={updateCount} color="text-blue-600" />
          <KpiBox title="Deleted" value={deleteCount} color="text-red-500" />
          <KpiBox title="Failed Logins" value={failedLogins} color="text-red-500" />
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Search user, target..."
              className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
            >
              {modules.map((m) => (
                <option key={m} value={m}>{m === "All" ? "All Modules" : m}</option>
              ))}
            </select>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              {actions.map((a) => (
                <option key={a} value={a}>{a === "All" ? "All Actions" : a}</option>
              ))}
            </select>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r === "All" ? "All Roles" : r}</option>
              ))}
            </select>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              maxDate={new Date()}
              dateFormat="yyyy-MM-dd"
              className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-32"
              placeholderText="Start date"
              isClearable
            />
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              minDate={startDate}
              maxDate={new Date()}
              dateFormat="yyyy-MM-dd"
              className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-32"
              placeholderText="End date"
              isClearable
            />
            {(search || filterModule !== "All" || filterAction !== "All" || filterRole !== "All" || startDate || endDate) && (
              <button
                type="button"
                className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                onClick={handleClearFilters}
              >
                Clear
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5 whitespace-nowrap">
              {filtered.length} records
            </span>
          </div>
        </div>

{/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl flex flex-col min-h-0 flex-1">
          <div className="overflow-auto min-h-0 flex-1">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-3 text-xs text-gray-400">Loading audit logs...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs font-medium text-gray-500">No audit logs found</p>
                <p className="text-xs text-gray-400 mt-0.5">Try adjusting your filters.</p>
              </div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["ID", "User", "Role", "Action", "Module", "Target", "Description", "IP", "Payload", "Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">#{log.id}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-800">{log.user_name || "—"}</p>
                        <p className="text-xs text-gray-400">ID: {log.user_id ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {log.user_role ? (
                          <span className={`text-[11px] border rounded-full px-2.5 py-0.5 font-medium ${roleBadge(log.user_role)}`}>
                            {log.user_role}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] border rounded-full px-2.5 py-0.5 font-medium ${actionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{log.module || "—"}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-800">{log.target || "—"}</p>
                        {log.target_id && <p className="text-xs text-gray-400">ID: {log.target_id}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={log.description}>
                        {log.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{log.ip_address || "—"}</td>
                      <td className="px-4 py-3">
                        {log.payload ? (
                          <button
                            className="bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                            onClick={() => setExpandedPayload(expandedPayload === log.id ? null : log.id)}
                          >
                            {expandedPayload === log.id ? "Hide" : "View"}
                          </button>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {paginated.map((log) =>
                    expandedPayload === log.id && log.payload ? (
                      <tr key={`payload-${log.id}`} className="bg-gray-50">
                        <td colSpan={10} className="px-4 py-3">
                          <pre className="text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ) : null
                  )}
                </tbody>
              </table>
            )}
</div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 flex-shrink-0 bg-white">
              <p className="text-xs text-gray-400">
                {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  «
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  Prev
                </button>
                <span className="text-xs text-gray-500 px-2">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  »
                </button>
              </div>
            </div>
          )}
</div>
      </main>
    </div>
  );
};

export default AuditTrails;