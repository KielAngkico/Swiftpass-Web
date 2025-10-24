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
  const { showToast } = useToast(); // ;

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

  // Apply filters
  useEffect(() => {
    let filtered = activityLogs;

    // Search by staff name
    if (searchTerm) {
      filtered = filtered.filter((log) =>
        log.staff_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by location
    if (filterLocation !== "All") {
      filtered = filtered.filter((log) => log.location === filterLocation);
    }

    // Filter by activity type
    if (filterActivity !== "All") {
      filtered = filtered.filter((log) => log.activity_type === filterActivity);
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(
        (log) => new Date(log.timestamp) >= startDate
      );
    }

    if (endDate) {
      filtered = filtered.filter(
        (log) => new Date(log.timestamp) <= endDate
      );
    }

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
    if (!meData.authenticated || !meData.user) {
      throw new Error("Not authenticated");
    }

    const currentAdminId = meData.user.adminId || meData.user.id;
    if (!currentAdminId) throw new Error("Missing admin ID");

    const { data: gymInfo } = await api.get(`/api/gym-info/${currentAdminId}`);

    const logsData = {
      logs: filteredLogs,
      total_activities: filteredLogs.length,
      total_entries: filteredLogs.filter((log) => log.activity_type === "ENTRY").length,
      total_exits: filteredLogs.filter((log) => log.activity_type === "EXIT").length
    };

    const filterData = {
      gym_name: gymInfo.gym_name,
      owner_name: gymInfo.admin_name,
      start_date: startDate ? startDate.toISOString().split("T")[0] : null,
      end_date: endDate ? endDate.toISOString().split("T")[0] : null,
      filter_location: filterLocation !== "All" ? filterLocation : null,
      filter_activity: filterActivity !== "All" ? filterActivity : null,
      search_term: searchTerm || null
    };

    const filename = generateStaffActivityLogsPDF(logsData, filterData);

    showToast({
      message: `PDF generated successfully: ${filename}`,
      type: "success"
    });
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    showToast({
      message: "Failed to generate PDF",
      type: "error"
    });
  }
};

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />
      <main className="flex-1 p-5">

        <div className="mb-6 flex justify-between items-start">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              Staff Activity Logs
            </h2>
            <p className="text-xs text-gray-500">
              Track staff entry and exit activities
            </p>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
            title="Download PDF Report"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <span className="hidden sm:inline">Download PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>

        {/* Summary Stats */}
        {!loading && filteredLogs.length > 0 && (
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white shadow p-3 rounded text-center">
              <h3 className="text-xs text-gray-600">Total Activities</h3>
              <p className="text-base sm:text-lg font-bold text-gray-800">
                {filteredLogs.length}
              </p>
            </div>
            <div className="bg-white shadow p-3 rounded text-center">
              <h3 className="text-xs text-gray-600">Entries</h3>
              <p className="text-base sm:text-lg font-bold text-green-600">
                {filteredLogs.filter((log) => log.activity_type === "ENTRY").length}
              </p>
            </div>
            <div className="bg-white shadow p-3 rounded text-center">
              <h3 className="text-xs text-gray-600">Exits</h3>
              <p className="text-base sm:text-lg font-bold text-orange-600">
                {filteredLogs.filter((log) => log.activity_type === "EXIT").length}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-4">
          <input
            type="text"
            placeholder="🔍 Search Staff Name"
            className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm placeholder:text-gray-400 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm bg-white"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
          >
            <option value="All">All Locations</option>
            <option value="ENTRY">Entry</option>
            <option value="EXIT">Exit</option>
          </select>

          <select
            className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm bg-white"
            value={filterActivity}
            onChange={(e) => setFilterActivity(e.target.value)}
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
            className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm bg-white"
            placeholderText="Start Date"
            isClearable
          />

          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            minDate={startDate}
            maxDate={new Date()}
            dateFormat="yyyy-MM-dd"
            className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm bg-white"
            placeholderText="End Date"
            isClearable
          />
        </div>

        {/* Activity Logs Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-[10px] sm:text-xs text-left border-collapse">
            <thead className="bg-gray-700 text-white uppercase text-[9px] sm:text-[10px]">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Staff Name</th>
                <th className="px-3 py-2">RFID Tag</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Activity</th>
                <th className="px-3 py-2">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-3 py-6 text-center bg-white">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full"></div>
                      <span className="ml-2 text-gray-500 text-xs">Loading activity logs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-6 text-center bg-white text-xs text-gray-400">
                    No activity logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <tr key={log.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {log.staff_name}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {log.rfid_tag || "N/A"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-medium ${
                        log.location === "ENTRY"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}>
                        {log.location}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-medium ${
                        log.activity_type === "ENTRY"
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}>
                        {log.activity_type === "ENTRY" ? "🚪 Entry" : "🚶 Exit"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {new Date(log.timestamp).toLocaleString()}
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

export default StaffActivityLogs;
