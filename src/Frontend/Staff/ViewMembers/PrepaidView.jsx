import React, { useEffect, useState } from "react";
import api from "../../../api";
import { useToast } from "../../../components/ToastManager";
import MemberCard from "../../../components/MemberCards/PrepaidMemberID/MemberCard";

const PrepaidView = () => {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchStaffAndMembers = async () => {
      try {
        setLoading(true);
        const { data: authData } = await api.get("/api/me");

        if (!authData.authenticated || !authData.user) throw new Error("Not authenticated");

        const extractedAdminId =
          authData.user.adminId || authData.user.admin_id || authData.user.userId;

        if (!extractedAdminId) throw new Error("Admin ID missing from user data");

        const membersRes = await api.get(`/api/get-members?admin_id=${extractedAdminId}`);
        const allMembers = membersRes.data.members || [];
        setMembers(allMembers.filter((m) => m.system_type === "prepaid_entry"));
      } catch (err) {
        if (err.response?.status === 401) {
          window.location.href = "/login";
          return;
        }
        showToast({ message: err.message || "Failed to load data.", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchStaffAndMembers();
  }, [showToast]);

  const filteredMembers = members.filter((m) =>
    m.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = members.filter((m) => m.status === "active").length;
  const inactiveCount = members.filter((m) => m.status === "inactive").length;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Prepaid Members</h1>
        <p className="text-xs text-gray-500 mt-0.5">Overview of member activity and balances</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total Members</p>
          <p className="text-base font-semibold text-blue-600">{members.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Active Members</p>
          <p className="text-base font-semibold text-green-700">{activeCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Inactive Members</p>
          <p className="text-base font-semibold text-red-500">{inactiveCount}</p>
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">Search by Member</label>
        <input
          type="text"
          placeholder="e.g. Maria Santiago"
          className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
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
                <td colSpan={6} className="px-4 py-6 text-center text-xs text-gray-400">
                  Loading members...
                </td>
              </tr>
            ) : filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-xs text-gray-400">
                  No members found.
                </td>
              </tr>
            ) : (
              filteredMembers.map((member, index) => (
                <tr key={member.rfid_tag || index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <img
                      src={
                        member.profile_image_url ||
                        member.member_image ||
                        "https://swiftpasstech.com/uploads/members/default.jpg"
                      }
                      alt={member.full_name}
                      className="w-7 h-7 rounded-full object-cover border border-gray-200"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://swiftpasstech.com/uploads/members/default.jpg";
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-800">{member.full_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{member.phone_number}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] bg-green-50 text-green-700 border border-green-100 rounded-full px-2.5 py-0.5">
                      ₱{parseFloat(member.current_balance || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] border rounded-full px-2.5 py-0.5 ${
                        member.status === "active"
                          ? "bg-green-50 text-green-700 border-green-100"
                          : "bg-red-50 text-red-600 border-red-100"
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => setSelectedMember(member)}
                        className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-2.5 py-1 rounded-lg text-[13px] font-medium transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedMember && (
        <MemberCard member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  );
};

export default PrepaidView;