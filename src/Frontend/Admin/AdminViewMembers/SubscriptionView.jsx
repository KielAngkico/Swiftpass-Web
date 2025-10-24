import React, { useEffect, useState, useRef } from "react";
import MemberCard from "../../../components/MemberCards/SubscriptionMemberID/MemberCard";
import { generateSubscriptionMembersPDF } from "../../../utils/membersReport.js";
import api from "../../../api";
import { useToast } from "../../../components/ToastManager";


const KpiCard = ({ title, value, color }) => (
  <div className="bg-white shadow p-2 sm:p-4 rounded text-center text-xs sm:text-sm">
    <h3 className="text-gray-600 truncate">{title}</h3>
    <p className={`text-lg sm:text-xl font-bold ${color}`}>{value}</p>
  </div>
);

const SubscriptionView = () => {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [user, setUser] = useState(null);
  const sidebarRef = useRef(null);
    const { showToast } = useToast(); // ;
  

  useEffect(() => {
    const fetchUserAndMembers = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user)
          throw new Error("Not authenticated");

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
  const activeMembers = members.filter(
    (m) => (m.status || "").toLowerCase() === "active"
  ).length;
  const inactiveMembers = members.filter(
    (m) => (m.status || "").toLowerCase() === "inactive"
  ).length;

  const handleDownloadPDF = async () => {
    if (filteredMembers.length === 0) {
showToast({ message: "No members to download", type: "error" });

      return;
    }

    try {
showToast({ message: "Generating PDF...", type: "info" });

      const { data: meData } = await api.get("/api/me");
      if (!meData.authenticated || !meData.user)
        throw new Error("Not authenticated");

      const adminId = meData.user.adminId || meData.user.id;
      if (!adminId) throw new Error("Missing admin ID");

      const { data: gymInfo } = await api.get(`/api/gym-info/${adminId}`);

      console.log("🔍 Gym Info from API:", gymInfo);

      const filterData = {
        status: filterStatus,
        search: search,
        gym_name: gymInfo.gym_name,
        owner_name: gymInfo.admin_name,
        reportType: "Subscription Members Report",
      };

      console.log("📤 Sending filterData to PDF:", filterData);

      const filename = generateSubscriptionMembersPDF(filteredMembers, filterData);
showToast({ message: `PDF generated successfully: ${filename}`, type: "success" });

    } catch (error) {
      console.error("Error generating PDF:", error);
showToast({ message: "Failed to generate PDF", type: "error" });

    }
  };

  return (
    <div className="min-h-screen w-full bg-white p-2 flex flex-col space-y-3">


      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold mb-1">
            Subscription Members
          </h1>
          <p className="text-xs text-gray-500">
            Overview of subscription member activity
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={filteredMembers.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
          title="Download PDF Report"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          <span className="hidden sm:inline">Download PDF</span>
          <span className="sm:hidden">PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <KpiCard
          title="Total Members"
          value={totalMembers}
          color="text-indigo-600"
        />
        <KpiCard
          title="Active Members"
          value={activeMembers}
          color="text-green-600"
        />
        <KpiCard
          title="Inactive Members"
          value={inactiveMembers}
          color="text-red-600"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">
            🔍 Search by Member
          </label>
          <input
            type="text"
            placeholder="e.g. Maria Santiago"
            className="p-2 border border-gray-300 rounded w-full text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 sm:w-1/3">
          <label className="text-xs text-gray-500 mb-1 block">
            🧍‍♂️ Filter by Status
          </label>
          <select
            className="p-2 border border-gray-300 rounded w-full text-xs"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Members</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-600 text-xs">Loading members...</p>
      ) : filteredMembers.length === 0 ? (
        <p className="text-gray-500 italic text-xs">No members found.</p>
      ) : (
        <div className="overflow-x-auto rounded shadow">
          <table className="min-w-full text-left text-[10px] sm:text-xs">
            <thead className="bg-gray-700 text-white uppercase text-[9px] sm:text-xs">
              <tr>
                <th className="px-2 py-1">#</th>
                <th className="px-2 py-1">Profile</th>
                <th className="px-2 py-1">Name</th>
                <th className="px-2 py-1">Phone</th>
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member, index) => (
                <tr
                  key={member.rfid_tag || index}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-2 py-1">{index + 1}</td>
                  <td className="px-2 py-1">
                    <img
                      src={`https://swiftpasstech.com/${
                        member.profile_image_url || "default-profile.png"
                      }`}
                      alt={member.full_name}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border"
                    />
                  </td>
                  <td className="px-2 py-1 font-medium">{member.full_name}</td>
                  <td className="px-2 py-1">{member.phone_number}</td>
                  <td className="px-2 py-1">
                    <span
                      className={`inline-block px-2 py-0.5 text-[9px] sm:text-xs font-semibold rounded-full shadow-sm ${
                        member.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-2 py-1">
                    <button
                      onClick={() => setSelectedMember(member)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedMember && (
        <MemberCard
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
};

export default SubscriptionView;
