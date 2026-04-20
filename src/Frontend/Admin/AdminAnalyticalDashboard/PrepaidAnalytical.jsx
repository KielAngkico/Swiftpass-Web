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

const PrepaidAnalytical = ({ adminUser }) => {
  const [adminId, setAdminId] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

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
        const params = { admin_id: adminId, system_type: "prepaid_entry" };
        if (filterType === "custom") {
          params.start_date = startDate;
          params.end_date = endDate;
        } else if (filterType === "today") {
          params.range = "today";
        } else {
          params.range = "all";
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
      topMembers: analyticsData.most_active_members || [],
      transaction_breakdown: analyticsData.transaction_breakdown || {},
    };
  }, [analyticsData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, padding: 10, font: { size: 10 } } },
    },
  };
const pieOptions = {
  ...chartOptions,
  maintainAspectRatio: false,
  plugins: {
    ...chartOptions.plugins,
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

  const topupsVsDeductionsData = {
    labels: Object.keys(sampleData.transaction_breakdown || {}),
    datasets: [
      {
        data: Object.values(sampleData.transaction_breakdown || {}),
        backgroundColor: ["#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899"],
        borderWidth: 0,
      },
    ],
  };

  const scansByHourData = {
    labels: sampleData.scansByHour.labels,
    datasets: [
      {
        label: "Logins",
        data: sampleData.scansByHour.values,
        fill: true,
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        borderColor: "#8B5CF6",
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#8B5CF6",
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

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-center">
        <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <label className="text-xs text-gray-500">Filter:</label>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              if (e.target.value !== "custom") {
                setStartDate("");
                setEndDate("");
              }
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                max={today}
                disabled={!startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </>
          )}
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
        <KpiCard title="Members Inside" value={sampleData.membersInside} color="text-blue-600" />
        <KpiCard title="Day Pass Inside" value={sampleData.dayPassInside} color="text-indigo-600" />
        <KpiCard title="Total Logins" value={sampleData.totalLogins} color="text-purple-600" />
        <KpiCard title="Total Transactions" value={sampleData.totalTransactions} color="text-amber-600" />
        <KpiCard title="Peak Hour" value={sampleData.peakHour} color="text-gray-700" />
      </div>

      <div className="flex items-stretch gap-5">
        <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-medium text-gray-900">Top 3 Most Active Members</p>
            <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
              {sampleData.topMembers.length} members
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 flex-1">
            {[1, 0, 2].map((i) => {
              const member = sampleData.topMembers[i];
              return member ? (
                <div
                  key={member.rfid_tag || i}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center ${
                    i === 0
                      ? "bg-yellow-50 border-yellow-200"
                      : i === 1
                      ? "bg-gray-50 border-gray-200"
                      : "bg-orange-50 border-orange-200"
                  }`}
                >
                  <p className={`text-xs font-medium ${
                    i === 0 ? "text-yellow-700" : i === 1 ? "text-gray-500" : "text-orange-700"
                  }`}>
                    {i === 0 ? "1st" : i === 1 ? "2nd" : "3rd"}
                  </p>
                  <img
                    src={member.profile_image_url || "https://swiftpasstech.com/uploads/members/default.jpg"}
                    alt={member.full_name}
                    className="w-14 h-14 object-cover rounded-full border border-gray-200"
                    onError={(e) => { e.currentTarget.src = "https://swiftpasstech.com/uploads/members/default.jpg"; }}
                  />
                  <p className="text-xs font-medium text-gray-800 leading-tight">{member.full_name}</p>
                  <p className="text-[10px] text-gray-500">Visits: {member.login_count}</p>
                  <p className="text-[10px] text-gray-400">{member.rfid_tag}</p>
                </div>
              ) : (
                <div
                  key={i}
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
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">Currently Inside</p>
            <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
              {sampleData.totalInside}
            </span>
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
                {sampleData.currentlyInside.length > 0 ? (
                  sampleData.currentlyInside.map((person, idx) => (
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
                        <p className="text-xs text-gray-400">No one is currently inside</p>
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
          ...chartOptions,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { font: { size: 10 }, color: "#9CA3AF" },
              grid: { color: "#F3F4F6" },
            },
            x: {
              ticks: { font: { size: 10 }, color: "#9CA3AF" },
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

  <div className="relative w-full h-[220px]">
    <Doughnut data={topupsVsDeductionsData} options={pieOptions} />
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