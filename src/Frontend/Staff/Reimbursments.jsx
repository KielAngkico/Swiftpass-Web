import React, { useState, useEffect } from "react";
import StaffSidebar from "../../components/StaffSidebar";
import api from "../../api";
import { useAuth } from "../../App";
import { useToast } from "../../components/ToastManager";

const ROWS_PER_PAGE = 10;

const Reimbursements = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const adminId = user?.adminId;

  useEffect(() => {
    if (!adminId) return;
    const fetchRefunds = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/api/refunds/admin/${adminId}`);
        setRefunds(data.refunds || []);
      } catch (err) {
        console.error("Failed to load refunds:", err);
        showToast({ message: "Failed to load reimbursements.", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchRefunds();
  }, [adminId]);

  const filtered = refunds.filter((r) => {
    const matchesSearch =
      r.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.rfid_tag?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StaffSidebar />
      <main className="flex-1 min-w-0 p-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Reimbursements</h1>
          <p className="text-xs text-gray-500 mt-0.5">View member refund requests</p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 mb-5">
          <label className="text-xs text-gray-500">Filter:</label>
          <input
            type="text"
            placeholder="Search member or RFID"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Member</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">RFID</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Transaction Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Reason</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Requested</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center">
                    <p className="text-xs text-gray-400">Loading reimbursements...</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center">
                    <p className="text-xs text-gray-400">No refund requests found</p>
                  </td>
                </tr>
              ) : (
                paginated.map((r, index) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {(page - 1) * ROWS_PER_PAGE + index + 1}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-800">{r.member_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{r.rfid_tag || "—"}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-800">
                      ₱{parseFloat(r.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {r.transaction_date
                        ? new Date(r.transaction_date).toLocaleString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">
                      {r.reason || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(r.requested_at).toLocaleString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center">
              <p className="text-xs text-gray-400">
                Showing {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="text-xs text-gray-400 px-1">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    pending:  "bg-amber-50 text-amber-700 border-amber-100",
    approved: "bg-green-50 text-green-700 border-green-100",
    denied:   "bg-red-50 text-red-600 border-red-100",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] border font-medium ${map[status] || "bg-gray-50 text-gray-500 border-gray-100"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default Reimbursements;