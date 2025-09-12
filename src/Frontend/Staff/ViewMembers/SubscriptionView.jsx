import React, { useEffect, useState, useRef } from "react";
import api from "../../../api"; 
import { IP } from "../../../IpConfig";

const SubscriptionView = () => {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [adminId, setAdminId] = useState(null);

  const sidebarRef = useRef(null);

  useEffect(() => {
    const fetchStaffAndMembers = async () => {
      try {
        setLoading(true);

        console.log("🔍 Fetching staff info...");
        const { data: authData } = await api.get("/api/auth-status");
        console.log("📥 Auth response:", authData);
        
        if (!authData.isAuthenticated || !authData.user) {
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
        
        setMembers(membersRes.data.members || []);
        console.log("✅ Members fetched:", membersRes.data.members?.length || 0);
        
      } catch (err) {
        console.error("❌ Failed to fetch data:", err);
        
        if (err.response?.status === 401) {
          window.location.href = "/login";
          return;
        }
        
        setNotification({ 
          message: err.message || "Failed to load data. Please try again.", 
          type: "error" 
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStaffAndMembers();
  }, []);

  const filteredMembers = members.filter((m) =>
    m.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">


      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Subscription Members</h1>

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

        {/* Dashboard Card + Search */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="bg-white shadow rounded-lg p-6 w-full md:w-1/3 text-center">
            <h2 className="text-lg font-semibold text-gray-700">Total Members</h2>
            <p className="text-3xl font-bold text-indigo-600">{members.length}</p>
          </div>

          <input
            type="text"
            placeholder="Search members..."
            className="p-3 border border-gray-300 rounded w-full md:w-1/3"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Subscription</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member, index) => (
                  <tr key={member.rfid_tag || index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="px-4 py-3 font-semibold text-gray-600">{index + 1}</td>
                    <td className="px-4 py-3">
                      <img
                        src={`http://localhost:5000/${member.profile_image_url}`}
                        alt={member.full_name}
                        className="w-10 h-10 rounded-full object-cover border"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{member.full_name}</td>
                    <td className="px-4 py-3">{member.phone_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(member.subscription_start).toLocaleDateString()} →{" "}
                      {new Date(member.subscription_expiry).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          member.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
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

        {/* Floating Detail Card */}
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl mx-4 relative animate-fade-in">
              <button
                onClick={() => setSelectedMember(null)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl font-bold"
                aria-label="Close"
              >
                &times;
              </button>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <img
                    src={`http://localhost:5000/${selectedMember.profile_image_url}`}
                    alt={selectedMember.full_name}
                    className="w-40 h-40 rounded-full object-cover border-4 border-indigo-500 shadow-md"
                  />
                </div>

                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-indigo-700 mb-2">{selectedMember.full_name}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                    <p><span className="font-semibold">Age:</span> {selectedMember.age}</p>
                    <p><span className="font-semibold">Phone:</span> {selectedMember.phone_number}</p>
                    <p><span className="font-semibold">Email:</span> {selectedMember.email}</p>
                    <p><span className="font-semibold">Address:</span> {selectedMember.address}</p>
                    <p><span className="font-semibold">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                        selectedMember.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {selectedMember.status}
                      </span>
                    </p>
                    <p><span className="font-semibold">Subscription:</span> {new Date(selectedMember.subscription_start).toLocaleDateString()} → {new Date(selectedMember.subscription_expiry).toLocaleDateString()}</p>
                    <p><span className="font-semibold">Joined:</span> {new Date(selectedMember.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionView;
