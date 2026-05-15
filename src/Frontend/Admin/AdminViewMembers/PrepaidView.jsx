import React, { useEffect, useState, useRef } from "react";
import PrepaidMemberCard from "../../../components/MemberCards/PrepaidMemberID";
import { generatePrepaidMembersPDF } from "../../../utils/membersReport.js";
import api from "../../../api";
import { useToast } from "../../../components/ToastManager";

const KpiBox = ({ title, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1">
    <p className="text-xs text-gray-500">{title}</p>
    <p className={`text-base font-semibold ${color}`}>{value}</p>
  </div>
);

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white";

const PrepaidView = () => {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(1);
const ROWS_PER_PAGE = 10;
  const sidebarRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchUserAndMembers = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user) throw new Error("Not authenticated");
        setUser(data.user);
        const adminId = data.user.adminId || data.user.id;
        if (!adminId) return;
        const res = await api.get(`/api/get-members?admin_id=${adminId}`);
        setMembers(res.data.members || []);
      } catch (err) {
        console.error("Error fetching members:", err);
        showToast({ message: "Failed to fetch members", type: "error" });
        if (err.response?.status === 401) window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndMembers();
  }, []);

  const filteredMembers = members
    .filter((m) => m.full_name?.toLowerCase().includes(search.toLowerCase()))
    .filter((m) => {
      if (filterStatus === "All") return true;
      return (m.status || "").toLowerCase() === filterStatus.toLowerCase();
    });

  const totalMembers = members.length;
  const activeMembers = members.filter((m) => (m.status || "").toLowerCase() === "active").length;
  const inactiveMembers = members.filter((m) => (m.status || "").toLowerCase() === "inactive").length;
const totalPages = Math.max(1, Math.ceil(filteredMembers.length / ROWS_PER_PAGE));
const paginated = filteredMembers.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  const handleDownloadPDF = async () => {
    if (filteredMembers.length === 0) {
      showToast({ message: "No members to download", type: "error" });
      return;
    }
    try {
      showToast({ message: "Generating PDF...", type: "info" });
      const { data: meData } = await api.get("/api/me");
      if (!meData.authenticated || !meData.user) throw new Error("Not authenticated");
      const adminId = meData.user.adminId || meData.user.id;
      if (!adminId) throw new Error("Missing admin ID");
      const { data: gymInfo } = await api.get(`/api/gym-info/${adminId}`);
      const filterData = {
        status: filterStatus,
        search: search,
        gym_name: gymInfo.gym_name,
        owner_name: gymInfo.admin_name,
        reportType: "Prepaid Members Report",
      };
      const filename = generatePrepaidMembersPDF(filteredMembers, filterData);
      showToast({ message: `PDF generated successfully: ${filename}`, type: "success" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast({ message: "Failed to generate PDF", type: "error" });
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Prepaid Members</h1>
        <p className="text-xs text-gray-500 mt-0.5">Overview of prepaid member activity and balances</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <KpiBox title="Total Members" value={totalMembers} color="text-gray-900" />
        <KpiBox title="Active Members" value={activeMembers} color="text-green-700" />
        <KpiBox title="Inactive Members" value={inactiveMembers} color="text-red-500" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex  gap-2 items-center">
            <input
              type="text"
              placeholder="Search member"
              className={`${inputClass} w-48`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <select
              className={`${inputClass} w-36`}
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <option value="All">All Members</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={filteredMembers.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Download PDF
          </button>
        </div>

        <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900">Member List</p>
          <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
            {filteredMembers.length} {filteredMembers.length === 1 ? "member" : "members"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Profile</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Phone</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Balance</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-xs text-gray-400">Loading members...</td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-xs text-gray-400">No members found.</td>
                </tr>
              ) : (
                paginated.map((member, index) => (
                  <tr key={member.rfid_tag || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <img
                        src={member.member_image}
                        alt={member.full_name}
                        className="w-7 h-7 rounded-full object-cover border border-gray-200"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-800">{member.full_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{member.phone_number}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-100">
                        ₱{parseFloat(member.current_balance || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${member.status === "active" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedMember(member)}
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
          {filteredMembers.length > 0 && (
  <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center">
    <p className="text-xs text-gray-400">
      Showing {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filteredMembers.length)} of {filteredMembers.length}
    </p>
    <div className="flex items-center gap-1">
      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors">Prev</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1).reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, []).map((p, idx) => p === "..." ? (<span key={`ellipsis-${idx}`} className="text-xs text-gray-400 px-1">...</span>) : (<button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors border ${page === p ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{p}</button>))}
      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors">Next</button>
    </div>
  </div>
)}
        </div>
      </div>

      {selectedMember && (
        <PrepaidMemberCard member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  );
};

export default PrepaidView;