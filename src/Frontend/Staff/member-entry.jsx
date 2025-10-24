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

  // Helper function to get proper image URL - MOVED UP
  const getImageUrl = (profileImageUrl) => {
    if (!profileImageUrl) {
      return `${IP}/uploads/members/default.jpg`;
    }
    // If it already includes the IP, return as is
    if (profileImageUrl.startsWith('http')) {
      return profileImageUrl;
    }
    // If it starts with uploads/, add IP
    if (profileImageUrl.startsWith('uploads/')) {
      return `${IP}/${profileImageUrl}`;
    }
    // Otherwise, construct the full path
    return `${IP}/uploads/members/${profileImageUrl}`;
  };

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
        profile_image_url: getImageUrl(data.profile_image_url),
        timestamp: data.timestamp || new Date().toISOString(),
        visitor_type: data.visitor_type,
        system_type: data.system_type,
        deducted_amount: data.deducted_amount,
      };

      console.log("✅ Setting recent entry:", entryItem);
      setRecentEntries([entryItem]);
      setRecentExits(prev => prev.filter(exit => exit.rfid_tag !== data.rfid_tag));

    } else if (isExit) {
      const exitItem = {
        id: `exit-${data.rfid_tag}-${Date.now()}`,
        rfid_tag: data.rfid_tag,
        full_name: data.full_name || "Unknown",
        profile_image_url: getImageUrl(data.profile_image_url),
        timestamp: data.timestamp || new Date().toISOString(),
        visitor_type: data.visitor_type,
        system_type: data.system_type,
      };

      console.log("✅ Setting recent exit:", exitItem);
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
}, [globalEntryLogs, getImageUrl]);

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
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
          Member Entry/Exit Status
        </h1>
        {user && (
          <p className="text-xs text-gray-500 mt-1">
            Logged in as: {user.name} ({user.role})
          </p>
        )}
      </div>

      <div className="flex justify-between items-center mb-6">
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "🔄" : "↻"} Refresh
        </button>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-green-600 font-medium">🟢 Inside: {insideCount}</div>
          <div className="text-red-600 font-medium">🔴 Outside: {outsideCount}</div>
          <div className="text-gray-600">Total: {entryLogs.length}</div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        {/* Recent Entry Card */}
        <div className="flex-1 bg-green-50 p-4 rounded-lg shadow flex items-center gap-4">
          {recentEntries.length > 0 ? (
            <>
              <img
                src={recentEntries[0]?.profile_image_url}
                alt={recentEntries[0]?.full_name}
                className="w-24 h-24 rounded-lg object-cover border border-green-200"
                onError={(e) => { 
                  console.log("❌ Image load error for entry:", recentEntries[0]?.profile_image_url);
                  e.currentTarget.src = `${IP}/uploads/members/default.jpg`; 
                }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {recentEntries[0]?.full_name}
                </p>
                <p className="text-xs text-gray-500">
                  Time: {new Date(recentEntries[0].timestamp).toLocaleTimeString()}
                </p>
                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded mt-1 inline-block">
                  {recentEntries[0]?.visitor_type || "Member"}
                </span>
              </div>
            </>
          ) : (
            <div className="flex-1 text-center text-gray-400 text-sm">
              <div className="text-3xl mb-2">👤</div>
              <p>No recent entry</p>
            </div>
          )}
        </div>

        {/* Recent Exit Card */}
        <div className="flex-1 bg-red-50 p-4 rounded-lg shadow flex items-center gap-4">
          {recentExits.length > 0 ? (
            <>
              <img
                src={recentExits[0]?.profile_image_url}
                alt={recentExits[0]?.full_name}
                className="w-24 h-24 rounded-lg object-cover border border-red-200"
                onError={(e) => { 
                  console.log("❌ Image load error for exit:", recentExits[0]?.profile_image_url);
                  e.currentTarget.src = `${IP}/uploads/members/default.jpg`; 
                }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {recentExits[0]?.full_name}
                </p>
                <p className="text-xs text-gray-500">
                  Time: {new Date(recentExits[0].timestamp).toLocaleTimeString()}
                </p>
                <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded mt-1 inline-block">
                  {recentExits[0]?.visitor_type || "Member"}
                </span>
              </div>
            </>
          ) : (
            <div className="flex-1 text-center text-gray-400 text-sm">
              <div className="text-3xl mb-2">👤</div>
              <p>No recent exit</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h3 className="text-sm font-medium text-gray-800">All Member Sessions</h3>
        </div>

        {entryLogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🏋️</div>
            <p className="text-gray-600 text-sm">No member activity yet.</p>
            <p className="text-gray-500 text-xs mt-1">
              Member statuses will appear here as they scan in/out.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-96">
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  {["Member", "RFID", "Entry", "Exit", "Status", "Type", "Balance"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-[10px] font-medium text-gray-600 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entryLogs.map((log, index) => {
                  const memberStatus = log.member_status || log.status || "outside";
                  const isRecent =
                    new Date(log.last_activity || log.entry_time || log.exit_time) >
                    new Date(Date.now() - 30000);

                  return (
                    <tr
                      key={`${log.id || log.rfid_tag}-${index}`}
                      className={`hover:bg-gray-50 transition-colors ${
                        isRecent ? "bg-yellow-50 border-l-4 border-yellow-400" : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-xs flex items-center">
                        <img
                          src={getImageUrl(log.profile_image_url)}
                          alt={log.full_name || log.rfid_tag}
                          className="w-8 h-8 rounded-full object-cover mr-2 border border-gray-200"
                          onError={(e) => {
                            e.currentTarget.src = `${IP}/uploads/members/default.jpg`;
                          }}
                        />
                        <span className="font-medium">{log.full_name || "Unknown"}</span>
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-gray-600">
                        {log.rfid_tag}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {log.entry_time ? new Date(log.entry_time).toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {log.exit_time ? new Date(log.exit_time).toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                            memberStatus === "inside"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {memberStatus === "inside" ? "🟢 Inside" : "🔴 Outside"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-[10px]">
                          {log.visitor_type || "Member"}
                        </span>
                        {log.system_type && (
                          <div className="text-[10px] text-gray-500 mt-1">
                            {log.system_type.replace("_", " ")}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {log.system_type === "prepaid_entry" && (
                          <div className="text-[11px]">
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
                          <div className="text-[11px] text-gray-600">
                            Expires:{" "}
                            {new Date(log.subscription_expiry).toLocaleDateString()}
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
)

};

export default MemberEntryBranch;
