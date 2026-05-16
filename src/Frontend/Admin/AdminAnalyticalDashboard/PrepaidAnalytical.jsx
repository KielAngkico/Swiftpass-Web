import React, { useEffect, useState, useMemo } from "react";
import api from "../../../api";
import { generatePrepaidAnalyticalPDF } from "../../../utils/analyticalReport";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { useToast } from "../../../components/ToastManager";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const padDataArray = (labels, data) => {
  const padded = Array(labels.length).fill(0);
  data.forEach((value, idx) => {
    if (idx < padded.length) padded[idx] = value;
  });
  return padded;
};

const FILTER_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom" },
];

const PrepaidAnalytical = ({ adminUser }) => {
  const [adminId, setAdminId] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
const [insideFilter, setInsideFilter] = useState("All");
  const { showToast } = useToast();
 const today = new Date().toISOString().split("T")[0];
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user) throw new Error("Not authenticated");
        setAdminId(data.user.adminId || data.user.id);
      } catch (err) {
        console.error("Error fetching admin:", err);
        if (err.response?.status === 401) window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };
    fetchAdmin();
  }, []);

  useEffect(() => {
    if (!adminId) return;
    if (filterType === "custom" && (!startDate || !endDate)) {
      setAnalyticsData(null);
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
const params = { admin_id: adminId, system_type: "prepaid_entry", filter_type: filterType };
if (filterType === "custom") {
  params.start_date = startDate;
  params.end_date = endDate;
}
        const { data } = await api.get("/api/prepaid-activity-analytics", { params });
        setAnalyticsData(data);
      } catch (err) {
        console.error("Failed to load analytics:", err);
        showToast({ message: "Failed to load analytics", type: "error" });
        setAnalyticsData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [adminId, filterType, startDate, endDate]);

  const handleDownloadPDF = async () => {
    if (!analyticsData) {
      showToast({ message: "No data to download", type: "error" });
      return;
    }
    try {
      showToast({ message: "Generating PDF...", type: "info" });
      const { data: meData } = await api.get("/api/me");
      if (!meData.authenticated || !meData.user) throw new Error("Not authenticated");
      const currentAdminId = meData.user.adminId || meData.user.id;
      if (!currentAdminId) throw new Error("Missing admin ID");
      const { data: gymInfo } = await api.get(`/api/gym-info/${currentAdminId}`);
      const filterData = {
        filter_type: filterType,
        start_date: filterType === "custom" ? startDate : undefined,
        end_date: filterType === "custom" ? endDate : undefined,
        gym_name: gymInfo.gym_name,
        owner_name: gymInfo.admin_name,
      };
      const filename = await generatePrepaidAnalyticalPDF(analyticsData, filterData);
      showToast({ message: `PDF generated successfully: ${filename}`, type: "success" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast({ message: "Failed to generate PDF", type: "error" });
    }
  };

  const sampleData = useMemo(() => {
    if (!analyticsData) {
      return {
        totalRevenue: 0,
        membersInside: 0,
        dayPassInside: 0,
        totalInside: 0,
        totalLogins: 0,
        totalTransactions: 0,
        peakHour: "—",
        scansByHour: { labels: [], values: [] },
        currentlyInside: [],
        topMembers: [],
        transaction_breakdown: {},
      };
    }

    const scanLabels = analyticsData.scans_by_hour?.map((s) => `${s.hour}:00`) || [];
    const currentlyInside = analyticsData.currently_inside || [];
    const members = currentlyInside.filter((p) => !p.visitor_type || p.visitor_type !== "Day Pass");
    const dayPass = currentlyInside.filter((p) => p.visitor_type === "Day Pass");

    return {
      totalRevenue: analyticsData.prepaid_revenue || 0,
      membersInside: members.length,
      dayPassInside: dayPass.length,
      totalInside: currentlyInside.length,
      totalLogins: analyticsData.total_logins || 0,
      totalTransactions:
        (analyticsData.topups_vs_deductions?.topups || 0) +
        (analyticsData.topups_vs_deductions?.deductions || 0),
      peakHour: analyticsData.peak_hour || "—",
      scansByHour: {
        labels: scanLabels,
        values: padDataArray(scanLabels, analyticsData.scans_by_hour?.map((s) => s.count) || []),
      },
      currentlyInside,
      topMembers: (analyticsData.topMembers || analyticsData.most_active_members || []).map((m) => ({
        member_id: m.memberId || m.member_id,
        full_name: m.name || m.full_name,
        rfid_tag: m.rfidTag || m.rfid_tag,
        profile_image_url: m.profileImageUrl || m.profile_image_url,
        login_count: m.visitCount || m.login_count,
      })),
      transaction_breakdown: analyticsData.transaction_breakdown || {},
    };
  }, [analyticsData]);

const filteredInside = sampleData.currentlyInside.filter((m) => {
  if (insideFilter === "All") return true;
  if (insideFilter === "Member") return m.visitor_type !== "Day Pass";
  if (insideFilter === "Day Pass") return m.visitor_type === "Day Pass";
  return true;
});
const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        boxWidth: 12,
        padding: 10,
        font: { size: 10 },
      },
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const value = context.parsed;
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage =
            total > 0 ? ((value / total) * 100).toFixed(1) : 0;

          return `${context.label}: ${value.toLocaleString()} (${percentage}%)`;
        },
      },
    },
  },
};

const TYPE_LABELS = {
  new_membership: "New Membership",
  Tapup: "Top Up",
  renewal: "Renewal",
  day_pass_session: "Day Pass",
  day_pass_renewal: "Day Pass Renewal",
  rfid_replacement: "RFID Replacement",
};

const topupsVsDeductionsData = {
    labels: Object.keys(sampleData.transaction_breakdown || {}).map((k) => TYPE_LABELS[k] || k),
    datasets: [
      {
        data: Object.values(sampleData.transaction_breakdown || {}),
        backgroundColor: ["#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899"],
        borderWidth: 0,
      },
    ],
  };

const FIXED_HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const fixedHourValues = FIXED_HOURS.map((label) => {
    const idx = sampleData.scansByHour.labels.indexOf(label);
    return idx !== -1 ? sampleData.scansByHour.values[idx] : 0;
  });
  const hasPeakData = fixedHourValues.some((v) => v > 0);

  const scansByHourData = {
    labels: FIXED_HOURS,
    datasets: [
      {
        label: "Logins",
        data: fixedHourValues,
        fill: true,
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        borderColor: hasPeakData ? "#8B5CF6" : "#E5E7EB",
        tension: 0.4,
        pointRadius: hasPeakData ? 3 : 0,
        pointHoverRadius: hasPeakData ? 5 : 0,
        pointBackgroundColor: "#8B5CF6",
        borderWidth: 2,
      },
    ],
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-500">Loading analytics...</p>
      </div>
    );
  }

 

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-center">
<div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
<div className="p-4 border-b border-gray-100 flex flex-wrap gap-2 items-center">    
    {/* FILTERS */}
    <div className="flex flex-wrap gap-2 items-center">
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-1 flex items-center gap-0.5">
        
        {FILTER_OPTIONS.filter((opt) => opt.value !== "custom").map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setFilterType(opt.value);
              setStartDate("");
              setEndDate("");
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

        {/* CUSTOM */}
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
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white w-32"
              />
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                max={today}
                disabled={!startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white w-32 disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </>
          )}
        </div>
      </div>
    </div>
  </div>
</div>
        <button
          onClick={handleDownloadPDF}
          disabled={!analyticsData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Download PDF
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Total Revenue" value={`₱${sampleData.totalRevenue.toLocaleString()}`} color="text-green-600" />
        <KpiCard title="Total Transactions" value={sampleData.totalTransactions} color="text-amber-600" />
        <KpiCard title="Total Logins" value={sampleData.totalLogins} color="text-purple-600" />

        <KpiCard title="Members Inside" value={sampleData.membersInside} color="text-blue-600" />
        <KpiCard title="Day Pass Inside" value={sampleData.dayPassInside} color="text-indigo-600" />
        <KpiCard title="Peak Hour" value={sampleData.peakHour} color="text-gray-700" />
      </div>

      <div className="flex items-stretch gap-5">
        <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
<p className="text-sm font-medium text-gray-900">Top 3 Most Active Members</p>            <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
              {sampleData.topMembers.length} members
            </span>
          </div>
<div className="grid grid-cols-3 gap-3 flex-1">
        {[1, 0, 2].map((i) => {
              const member = sampleData.topMembers[i];
              const rankLabels = ["1st", "2nd", "3rd"];
              const rankColors = ["text-yellow-700", "text-gray-500", "text-orange-700"];
              const cardColors = [
                "bg-yellow-50 border-yellow-200",
                "bg-gray-50 border-gray-200",
                "bg-orange-50 border-orange-200",
          
              ];
              return member ? (
                <div
                  key={member.member_id || member.rfid_tag || i}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center ${cardColors[i]}`}
                >
                  <p className={`text-xs font-medium ${rankColors[i]}`}>
                    {rankLabels[i]}
                  </p>
                  <img
                    src={member.profile_image_url || "https://swiftpasstech.com/uploads/members/default.jpg"}
                    alt={member.full_name}
                    className="w-14 h-14 object-cover rounded-full border border-gray-200"
                    onError={(e) => { e.currentTarget.src = "https://swiftpasstech.com/uploads/members/default.jpg"; }}
                  />
                  <p className="text-xs font-medium text-gray-800 leading-tight">{member.full_name}</p>
<p className="text-[10px] text-gray-500">Visits: {member.login_count}</p>
                  <p className="text-[10px] text-gray-400">ID: {member.member_id}</p>
                </div>
              ) : (
<div
                  key={`empty-${i}`}
                  className="p-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 min-h-[160px]"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200" />
                  <p className="text-[10px] text-gray-400">No data</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-80 flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
<div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-2">
  <div className="flex justify-between items-center">
    <p className="text-sm font-medium text-gray-900">Currently Inside</p>
    <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
      {filteredInside.length}
    </span>
  </div>

  <div className="bg-gray-100 rounded-lg p-0.5 flex gap-0.5">
    {["All", "Member", "Day Pass"].map((opt) => (
      <button
        key={opt}
        onClick={() => setInsideFilter(opt)}
        className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-colors ${
          insideFilter === opt
            ? "bg-white text-gray-900 border border-gray-200 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
</div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Entry</th>
              </tr>
            </thead>
          </table>
          <div className="overflow-y-auto flex-1">
            <table className="w-full">
              <tbody className="divide-y divide-gray-50">
{filteredInside.length > 0 ? (
  filteredInside.map((person, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">{person.full_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] border ${
                          person.visitor_type === "Day Pass"
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}>
                          {person.visitor_type === "Day Pass" ? "Day Pass" : "Member"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(person.entry_time).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3">
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200" />
                        <p className="text-xs text-gray-400">
  {insideFilter === "All"
    ? "No one is currently inside"
    : `No ${insideFilter}s inside`}
</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
<div className="flex flex-col lg:flex-row gap-5">
  <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4">
    <p className="text-sm font-medium text-gray-900 mb-3">
      Peak Hour Analysis (24 Hours)
    </p>

    <div className="w-full h-52 sm:h-64">
<Line
  data={scansByHourData}
  options={{
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: hasPeakData,
        callbacks: { label: (ctx) => `Logins: ${ctx.parsed.y}` },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        min: 0,
        max: hasPeakData ? undefined : 5,
        ticks: { font: { size: 10 }, color: "#9CA3AF", stepSize: 1, precision: 0 },
        grid: { color: "#F3F4F6" },
      },
      x: {
        ticks: {
          font: { size: 9 },
          color: "#9CA3AF",
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12,
        },
        grid: { display: false },
      },
    },
  }}
/>
    </div>
  </div>

<div className="w-full lg:w-80 bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
  <p className="text-xs font-medium text-gray-900 mb-1">
    Transaction Type Breakdown
  </p>

  <div className="flex-1 flex justify-center items-center">
    <div className="w-56 h-56"> {/* increase size here */}
      <Doughnut data={topupsVsDeductionsData} options={pieOptions} />
    </div>
  </div>
</div>




</div>
</div>

  );
};

const KpiCard = ({ title, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4">
    <p className="text-xs text-gray-500">{title}</p>
    <p className={`text-lg font-semibold mt-0.5 ${color}`}>{value}</p>
  </div>
);

export default PrepaidAnalytical;