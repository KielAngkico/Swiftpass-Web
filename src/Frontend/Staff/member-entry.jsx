import React, { useEffect, useState, useCallback } from "react";
import StaffSidebar from "../../components/StaffSidebar";
import { useWebSocket } from "../../contexts/WebSocketContext";
import api from "../../api";
import { IP } from "../../IpConfig";
import { useAuth } from "../../App"; 

const MemberEntryBranch = () => {
  const { user } = useAuth(); 
  const { globalEntryLogs } = useWebSocket();
  const [entryLogs, setEntryLogs] = useState([]);
  const [loading, setLoading] = useState(true);


  const fetchLogs = useCallback(async () => {
    if (!user?.adminId) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/staff-entry-logs/${user.adminId}`);
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

    const normalize = (item) => (item?.data ? item.data : item);

    setEntryLogs((prev) => {
      let updated = [...prev];

      globalEntryLogs.map(normalize).forEach((incoming) => {
        if (!incoming?.rfid_tag) return;

        const isEntry =
          incoming.member_status === "inside" || incoming.action === "entry";
        const isExit =
          incoming.member_status === "outside" || incoming.action === "exit";

        if (isExit) {
          const idx = updated.findIndex(
            (log) => log.rfid_tag === incoming.rfid_tag && !log.exit_time
          );
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              ...incoming,
              exit_time: incoming.exit_time || new Date().toISOString(),
              member_status: "outside",
            };
          } else {
            updated = [
              {
                ...incoming,
                exit_time: incoming.exit_time || new Date().toISOString(),
                member_status: "outside",
              },
              ...updated,
            ];
          }
        } else if (isEntry) {
          updated = [
            {
              ...incoming,
              entry_time: incoming.entry_time || new Date().toISOString(),
              exit_time: null,
              member_status: "inside",
            },
            ...updated,
          ];
        }
      });

      return updated.sort(
        (a, b) =>
          new Date(b.entry_time || b.exit_time || b.timestamp || 0) -
          new Date(a.entry_time || a.exit_time || a.timestamp || 0)
      );
    });
  }, [globalEntryLogs]);


  const insideCount = entryLogs.filter((l) => l.member_status === "inside").length;
  const outsideCount = entryLogs.filter((l) => l.member_status === "outside").length;

 
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

        <div className="mb-4 flex justify-between items-center">
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

        {/* Table */}
        {entryLogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏋️</div>
            <p className="text-gray-600 text-lg">No member activity yet.</p>
            <p className="text-gray-500 text-sm mt-2">
              Member statuses will appear here as they scan in/out.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {["Member", "RFID", "Entry", "Exit", "Status", "Type"].map(
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
                {entryLogs.map((log, index) => (
                  <tr
                    key={`${log.rfid_tag}-${log.entry_time || log.exit_time || index}`}
                  >
                    <td className="px-4 py-3 text-sm flex items-center">
                      <img
                        src={`${IP}/${log.profile_image_url || "uploads/members/default.jpg"}`}
                        alt={log.full_name || log.rfid_tag}
                        className="w-8 h-8 rounded-full object-cover mr-3"
                        onError={(e) => {
                          e.currentTarget.src = `${IP}/uploads/members/default.jpg`;
                        }}
                      />
                      {log.full_name || "Unknown"}
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
                          log.member_status === "inside"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {log.member_status === "inside"
                          ? "🟢 Inside"
                          : "🔴 Outside"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {log.visitor_type || "Member"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberEntryBranch;
