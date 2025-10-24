import React, { useEffect, useState } from "react";
import api from "../../../api";
import { generateSubscriptionActivityPDF } from "../../../utils/activityReport";
import { useToast } from "../../../components/ToastManager";


const KPI = ({ title, value }) => (
  <div className="bg-white p-2 rounded shadow text-center text-xs sm:text-sm">
    <p className="text-gray-500 truncate">{title}</p>
    <p className="font-bold text-indigo-600 text-sm sm:text-base">{value}</p>
  </div>
);

const SubscriptionActAnalytics = () => {
  const [adminId, setAdminId] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalLogins, setTotalLogins] = useState(0);
  const [peakHour, setPeakHour] = useState("—");
  const [loginData, setLoginData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
    const { showToast } = useToast(); // ;

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user) {
          throw new Error("Not authenticated");
        }
        setAdminId(data.user.adminId || data.user.id);
      } catch (err) {
        console.error(" Error fetching user:", err);
        setError("Failed to authenticate");
        if (err.response?.status === 401) {
          window.location.href = "/login";
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!adminId) {
      return;
    }
    
    if (filterType === "custom" && (!startDate || !endDate)) {
      setLoading(false);
      setLoginData([]);
      setTotalLogins(0);
      setPeakHour("—");
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = { 
          admin_id: adminId, 
          filter_type: filterType
        };
        
        if (filterType === "custom" && startDate && endDate) {
          params.start_date = startDate;
          params.end_date = endDate;
        }
        
        const response = await api.get("/api/subscription-activity-analytics", { params });
        console.log("Full response:", response);
        console.log("Response data:", response.data);
        
        const apiData = response.data;
        
        if (apiData) {
          setTotalLogins(apiData.total_logins || 0);
          setPeakHour(apiData.peak_hour || "—");
          setLoginData(apiData.recent_events || []);
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setError("Failed to load analytics");
        setLoginData([]);
        setTotalLogins(0);
        setPeakHour("—");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [adminId, filterType, startDate, endDate]);

  const handleDownloadPDF = async () => {
    if (loginData.length === 0) {
showToast({ message: "No members to download", type: "error" });
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

      const analyticsData = {
        total_logins: totalLogins,
        members_inside: loginData.filter(l => l.status === "inside").length,
        peak_hour: peakHour,
        most_active_members: [],
        entry_logs: loginData
      };

      const filterData = {
        gym_name: gymInfo.gym_name,
        owner_name: gymInfo.admin_name,
        start_date: startDate || null,
        end_date: endDate || null,
        filter_type: filterType
      };

      const filename = generateSubscriptionActivityPDF(analyticsData, filterData);

showToast({ message: `PDF generated successfully: ${filename}`, type: "success" });

    } catch (error) {
      console.error(" Error generating PDF:", error);
showToast({ message: "Failed to generate PDF", type: "error" });

    }
  };

  if (loading && !adminId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!adminId) {
    return <p className="text-xs text-gray-500">No admin user data available</p>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const membersInside = loginData.filter((l) => l.status === "inside").length;

  return (
    <div className="min-h-screen w-full bg-white p-2 flex flex-col space-y-3">


      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">Subscription Activity Analytics</h1>
          <p className="text-xs text-gray-500">Overview of subscription member activity</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={loginData.length === 0}
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

      <div className="flex items-center">
        <div className="bg-white p-2 rounded-md shadow-sm inline-flex items-center gap-2">
          <label className="text-xs text-gray-600">Filter:</label>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              if (e.target.value !== "custom") {
                setStartDate("");
                setEndDate("");
              }
            }}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            <option value="today">Today</option>
            <option value="custom">Custom</option>
          </select>

          {filterType === "custom" && (
            <>
              <input
                type="date"
                value={startDate}
                max={today}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                max={today}
                disabled={!startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        <KPI title="Members Inside" value={membersInside} />
        <KPI title="Total Logins" value={totalLogins} />
        <KPI title="Peak Hour" value={peakHour} />
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <h2 className="text-sm font-semibold px-2 py-2 border-b">🧾 Member Activity Logs</h2>
        <div className="overflow-x-auto max-h-[350px] overflow-y-auto scroll-smooth text-[10px] sm:text-xs">
          <table className="min-w-full text-left">
            <thead className="bg-gray-700 text-white uppercase text-[9px] sm:text-xs sticky top-0">
              <tr>
                <th className="px-2 py-1">#</th>
                <th className="px-2 py-1">Profile</th>
                <th className="px-2 py-1">Name</th>
                <th className="px-2 py-1">RFID</th>
                <th className="px-2 py-1">Type</th>
                <th className="px-2 py-1">Entry</th>
                <th className="px-2 py-1">Exit</th>
                <th className="px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {loginData.length > 0 ? (
                loginData.map((log, i) => (
                  <tr key={log.id || i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">
                      {log.profile_image_url ? (
                        <img
                          src={`http://localhost:5000/${log.profile_image_url}`}
                          alt={log.full_name}
                          onError={(e) => {
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%236366F1' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='40' fill='white'%3E" + (log.full_name ? log.full_name.charAt(0).toUpperCase() : "?") + "%3C/text%3E%3C/svg%3E";
                          }}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center text-[8px] sm:text-xs text-gray-500">
                          {log.full_name ? log.full_name.charAt(0).toUpperCase() : "?"}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1 font-medium">{log.full_name}</td>
                    <td className="px-2 py-1 font-mono">{log.rfid_tag}</td>
                    <td className="px-2 py-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-semibold ${
                          log.visitor_type === "Day Pass" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {log.visitor_type || "Member"}
                      </span>
                    </td>
                    <td className="px-2 py-1">
                      {log.entry_time ? new Date(log.entry_time).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      }) : "—"}
                    </td>
                    <td className="px-2 py-1">
                      {log.exit_time ? new Date(log.exit_time).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      }) : "—"}
                    </td>
                    <td className="px-2 py-1">
                      <span
                        className={`px-1 py-0.5 rounded-full text-[8px] sm:text-xs font-semibold ${
                          log.status === "inside" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-gray-500">
                    No activity logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionActAnalytics;
