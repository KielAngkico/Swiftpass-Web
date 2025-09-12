import React, { useEffect, useState, useRef } from "react";
import PrepaidMemberCard from "../../../components/MemberCards/PrepaidMemberID";
import api from "../../../api";

const KpiCard = ({ title, value, color }) => (
  <div className="bg-white shadow p-4 rounded text-center">
    <h3 className="text-sm text-gray-600">{title}</h3>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
);

const PrepaidView = () => {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [user, setUser] = useState(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const fetchUserAndMembers = async () => {
      try {
        setLoading(true);
        setNotification(null);

        const { data } = await api.get("/api/auth-status", { withCredentials: true });
        if (!data.isAuthenticated || !data.user) throw new Error("Not authenticated");

        setUser(data.user);
        const adminId = data.user.admin_id || data.user.id;
        if (!adminId) return;


        const res = await api.get(`/api/get-members?admin_id=${adminId}`);
        setMembers(res.data.members || []);
      } catch (err) {
        console.error("❌ Error fetching user or members:", err);
        setNotification({ message: "Failed to fetch members", type: "error" });
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

  return (
  <div className="flex h-screen overflow-hidden bg-gray-100">
    {/* Main Content */}
    <div className="flex-1 p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Prepaid Members</h1>

      {/* Notification */}
      {notification && (
        <div
          className={`mb-4 p-3 rounded text-white font-semibold ${
            notification.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {notification.message}
        </div>
      )}

      

 {/* 🔧 Dashboard Cards + Filters */}
<div className="flex flex-col gap-6 mb-6">

  {/* 🔢 Summary Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <KpiCard title="Total Members" value={totalMembers} color="text-indigo-600" />
    <KpiCard title="Active Members" value={activeMembers} color="text-green-600" />
    <KpiCard title="Inactive Members" value={inactiveMembers} color="text-red-600" />
  </div>

  {/* 🔍 Search + Status Filter */}
  <div className="flex flex-col sm:flex-row justify-between gap-4">
    <div className="flex flex-col w-full sm:w-2/3">
      <label className="text-sm text-gray-500 mb-1">🔍 Search by Member</label>
      <input
        type="text"
        placeholder="e.g. Maria Santiago"
        className="p-3 border border-gray-300 rounded"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>

    <div className="flex flex-col w-full sm:w-1/3">
      <label className="text-sm text-gray-500 mb-1">🧍‍♂️ Filter by Status</label>
      <select
        className="p-3 border border-gray-300 rounded"
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
      >
        <option value="All">All Members</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  </div>

</div>


      {/* Table */}
      {loading ? (
        <p className="text-gray-600">Loading members...</p>
      ) : filteredMembers.length === 0 ? (
        <p className="text-gray-500 italic">No members found.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-800 text-white uppercase text-xs">
            <tr>
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Profile</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Balance</th>
                <th className="px-6 py-3">Status</th> {/* ✅ New column */}
                <th className="px-6 py-3">Actions</th>
            </tr>
            </thead>
            <tbody>
            {filteredMembers.map((member, index) => (
                <tr key={member.rfid_tag || index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <td className="px-6 py-4">{index + 1}</td>
                <td className="px-6 py-4">
                    <img
                    src={`http://localhost:5000/${member.profile_image_url}`}
                    alt={member.full_name}
                    className="w-10 h-10 rounded-full object-cover border"
                    />
                </td>
                <td className="px-6 py-4 font-medium text-gray-800">{member.full_name}</td>
                <td className="px-6 py-4">{member.phone_number}</td>
                <td className="px-6 py-4">
                    <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 shadow-sm">
                    ₱{parseFloat(member.current_balance || 0).toFixed(2)}
                    </span>
                </td>
                <td className="px-6 py-4">
                    <span
                    className={`inline-block px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${
                        member.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                    >
                    {member.status}
                    </span>
                </td>
                <td className="px-6 py-4">
                    <button
                    onClick={() => setSelectedMember(member)}
                    className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
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
  <PrepaidMemberCard
    member={selectedMember}
    onClose={() => setSelectedMember(null)}
  />
)}


    </div>
  </div>
);

};

export default PrepaidView;
