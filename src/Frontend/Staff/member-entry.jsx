import React, { useEffect, useState, useCallback, useRef } from "react";
import StaffSidebar from "../../components/StaffSidebar";
import { useWebSocket } from "../../contexts/WebSocketContext";
import api from "../../api";
import { IP } from "../../IpConfig";
import { useAuth } from "../../App";

const MemberEntryBranch = () => {
  const { user } = useAuth();
  const { globalEntryLogs } = useWebSocket();
  const [entryLogs, setEntryLogs] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [recentExits, setRecentExits] = useState([]);
  const [loading, setLoading] = useState(true);
  const processedTimestamps = useRef(new Set());


  const fetchLogs = useCallback(async () => {
    if (!user?.adminId) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/staff-entry-logs/${user.adminId}`);
      console.log("📊 Fetched logs from API:", res.data);
      setEntryLogs(res.data.recentEntryList || []);
    } catch (err) {
      console.error("❌ Error fetching logs:", err);
      if (err.response?.status === 401) {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  }, [user?.adminId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

useEffect(() => {
  if (!globalEntryLogs?.length) return;

  globalEntryLogs.forEach(incoming => {
    const data = incoming?.data ? incoming.data : incoming;
    if (!data?.rfid_tag) return;

    console.log("🔄 Processing real-time update:", data);

    const isEntry = data.entry_time && !data.exit_time;
    const isExit = data.exit_time;
    if (isEntry) {
      const entryItem = {
        id: `entry-${data.rfid_tag}-${Date.now()}`,
        rfid_tag: data.rfid_tag,
        full_name: data.full_name || "Unknown",
        profile_image_url: data.profile_image_url,
        timestamp: data.timestamp || new Date().toISOString(),
        visitor_type: data.visitor_type,
        system_type: data.system_type,
        deducted_amount: data.deducted_amount,
      };

      setRecentEntries([entryItem]); 
      setRecentExits(prev => prev.filter(exit => exit.rfid_tag !== data.rfid_tag));

    } else if (isExit) {
      const exitItem = {
        id: `exit-${data.rfid_tag}-${Date.now()}`,
        rfid_tag: data.rfid_tag,
        full_name: data.full_name || "Unknown",
        profile_image_url: data.profile_image_url,
        timestamp: data.timestamp || new Date().toISOString(),
        visitor_type: data.visitor_type,
        system_type: data.system_type,
      };

      setRecentExits([exitItem]); 
      setRecentEntries(prev => prev.filter(entry => entry.rfid_tag !== data.rfid_tag));
    }
    setEntryLogs(prev => {
      const updated = [...prev];

      if (data.id) {
        const existingIndex = updated.findIndex(log => log.id === data.id);
        if (existingIndex !== -1) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            ...data,
            entry_time: data.entry_time || updated[existingIndex].entry_time,
            exit_time: data.exit_time || updated[existingIndex].exit_time,
            status: data.status || updated[existingIndex].status,
            member_status: data.status || updated[existingIndex].member_status,
            deducted_amount: data.deducted_amount ?? updated[existingIndex].deducted_amount,
            remaining_balance: data.remaining_balance ?? updated[existingIndex].remaining_balance,
            last_activity: data.timestamp || new Date().toISOString(),
          };
        } else {
          updated.unshift({
            id: data.id,
            rfid_tag: data.rfid_tag,
            full_name: data.full_name,
            profile_image_url: data.profile_image_url,
            entry_time: data.entry_time || null,
            exit_time: data.exit_time || null,
            status: data.status || "outside",
            member_status: data.status || "outside",
            visitor_type: data.visitor_type,
            system_type: data.system_type,
            deducted_amount: data.deducted_amount,
            remaining_balance: data.remaining_balance,
            subscription_expiry: data.subscription_expiry,
            staff_name: data.staff_name,
            last_activity: data.timestamp || new Date().toISOString(),
          });
        }
      } else {
        if (isEntry) {
          const activeIndex = updated.findIndex(log => log.rfid_tag === data.rfid_tag && (log.member_status === "inside" || log.status === "inside"));
          if (activeIndex === -1) {
            updated.unshift({
              id: `temp-${data.rfid_tag}-${Date.now()}`,
              rfid_tag: data.rfid_tag,
              full_name: data.full_name,
              profile_image_url: data.profile_image_url,
              entry_time: data.entry_time,
              exit_time: null,
              status: "inside",
              member_status: "inside",
              visitor_type: data.visitor_type,
              system_type: data.system_type,
              deducted_amount: data.deducted_amount,
              remaining_balance: data.remaining_balance,
              subscription_expiry: data.subscription_expiry,
              staff_name: data.staff_name,
              last_activity: data.timestamp || new Date().toISOString(),
            });
          }
        } else if (isExit) {
          const activeIndex = updated.findIndex(log => log.rfid_tag === data.rfid_tag && (log.member_status === "inside" || log.status === "inside"));
          if (activeIndex !== -1) {
            updated[activeIndex] = {
              ...updated[activeIndex],
              exit_time: data.exit_time,
              status: "outside",
              member_status: "outside",
              last_activity: data.timestamp || new Date().toISOString(),
            };
          }
        }
      }

      return updated.sort((a, b) => {
        const timeA = new Date(a.last_activity || a.entry_time || a.exit_time || 0);
        const timeB = new Date(b.last_activity || b.entry_time || b.exit_time || 0);
        return timeB - timeA;
      });
    });
  });
}, [globalEntryLogs]);
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const thirtySecondsAgo = now - 30000;
      const oneHourAgo = now - 3600000;
      
      setRecentEntries(prev => 
        prev.filter(item => new Date(item.timestamp).getTime() > thirtySecondsAgo)
      );
      
      setRecentExits(prev => 
        prev.filter(item => new Date(item.timestamp).getTime() > thirtySecondsAgo)
      );
      const currentTimestamps = Array.from(processedTimestamps.current);
      processedTimestamps.current.clear();
      
      currentTimestamps.forEach(timestamp => {
        const timestampMatch = timestamp.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        if (timestampMatch) {
          const time = new Date(timestampMatch[0]).getTime();
          if (time > oneHourAgo) {
            processedTimestamps.current.add(timestamp);
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const insideCount = entryLogs.filter((l) => l.member_status === "inside" || l.status === "inside").length;
  const outsideCount = entryLogs.filter((l) => l.member_status === "outside" || l.status === "outside").length;

  if (loading) {
    return (
      <div className="flex">
        <StaffSidebar />
        <div className="flex-1 p-6 text-center py-12">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading member status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <StaffSidebar />
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Member Entry/Exit Status</h2>
            {user && (
              <p className="text-sm text-gray-600">
                Logged in as: {user.name} ({user.role})
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "🔄" : "↻"} Refresh
            </button>
            <div className="text-green-600 font-semibold">
              🟢 Inside: {insideCount}
            </div>
            <div className="text-red-600 font-semibold">
              🔴 Outside: {outsideCount}
            </div>
            <div className="text-gray-600">Total: {entryLogs.length}</div>
          </div>
        </div>
          <div className="flex gap-4 mb-6">
            {/* Latest Entry */}
            <div className="flex-1 bg-green-100 p-4 rounded-lg shadow flex items-center gap-6">
              <img
                src={`${IP}/${recentEntries[0]?.profile_image_url || "uploads/members/default.jpg"}`}
                alt={recentEntries[0]?.full_name || "N/A"}
                className="w-28 h-28 rounded-lg object-cover border-2 border-green-200"
                onError={(e) => {
                  e.currentTarget.src = `${IP}/uploads/members/default.jpg`;
                }}
              />
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-lg">
                  {recentEntries[0]?.full_name || "N/A"}
                </p>
                <p className="text-sm text-gray-500">
                  Time: {recentEntries[0]?.timestamp ? new Date(recentEntries[0].timestamp).toLocaleTimeString() : "N/A"}
                </p>
                <span className="text-sm bg-green-200 text-green-800 px-3 py-1 rounded mt-1 inline-block">
                  {recentEntries[0]?.visitor_type || "N/A"}
                </span>
              </div>
            </div>

            {/* Latest Exit */}
            <div className="flex-1 bg-red-100 p-4 rounded-lg shadow flex items-center gap-6">
              <img
                src={`${IP}/${recentExits[0]?.profile_image_url || "uploads/members/default.jpg"}`}
                alt={recentExits[0]?.full_name || "N/A"}
                className="w-28 h-28 rounded-lg object-cover border-2 border-red-200"
                onError={(e) => {
                  e.currentTarget.src = `${IP}/uploads/members/default.jpg`;
                }}
              />
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-lg">
                  {recentExits[0]?.full_name || "N/A"}
                </p>
                <p className="text-sm text-gray-500">
                  Time: {recentExits[0]?.timestamp ? new Date(recentExits[0].timestamp).toLocaleTimeString() : "N/A"}
                </p>
                <span className="text-sm bg-red-200 text-red-800 px-3 py-1 rounded mt-1 inline-block">
                  {recentExits[0]?.visitor_type || "N/A"}
                </span>
              </div>
            </div>
          </div>

        {/* Main Table - Bottom Half */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="text-lg font-semibold text-gray-800">All Member Sessions</h3>
          </div>
          
          {entryLogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏋️</div>
              <p className="text-gray-600 text-lg">No member activity yet.</p>
              <p className="text-gray-500 text-sm mt-2">
                Member statuses will appear here as they scan in/out.
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-96">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {["Member", "RFID", "Entry", "Exit", "Status", "Type", "Balance"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {entryLogs.map((log, index) => {
                    const memberStatus = log.member_status || log.status || "outside";
                    const isRecent = new Date(log.last_activity || log.entry_time || log.exit_time) > new Date(Date.now() - 30000);
                    
                    return (
                      <tr
                        key={`${log.id || log.rfid_tag}-${index}`}
                        className={`hover:bg-gray-50 transition-colors ${
                          isRecent ? "bg-yellow-50 border-l-4 border-yellow-400" : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-sm flex items-center">
                          <img
                            src={`${IP}/${log.profile_image_url || "uploads/members/default.jpg"}`}
                            alt={log.full_name || log.rfid_tag}
                            className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-gray-200"
                            onError={(e) => {
                              e.currentTarget.src = `${IP}/uploads/members/default.jpg`;
                            }}
                          />
                          <span className="font-medium">{log.full_name || "Unknown"}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">
                          {log.rfid_tag}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.entry_time
                            ? new Date(log.entry_time).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.exit_time
                            ? new Date(log.exit_time).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              memberStatus === "inside"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {memberStatus === "inside"
                              ? "🟢 Inside"
                              : "🔴 Outside"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {log.visitor_type || "Member"}
                          </span>
                          {log.system_type && (
                            <div className="text-xs text-gray-500 mt-1">
                              {log.system_type.replace('_', ' ')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.system_type === "prepaid_entry" && (
                            <div className="text-xs">
                              {log.deducted_amount && (
                                <div className="text-red-600 font-medium">
                                  -₱{log.deducted_amount}
                                </div>
                              )}
                              {log.remaining_balance !== undefined && (
                                <div className="text-gray-600">
                                  ₱{log.remaining_balance}
                                </div>
                              )}
                            </div>
                          )}
                          {log.system_type === "subscription" && log.subscription_expiry && (
                            <div className="text-xs text-gray-600">
                              Expires: {new Date(log.subscription_expiry).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberEntryBranch;