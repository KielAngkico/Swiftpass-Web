import React, { useEffect, useState, useCallback, useRef } from "react";
import StaffSidebar from "../../components/StaffSidebar";
import { useWebSocket } from "../../contexts/WebSocketContext";
import { useToast } from "../../components/ToastManager";import api from "../../api";
import { IP } from "../../IpConfig";
import { useAuth } from "../../App";

const MemberEntryBranch = () => {
  const { user } = useAuth();
  const { globalEntryLogs } = useWebSocket();
  const [entryLogs, setEntryLogs] = useState([]);
  const [lastEntry, setLastEntry] = useState(null);
  const [lastExit, setLastExit] = useState(null);
  const [loading, setLoading] = useState(true);
const processedTimestamps = useRef(new Set());
  const { showToast } = useToast();

  useEffect(() => {
    const handleAlert = (e) => {
      showToast({ message: `${e.detail.full_name} - ${e.detail.reason}`, type: "error" });
    };
    window.addEventListener("dashboard-alert", handleAlert);
    return () => window.removeEventListener("dashboard-alert", handleAlert);
  }, [showToast]);

  const getImageUrl = (profileImageUrl) => {
    if (!profileImageUrl) return `${IP}/uploads/members/default.jpg`;
    if (profileImageUrl.startsWith("http")) return profileImageUrl;
    if (profileImageUrl.startsWith("uploads/")) return `${IP}/${profileImageUrl}`;
    return `${IP}/uploads/members/${profileImageUrl}`;
  };

  const fetchLogs = useCallback(async () => {
    if (!user?.adminId) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/staff-entry-logs/${user.adminId}`);
      const filteredLogs = (res.data.recentEntryList || []).filter((log) => {
        const visitorType = log.visitor_type || log.role;
        return visitorType !== "Staff" && visitorType !== "Admin" && visitorType !== "Partner";
      });
      setEntryLogs(filteredLogs);
    } catch (err) {
      console.error("Error fetching logs:", err);
      if (err.response?.status === 401) window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  }, [user?.adminId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!globalEntryLogs || globalEntryLogs.length === 0) return;

    globalEntryLogs.forEach((logEntry) => {
      if (!logEntry?.rfid_tag) return;

      const visitorType = logEntry.visitor_type || logEntry.role;
      if (visitorType === "Staff" || visitorType === "Admin" || visitorType === "Partner") return;

      const timestamp = logEntry.last_activity || logEntry.exit_time || logEntry.entry_time || Date.now();
      const action = logEntry.action || (logEntry.exit_time ? "exit" : "entry");
      const uniqueKey = `${logEntry.rfid_tag}-${timestamp}-${action}`;

      if (processedTimestamps.current.has(uniqueKey)) return;
      processedTimestamps.current.add(uniqueKey);

      const isEntry = logEntry.status === "inside" || logEntry.member_status === "inside" || logEntry.action === "entry";
      const isExit = logEntry.status === "outside" || logEntry.member_status === "outside" || logEntry.action === "exit";

      if (isEntry) {
        setLastEntry({
          id: logEntry.id || `entry-${logEntry.rfid_tag}-${Date.now()}`,
          rfid_tag: logEntry.rfid_tag,
          full_name: logEntry.full_name || "Unknown",
          profile_image_url: getImageUrl(logEntry.profile_image_url),
          timestamp: logEntry.entry_time || timestamp,
          visitor_type: logEntry.visitor_type || "Member",
          system_type: logEntry.system_type,
          deducted_amount: logEntry.deducted_amount,
        });
        setLastExit((prev) => (prev?.rfid_tag === logEntry.rfid_tag ? null : prev));
      } else if (isExit) {
        setLastExit({
          id: logEntry.id || `exit-${logEntry.rfid_tag}-${Date.now()}`,
          rfid_tag: logEntry.rfid_tag,
          full_name: logEntry.full_name || "Unknown",
          profile_image_url: getImageUrl(logEntry.profile_image_url),
          timestamp: logEntry.exit_time || timestamp,
          visitor_type: logEntry.visitor_type || "Member",
          system_type: logEntry.system_type,
        });
        setLastEntry((prev) => (prev?.rfid_tag === logEntry.rfid_tag ? null : prev));
      }

      setEntryLogs((prev) => {
        const updated = [...prev];
        let existingIndex = -1;

        if (logEntry.id) existingIndex = updated.findIndex((log) => log.id === logEntry.id);

        if (existingIndex === -1 && isExit) {
          existingIndex = updated.findIndex(
            (log) =>
              log.rfid_tag === logEntry.rfid_tag &&
              (log.status === "inside" || log.member_status === "inside") &&
              !log.exit_time
          );
        }

        if (existingIndex !== -1) {
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
          updated.unshift({
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
          });
        }

        return updated.sort((a, b) => {
          const timeA = new Date(a.entry_time || a.last_activity || 0);
          const timeB = new Date(b.entry_time || b.last_activity || 0);
          return timeB - timeA;
        });
      });
    });

    if (processedTimestamps.current.size > 100) {
      const arr = Array.from(processedTimestamps.current);
      processedTimestamps.current = new Set(arr.slice(-50));
    }
  }, [globalEntryLogs]);

  useEffect(() => {
    const interval = setInterval(() => {
      const thirtySecondsAgo = Date.now() - 30000;
      setLastEntry((prev) => (prev && new Date(prev.timestamp).getTime() < thirtySecondsAgo ? null : prev));
      setLastExit((prev) => (prev && new Date(prev.timestamp).getTime() < thirtySecondsAgo ? null : prev));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const insideCount = entryLogs.filter((l) => l.member_status === "inside" || l.status === "inside").length;
  const outsideCount = entryLogs.filter((l) => l.member_status === "outside" || l.status === "outside").length;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <StaffSidebar />
        <div className="flex-1 min-w-0 p-6 flex items-center justify-center">
          <p className="text-xs text-gray-500">Loading member status...</p>
        </div>
      </div>
    );
  }

return (
    <div className="flex min-h-screen bg-gray-50">
      <StaffSidebar />
      <div className="flex-1 min-w-0 p-6 overflow-auto">


        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Member Entry / Exit Status</h1>
          {user && (
            <p className="text-xs text-gray-500 mt-0.5">
              Logged in as: {user.name} ({user.role})
            </p>
          )}
        </div>

        <div className="flex justify-between items-center mb-6">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
              Inside: {insideCount}
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
              Outside: {outsideCount}
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
              Total: {entryLogs.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Last Entry</p>
            {lastEntry ? (
              <div className="flex items-center gap-3">
                <img
                  src={lastEntry.profile_image_url}
                  alt={lastEntry.full_name}
                  className="w-14 h-14 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                  onError={(e) => { e.currentTarget.src = `${IP}/uploads/members/default.jpg`; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{lastEntry.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(lastEntry.timestamp).toLocaleTimeString()}</p>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <span className="text-[11px] bg-green-50 text-green-700 border border-green-100 rounded-full px-2 py-0.5">
                      {lastEntry.visitor_type || "Member"}
                    </span>
                    {lastEntry.deducted_amount && (
                      <span className="text-[11px] bg-red-50 text-red-600 border border-red-100 rounded-full px-2 py-0.5">
                        -{lastEntry.deducted_amount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-300">N/A</p>
                  <p className="text-xs text-gray-300 mt-0.5">No recent entry</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Last Exit</p>
            {lastExit ? (
              <div className="flex items-center gap-3">
                <img
                  src={lastExit.profile_image_url}
                  alt={lastExit.full_name}
                  className="w-14 h-14 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                  onError={(e) => { e.currentTarget.src = `${IP}/uploads/members/default.jpg`; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{lastExit.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(lastExit.timestamp).toLocaleTimeString()}</p>
                  <div className="flex gap-1.5 mt-2">
                    <span className="text-[11px] bg-red-50 text-red-600 border border-red-100 rounded-full px-2 py-0.5">
                      {lastExit.visitor_type || "Member"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-300">N/A</p>
                  <p className="text-xs text-gray-300 mt-0.5">No recent exit</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5 flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500">All Member Sessions</span>
            <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
              {entryLogs.length}
            </span>
          </div>

          {entryLogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs font-medium text-gray-500">No member activity yet</p>
              <p className="text-xs text-gray-400 mt-1">Member statuses will appear here as they scan in/out</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[480px]">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {["Member", "RFID", "Entry", "Exit", "Status", "Type"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 border-b border-gray-100">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entryLogs.map((log, index) => {
                    const memberStatus = log.member_status || log.status || "outside";
                    const isRecent =
                      new Date(log.last_activity || log.entry_time || log.exit_time) >
                      new Date(Date.now() - 30000);

                    return (
                      <tr
                        key={`${log.id || log.rfid_tag}-${index}`}
                        className={`hover:bg-gray-50 transition-colors ${isRecent ? "bg-blue-50" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={getImageUrl(log.profile_image_url)}
                              alt={log.full_name || log.rfid_tag}
                              className="w-7 h-7 rounded-full object-cover border border-gray-200 flex-shrink-0"
                              onError={(e) => { e.currentTarget.src = `${IP}/uploads/members/default.jpg`; }}
                            />
                            <span className="text-xs font-medium text-gray-800">{log.full_name || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-400 font-mono">{log.rfid_tag}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-400">
                            {log.entry_time ? new Date(log.entry_time).toLocaleString() : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-400">
                            {log.exit_time ? new Date(log.exit_time).toLocaleString() : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full border ${
                              memberStatus === "inside"
                                ? "bg-green-50 text-green-700 border-green-100"
                                : "bg-red-50 text-red-600 border-red-100"
                            }`}
                          >
                            {memberStatus === "inside" ? "Inside" : "Outside"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
                            {log.visitor_type || "Member"}
                          </span>
                          {log.system_type && (
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {log.system_type.replace("_", " ")}
                            </p>
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