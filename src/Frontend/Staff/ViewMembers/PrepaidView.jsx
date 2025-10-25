import React, { useEffect, useState, useRef } from "react";
import api from "../../../api";
import { useToast } from "../../../components/ToastManager";
import MemberCard from "../../../components/MemberCards/PrepaidMemberID/MemberCard";

const PrepaidView = () => {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const { showToast } = useToast();

  const sidebarRef = useRef(null);

  useEffect(() => {
    const fetchStaffAndMembers = async () => {
      try {
        setLoading(true);

        console.log("🔍 Fetching staff info...");
        const { data: authData } = await api.get("/api/me");
        console.log("📥 Auth response:", authData);
        
        if (!authData.authenticated || !authData.user) {
          throw new Error("Not authenticated");
        }

        const extractedAdminId = authData.user.adminId || 
                                 authData.user.admin_id || 
                                 authData.user.userId;
        
        console.log("🔍 Extracted adminId:", extractedAdminId);
        
        if (!extractedAdminId) {
          throw new Error("Admin ID missing from user data");
        }

        setAdminId(extractedAdminId);

        console.log(`🔍 Fetching members for admin ID: ${extractedAdminId}`);
        const membersRes = await api.get(`/api/get-members?admin_id=${extractedAdminId}`);
        
        // ✅ FILTER FOR PREPAID MEMBERS ONLY
        const allMembers = membersRes.data.members || [];
        const prepaidMembers = allMembers.filter(m => m.system_type === "prepaid_entry");
        
        setMembers(prepaidMembers);
        console.log("✅ Prepaid members fetched:", prepaidMembers.length);
        
      } catch (err) {
        console.error("❌ Failed to fetch data:", err);
        
        if (err.response?.status === 401) {
          window.location.href = "/login";
          return;
        }
        
        showToast({ 
          message: err.message || "Failed to load data. Please try again.", 
          type: "error" 
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStaffAndMembers();
  }, [showToast]);

  const filteredMembers = members.filter((m) =>
    m.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-white p-2 flex flex-col space-y-3">
      <h1 className="text-lg sm:text-xl font-semibold">Prepaid Members</h1>
      <p className="text-xs text-gray-500 mb-2">
        Overview of member activity and balances
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded shadow text-center">
          <h2 className="text-xs text-gray-500">Total Members</h2>
          <p className="text-lg font-semibold text-indigo-600">{members.length}</p>
        </div>
        <div className="bg-white p-3 rounded shadow text-center">
          <h2 className="text-xs text-gray-500">Active Members</h2>
          <p className="text-lg font-semibold text-green-600">
            {members.filter((m) => m.status === "active").length}
          </p>
        </div>
        <div className="bg-white p-3 rounded shadow text-center">
          <h2 className="text-xs text-gray-500">Inactive Members</h2>
          <p className="text-lg font-semibold text-red-600">
            {members.filter((m) => m.status === "inactive").length}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">
            🔍 Search by Member
          </label>
          <input
            type="text"
            placeholder="e.g. Maria Santiago"
            className="p-2 border border-gray-300 rounded w-1/4 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-600 text-xs">Loading members...</p>
      ) : filteredMembers.length === 0 ? (
        <p className="text-gray-500 italic text-xs">No members found.</p>
      ) : (
        <div className="overflow-x-auto rounded shadow">
          <table className="min-w-full text-left text-[10px] sm:text-xs">
            <thead className="bg-gray-700 text-white uppercase font-medium text-[9px] sm:text-xs">
              <tr>
                <th className="px-2 py-1">Profile</th>
                <th className="px-2 py-1">Name</th>
                <th className="px-2 py-1">Phone</th>
                <th className="px-2 py-1">Balance</th>
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
                  <td className="px-2 py-1">
                    <img
                      src={`https://swiftpasstech.com/${member.profile_image_url || "uploads/members/default.jpg"}`}
                      alt={member.full_name}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border"
                    />
                  </td>
                  <td className="px-2 py-1 font-medium">{member.full_name}</td>
                  <td className="px-2 py-1">{member.phone_number}</td>
                  <td className="px-2 py-1">
                    <span className="inline-block px-2 py-0.5 text-[9px] sm:text-xs font-semibold rounded-full bg-green-100 text-green-700 shadow-sm">
                      ₱{parseFloat(member.current_balance || 0).toFixed(2)}
                    </span>
                  </td>
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
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
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

export default PrepaidView;