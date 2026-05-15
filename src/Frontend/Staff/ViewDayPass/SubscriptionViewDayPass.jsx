import React, { useEffect, useState } from "react";
import api from "../../../api";
import { useToast } from "../../../components/ToastManager";
import DayPassMemberCard from "../../../components/MemberCards/DayPassMemberCard/DayPassMemberCard";

const SubscriptionViewDayPass = () => {
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [page, setPage] = useState(1);
const ROWS_PER_PAGE = 10;
  const { showToast } = useToast();

  useEffect(() => {
    const fetchGuests = async () => {
      try {
        setLoading(true);
        const { data: authData } = await api.get("/api/me");
        if (!authData.authenticated || !authData.user) throw new Error("Not authenticated");
        const adminId = authData.user.adminId || authData.user.admin_id || authData.user.userId;
        if (!adminId) throw new Error("Admin ID missing");
        const res = await api.get(`/api/daypass-guests?admin_id=${adminId}&system_type=subscription`);
        setGuests(res.data.guests || []);
      } catch (err) {
        if (err.response?.status === 401) { window.location.href = "/login"; return; }
        showToast({ message: err.message || "Failed to load guests.", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchGuests();
  }, [showToast]);

  const filtered = guests.filter((g) =>
    g.guest_name?.toLowerCase().includes(search.toLowerCase())
  );
const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  const activeCount = guests.filter((g) => g.status === "active").length;
  const expiredCount = guests.filter((g) => g.status === "expired").length;
  const returnedCount = guests.filter((g) => g.status === "returned").length;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Day Pass Guests</h1>
        <p className="text-xs text-gray-500 mt-0.5">Subscription — overview of day pass guest activity</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total Guests</p>
          <p className="text-base font-semibold text-blue-600">{guests.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Active</p>
          <p className="text-base font-semibold text-green-700">{activeCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Expired / Returned</p>
          <p className="text-base font-semibold text-red-500">{expiredCount + returnedCount}</p>
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">Search by Guest</label>
        <input
          type="text"
          placeholder="Enter Guest Name"
          className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-64"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Profile</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Gender</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Mobile</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Joined At</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Expires At</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-xs text-gray-400">Loading guests...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-xs text-gray-400">No day pass guests found.</td></tr>
            ) : (
              paginated.map((guest, index) => (
                <tr key={guest.id || index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <img
                      src={guest.profile_image_url || "https://swiftpasstech.com/uploads/members/default.jpg"}
                      alt={guest.guest_name}
                      className="w-7 h-7 rounded-full object-cover border border-gray-200"
                      onError={(e) => { e.currentTarget.src = "https://swiftpasstech.com/uploads/members/default.jpg"; }}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-800">{guest.guest_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 capitalize">{guest.gender || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{guest.mobile_number || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {guest.created_at ? new Date(guest.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {guest.expires_at ? new Date(guest.expires_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] border rounded-full px-2.5 py-0.5 ${
                      guest.status === "active" ? "bg-green-50 text-green-700 border-green-100"
                      : guest.status === "returned" ? "bg-gray-50 text-gray-500 border-gray-200"
                      : "bg-red-50 text-red-600 border-red-100"
                    }`}>
                      {guest.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedGuest(guest)}
                      className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                    >
                      View
                    </button>
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
      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors">Prev</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1).reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, []).map((p, idx) => p === "..." ? (<span key={`ellipsis-${idx}`} className="text-xs text-gray-400 px-1">...</span>) : (<button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors border ${page === p ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{p}</button>))}
      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors">Next</button>
    </div>
  </div>
)}
      </div>

      {selectedGuest && (
        <DayPassMemberCard guest={selectedGuest} onClose={() => setSelectedGuest(null)} />
      )}
    </div>
  );
};

export default SubscriptionViewDayPass;