import React, { useEffect, useState } from "react";
import api from "../../../api";
import { generateSubscriptionActivityPDF } from "../../../utils/activityReport";
import { useToast } from "../../../components/ToastManager";
import { getImageUrl } from "../../../utils/getImageUrl";

const KpiBox = ({ title, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1">
    <p className="text-xs text-gray-500">{title}</p>
    <p className={`text-base font-semibold ${color}`}>{value}</p>
  </div>
);

const FILTER_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom" },
];

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white";

const SubscriptionActAnalytics = () => {
  const [adminId, setAdminId] = useState(null);
  const [filterType, setFilterType] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalLogins, setTotalLogins] = useState(0);
  const [peakHour, setPeakHour] = useState("—");
  const [loginData, setLoginData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
const ROWS_PER_PAGE = 10;
  const { showToast } = useToast();

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user) throw new Error("Not authenticated");
        setAdminId(data.user.adminId || data.user.id);
      } catch (err) {
        if (err.response?.status === 401) window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!adminId) return;
    if (filterType === "custom" && (!startDate || !endDate)) {
      setLoginData([]);
      setTotalLogins(0);
      setPeakHour("—");
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const params = {
          admin_id: adminId,
          filter_type: filterType,
        };
        if (filterType === "custom" && startDate && endDate) {
          params.start_date = startDate;
          params.end_date = endDate;
        }
        const response = await api.get("/api/subscription-activity-analytics", { params });
        const apiData = response.data;
        if (apiData) {
          setTotalLogins(apiData.total_logins || 0);
          setPeakHour(apiData.peak_hour || "—");
          setLoginData(apiData.recent_events || []);
        }
      } catch {
        showToast({ message: "Failed to load analytics", type: "error" });
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
      if (!meData.authenticated || !meData.user) throw new Error("Not authenticated");
      const currentAdminId = meData.user.adminId || meData.user.id;
      if (!currentAdminId) throw new Error("Missing admin ID");
      const { data: gymInfo } = await api.get(`/api/gym-info/${currentAdminId}`);
      const analyticsData = {
        total_logins: totalLogins,
        members_inside: loginData.filter((l) => l.status === "inside").length,
        peak_hour: peakHour,
        most_active_members: [],
        entry_logs: loginData,
      };
      const filterData = {
        gym_name: gymInfo.gym_name,
        owner_name: gymInfo.admin_name,
        start_date: startDate || null,
        end_date: endDate || null,
        filter_type: filterType,
      };
      const filename = generateSubscriptionActivityPDF(analyticsData, filterData);
      showToast({ message: `PDF generated successfully: ${filename}`, type: "success" });
    } catch {
      showToast({ message: "Failed to generate PDF", type: "error" });
    }
  };
const totalPages = Math.max(1, Math.ceil(loginData.length / ROWS_PER_PAGE));
const paginated = loginData.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  const membersInside = loginData.filter((l) => l.status === "inside").length;

  return (
    <div className="flex flex-col">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Activity Analytics</h1>
        <p className="text-xs text-gray-500 mt-0.5">Overview of subscription member activity</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <KpiBox title="Members Inside" value={membersInside} color="text-blue-600" />
        <KpiBox title="Total Logins" value={totalLogins} color="text-gray-900" />
        <KpiBox title="Peak Hour" value={peakHour} color="text-gray-900" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="bg-gray-100 border border-gray-200 rounded-lg p-1 flex items-center gap-0.5">
              {FILTER_OPTIONS.filter((opt) => opt.value !== "custom").map((opt) => (
                <button
                  key={opt.value}
onClick={() => {
                    setFilterType(opt.value);
                    setStartDate("");
                    setEndDate("");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filterType === opt.value
                      ? "bg-white text-gray-900 border border-gray-200 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilterType("custom")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filterType === "custom"
                      ? "bg-white text-gray-900 border border-gray-200 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Custom
                </button>
                {filterType === "custom" && (
                  <>
                    <input
                      type="date"
                      value={startDate}
                      max={today}
                      onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                      className="border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white w-32"
                    />
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      max={today}
                      disabled={!startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white w-32 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={loginData.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Download PDF
          </button>
        </div>

        <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900">Member Activity Logs</p>
          <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
            {loginData.length} {loginData.length === 1 ? "record" : "records"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Profile</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">RFID</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Entry</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Exit</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-xs text-gray-400">
                    Loading activity logs...
                  </td>
                </tr>
              ) : loginData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-xs text-gray-400">
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                paginated.map((log, i) => (
                  <tr key={log.id || i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      {log.profile_image_url ? (
<img
                          src={getImageUrl(log.profile_image_url, "members")}
                          alt={log.full_name}
                          onError={(e) => { e.target.src = `https://swiftpasstech.com/uploads/members/default.jpg`; }}
                          className="w-7 h-7 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[9px] text-gray-400 font-medium">
                          {log.full_name ? log.full_name.charAt(0).toUpperCase() : "?"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-800">{log.full_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.rfid_tag}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${log.visitor_type === "Day Pass" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {log.visitor_type || "Member"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {log.entry_time ? new Date(log.entry_time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {log.exit_time ? new Date(log.exit_time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${log.status === "inside" ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
</tbody>
          </table>
          {loginData.length > 0 && (
  <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center">
    <p className="text-xs text-gray-400">
      Showing {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, loginData.length)} of {loginData.length}
    </p>
    <div className="flex items-center gap-1">
      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors">Prev</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1).reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, []).map((p, idx) => p === "..." ? (<span key={`ellipsis-${idx}`} className="text-xs text-gray-400 px-1">...</span>) : (<button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors border ${page === p ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>{p}</button>))}
      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors">Next</button>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionActAnalytics;