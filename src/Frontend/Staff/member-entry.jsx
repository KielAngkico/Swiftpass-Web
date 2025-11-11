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
  const [lastEntry, setLastEntry] = useState(null); 
  const [lastExit, setLastExit] = useState(null);  
  const [loading, setLoading] = useState(true);
  const processedTimestamps = useRef(new Set()); // ✅ Changed from IDs to timestamps

  const getImageUrl = (profileImageUrl) => {
    if (!profileImageUrl) {
      return `${IP}/uploads/members/default.jpg`;
    }
    if (profileImageUrl.startsWith('http')) {
      return profileImageUrl;
    }
    if (profileImageUrl.startsWith('uploads/')) {
      return `${IP}/${profileImageUrl}`;
    }
    return `${IP}/uploads/members/${profileImageUrl}`;
  };

const fetchLogs = useCallback(async () => {
    if (!user?.adminId) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/staff-entry-logs/${user.adminId}`);
      
      // ✅ Filter out Staff, Admin, and Partner entries
      const filteredLogs = (res.data.recentEntryList || []).filter(log => {
        const visitorType = log.visitor_type || log.role;
        const shouldExclude = visitorType === "Staff" || visitorType === "Admin" || visitorType === "Partner";
        
        if (shouldExclude) {
        }
        
        return !shouldExclude;
      });
      
      setEntryLogs(filteredLogs);
    } catch (err) {
      console.error("Error fetching logs:", err);
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

  // ✅ FIXED: Process globalEntryLogs with better deduplication
  useEffect(() => {
    if (!globalEntryLogs || globalEntryLogs.length === 0) {
      return;
    }


    // Process each log entry
    globalEntryLogs.forEach((logEntry) => {
      if (!logEntry?.rfid_tag) {
        return;
      }

      // ✅ Use a combination of RFID + timestamp + action for deduplication
      const timestamp = logEntry.last_activity || logEntry.exit_time || logEntry.entry_time || Date.now();
      const action = logEntry.action || (logEntry.exit_time ? 'exit' : 'entry');
      const uniqueKey = `${logEntry.rfid_tag}-${timestamp}-${action}`;
      
      if (processedTimestamps.current.has(uniqueKey)) {
        return;
      }

      processedTimestamps.current.add(uniqueKey);

      // ✅ Determine if entry or exit
      const isEntry = logEntry.status === "inside" || logEntry.member_status === "inside" || logEntry.action === "entry";
      const isExit = logEntry.status === "outside" || logEntry.member_status === "outside" || logEntry.action === "exit";

      // ✅ Update Last Entry/Exit cards (30-second display)
      if (isEntry) {
        const entryItem = {
          id: logEntry.id || `entry-${logEntry.rfid_tag}-${Date.now()}`,
          rfid_tag: logEntry.rfid_tag,
          full_name: logEntry.full_name || "Unknown",
          profile_image_url: getImageUrl(logEntry.profile_image_url),
          timestamp: logEntry.entry_time || timestamp,
          visitor_type: logEntry.visitor_type || "Member",
          system_type: logEntry.system_type,
          deducted_amount: logEntry.deducted_amount,
        };

        setLastEntry(entryItem);
        
        // Remove from exit if same person re-enters
        setLastExit(prev => {
          if (prev?.rfid_tag === logEntry.rfid_tag) {
            return null;
          }
          return prev;
        });

      } else if (isExit) {
        const exitItem = {
          id: logEntry.id || `exit-${logEntry.rfid_tag}-${Date.now()}`,
          rfid_tag: logEntry.rfid_tag,
          full_name: logEntry.full_name || "Unknown",
          profile_image_url: getImageUrl(logEntry.profile_image_url),
          timestamp: logEntry.exit_time || timestamp,
          visitor_type: logEntry.visitor_type || "Member",
          system_type: logEntry.system_type,
        };

        setLastExit(exitItem);
        
        // Remove from entry if same person exits
        setLastEntry(prev => {
          if (prev?.rfid_tag === logEntry.rfid_tag) {
            return null;
          }
          return prev;
        });
      }

      // ✅ Update main table logs
      setEntryLogs(prev => {
        const updated = [...prev];
        
        // Find existing log by ID or RFID (for updates)
        let existingIndex = -1;
        
        if (logEntry.id) {
          existingIndex = updated.findIndex(log => log.id === logEntry.id);
        }
        
        // If updating an exit, find the most recent "inside" log for this RFID
        if (existingIndex === -1 && isExit) {
          existingIndex = updated.findIndex(
            log => log.rfid_tag === logEntry.rfid_tag && 
                   (log.status === "inside" || log.member_status === "inside") &&
                   !log.exit_time
          );
        }

        if (existingIndex !== -1) {
          // ✅ UPDATE existing log
          updated[existingIndex] = {
            ...updated[existingIndex],
            id: logEntry.id || updated[existingIndex].id,
            full_name: logEntry.full_name || updated[existingIndex].full_name,
            profile_image_url: logEntry.profile_image_url || updated[existingIndex].profile_image_url,
            entry_time: logEntry.entry_time || updated[existingIndex].entry_time,
            exit_time: logEntry.exit_time || updated[existingIndex].exit_time,
            status: logEntry.status || logEntry.member_status || updated[existingIndex].status,
            member_status: logEntry.status || logEntry.member_status || updated[existingIndex].member_status,
            deducted_amount: logEntry.deducted_amount ?? updated[existingIndex].deducted_amount,
            current_balance: logEntry.current_balance ?? updated[existingIndex].current_balance,
            remaining_balance: logEntry.remaining_balance ?? logEntry.current_balance ?? updated[existingIndex].remaining_balance,
            last_activity: timestamp,
            visitor_type: logEntry.visitor_type || updated[existingIndex].visitor_type,
            system_type: logEntry.system_type || updated[existingIndex].system_type,
            staff_name: logEntry.staff_name || updated[existingIndex].staff_name,
          };
        } else {
          // ✅ ADD new log
          const newLog = {
            id: logEntry.id || `temp-${logEntry.rfid_tag}-${Date.now()}`,
            rfid_tag: logEntry.rfid_tag,
            full_name: logEntry.full_name || "Unknown",
            profile_image_url: logEntry.profile_image_url,
            entry_time: logEntry.entry_time,
            exit_time: logEntry.exit_time,
            status: logEntry.status || logEntry.member_status || (isEntry ? "inside" : "outside"),
            member_status: logEntry.status || logEntry.member_status || (isEntry ? "inside" : "outside"),
            visitor_type: logEntry.visitor_type || "Member",
            system_type: logEntry.system_type,
            deducted_amount: logEntry.deducted_amount,
            current_balance: logEntry.current_balance,
            remaining_balance: logEntry.remaining_balance || logEntry.current_balance,
            subscription_expiry: logEntry.subscription_expiry,
            staff_name: logEntry.staff_name,
            last_activity: timestamp,
          };
          updated.unshift(newLog);
        }

        // ✅ Sort by most recent activity
        return updated.sort((a, b) => {
          const timeA = new Date(a.last_activity || a.exit_time || a.entry_time || 0);
          const timeB = new Date(b.last_activity || b.exit_time || b.entry_time || 0);
          return timeB - timeA;
        });
      });
    });

    // ✅ Clean up old timestamps (keep only last 100)
    if (processedTimestamps.current.size > 100) {
      const timestamps = Array.from(processedTimestamps.current);
      processedTimestamps.current = new Set(timestamps.slice(-50));
    }

  }, [globalEntryLogs]); // ✅ This will trigger on every globalEntryLogs change

  // ✅ Clear last entry/exit after 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const thirtySecondsAgo = now - 30000;

      setLastEntry(prev => {
        if (prev && new Date(prev.timestamp).getTime() < thirtySecondsAgo) {
          return null;
        }
        return prev;
      });

      setLastExit(prev => {
        if (prev && new Date(prev.timestamp).getTime() < thirtySecondsAgo) {
          return null;
        }
        return prev;
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

        {/* Last Entry/Exit Cards */}
        <div className="flex gap-4 mb-6">
          {/* Last Entry Card */}
          <div className="flex-1 bg-green-50 p-4 rounded-lg shadow border-2 border-green-200">
            <div className="text-xs font-semibold text-green-800 mb-2 uppercase">
              Last Entry
            </div>
            {lastEntry ? (
              <div className="flex items-center gap-4">
                <img
                  src={lastEntry.profile_image_url}
                  alt={lastEntry.full_name}
                  className="w-20 h-20 rounded-lg object-cover border-2 border-green-300"
                  onError={(e) => { 
                    e.currentTarget.src = `${IP}/uploads/members/default.jpg`; 
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {lastEntry.full_name}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(lastEntry.timestamp).toLocaleTimeString()}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-green-200 text-green-900 px-2 py-1 rounded font-medium">
                      {lastEntry.visitor_type || "Member"}
                    </span>
                    {lastEntry.deducted_amount && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
                        -₱{lastEntry.deducted_amount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                  <span className="text-3xl text-gray-400"></span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-400">N/A</p>
                  <p className="text-xs text-gray-400 mt-1">No recent entry</p>
                </div>
              </div>
            )}
          </div>

          {/* Last Exit Card */}
          <div className="flex-1 bg-red-50 p-4 rounded-lg shadow border-2 border-red-200">
            <div className="text-xs font-semibold text-red-800 mb-2 uppercase">
              Last Exit
            </div>
            {lastExit ? (
              <div className="flex items-center gap-4">
                <img
                  src={lastExit.profile_image_url}
                  alt={lastExit.full_name}
                  className="w-20 h-20 rounded-lg object-cover border-2 border-red-300"
                  onError={(e) => { 
                    e.currentTarget.src = `${IP}/uploads/members/default.jpg`; 
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {lastExit.full_name}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(lastExit.timestamp).toLocaleTimeString()}
                  </p>
                  <span className="text-xs bg-red-200 text-red-900 px-2 py-1 rounded font-medium mt-2 inline-block">
                    {lastExit.visitor_type || "Member"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                  <span className="text-3xl text-gray-400">👤</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-400">N/A</p>
                  <p className="text-xs text-gray-400 mt-1">No recent exit</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
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
                    {["Member", "RFID", "Entry", "Exit", "Status", "Type"].map((h) => (
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