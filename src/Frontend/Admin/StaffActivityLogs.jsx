import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OwnerSidebar from "../../components/OwnerSidebar";
import api from "../../api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { generateStaffActivityLogsPDF } from "../../utils/StaffActivityLogsReports";
import { useToast } from "../../components/ToastManager";

const StaffActivityLogs = () => {
  const [user, setUser] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterActivity, setFilterActivity] = useState("All");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        if (!data?.authenticated || !data?.user) throw new Error("Not authenticated");
        setUser(data.user);
      } catch {
        navigate("/login");
      }
    };
    fetchUser();
  }, [navigate]);

  useEffect(() => {
    if (!user?.id && !user?.adminId) return;
    const fetchActivityLogs = async () => {
      try {
        setLoading(true);
        const adminId = user.adminId || user.id;
        const { data } = await api.get(`/api/staff-activity-logs/${adminId}`);
        setActivityLogs(data.logs || []);
        setFilteredLogs(data.logs || []);
      } catch (error) {
        console.error("Failed to load activity logs:", error);
        showToast({ message: "Failed to load activity logs.", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchActivityLogs();
  }, [user]);

  useEffect(() => {
    let filtered = activityLogs;
    if (searchTerm)
      filtered = filtered.filter((log) =>
        log.staff_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    if (filterLocation !== "All")
      filtered = filtered.filter((log) => log.location === filterLocation);
    if (filterActivity !== "All")
      filtered = filtered.filter((log) => log.activity_type === filterActivity);
    if (startDate)
      filtered = filtered.filter((log) => new Date(log.timestamp) >= startDate);
    if (endDate)
      filtered = filtered.filter((log) => new Date(log.timestamp) <= endDate);
    setFilteredLogs(filtered);
  }, [searchTerm, filterLocation, filterActivity, startDate, endDate, activityLogs]);

  const handleDownloadPDF = async () => {
    if (filteredLogs.length === 0) {
      showToast({ message: "No activity data to download", type: "error" });
      return;
    }
    try {
      showToast({ message: "Generating PDF...", type: "info" });
      const { data: meData } = await api.get("/api/me");
      if (!meData.authenticated || !meData.user) throw new Error("Not authenticated");
      const currentAdminId = meData.user.adminId || meData.user.id;
      if (!currentAdminId) throw new Error("Missing admin ID");
      const { data: gymInfo } = await api.get(`/api/gym-info/${currentAdminId}`);
      const logsData = {
        logs: filteredLogs,
        total_activities: filteredLogs.length,
        total_entries: filteredLogs.filter((log) => log.activity_type === "ENTRY").length,
        total_exits: filteredLogs.filter((log) => log.activity_type === "EXIT").length,
      };
      const filterData = {
        gym_name: gymInfo.gym_name,
        owner_name: gymInfo.admin_name,
        start_date: startDate ? startDate.toISOString().split("T")[0] : null,
        end_date: endDate ? endDate.toISOString().split("T")[0] : null,
        filter_location: filterLocation !== "All" ? filterLocation : null,
        filter_activity: filterActivity !== "All" ? filterActivity : null,
        search_term: searchTerm || null,
      };
      const filename = generateStaffActivityLogsPDF(logsData, filterData);
      showToast({ message: `PDF generated successfully: ${filename}`, type: "success" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast({ message: "Failed to generate PDF", type: "error" });
    }
  };

  const totalEntries = filteredLogs.filter((log) => log.activity_type === "ENTRY").length;
  const totalExits = filteredLogs.filter((log) => log.activity_type === "EXIT").length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />
      <main className="flex-1 min-w-0 p-6">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Staff Activity Logs</h1>
            <p className="text-xs text-gray-500 mt-0.5">Track staff entry and exit activities</p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={filteredLogs.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Download PDF
          </button>
        </div>

        {!loading && filteredLogs.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <KpiCard title="Total Activities" value={filteredLogs.length} color="text-gray-900" />
            <KpiCard title="Entries" value={totalEntries} color="text-green-600" />
            <KpiCard title="Exits" value={totalExits} color="text-amber-600" />
          </div>
        )}

        <div className="inline-flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 mb-5">
          <label className="text-xs text-gray-500">Filter:</label>
          <input
            type="text"
            placeholder="Search staff name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Locations</option>
            <option value="ENTRY">Entry</option>
            <option value="EXIT">Exit</option>
          </select>
          <select
            value={filterActivity}
            onChange={(e) => setFilterActivity(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="All">All Activities</option>
            <option value="ENTRY">Entry</option>
            <option value="EXIT">Exit</option>
          </select>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            maxDate={new Date()}
            dateFormat="yyyy-MM-dd"
            placeholderText="Start date"
            isClearable
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            minDate={startDate}
            maxDate={new Date()}
            dateFormat="yyyy-MM-dd"
            placeholderText="End date"
            isClearable
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Staff Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">RFID Tag</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Location</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Activity</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center">
                    <p className="text-xs text-gray-400">Loading activity logs...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center">
                    <p className="text-xs text-gray-400">No activity logs found</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-800">{log.staff_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.rfid_tag || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] border font-medium ${
                        log.location === "ENTRY"
                          ? "bg-blue-50 text-blue-700 border-blue-100"
                          : "bg-purple-50 text-purple-700 border-purple-100"
                      }`}>
                        {log.location}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] border font-medium ${
                        log.activity_type === "ENTRY"
                          ? "bg-green-50 text-green-700 border-green-100"
                          : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}>
                        {log.activity_type === "ENTRY" ? "Entry" : "Exit"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(log.timestamp).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

const KpiCard = ({ title, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4">
    <p className="text-xs text-gray-500">{title}</p>
    <p className={`text-lg font-semibold mt-0.5 ${color}`}>{value}</p>
  </div>
);

export default StaffActivityLogs;