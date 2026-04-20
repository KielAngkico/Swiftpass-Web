import React, { useEffect, useState, useMemo } from "react";
import api from "../../../api";
import { generateAnalyticsPDF } from "../../../utils/analyticalReport";
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
import { Line, Pie, Doughnut } from "react-chartjs-2";
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

const EMPTY_PIE_DATA = {
  labels: ["No Data"],
  datasets: [{ data: [1], backgroundColor: ["#E5E7EB"], borderWidth: 0 }],
};

const EMPTY_PIE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
  },
};

const padDataArray = (labels, data) => {
  const padded = Array(labels.length).fill(0);
  data.forEach((value, idx) => {
    if (idx < padded.length) padded[idx] = value;
  });
  return padded;
};

const PIE_COLORS = ["#10B981", "#6366F1", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6"];

const SubscriptionAnalytical = () => {
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
        const params = { admin_id: adminId, filter_type: filterType };
        if (filterType === "custom") {
          params.start_date = startDate;
          params.end_date = endDate;
        }
        const { data } = await api.get("/api/subscription-activity-analytics", { params });
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
      const filename = await generateAnalyticsPDF(analyticsData, filterData);
      showToast({ message: `PDF generated: ${filename}`, type: "success" });
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
        totalTransactions: 0,
        peakHour: "—",
        revenueCard: { labels: [], values: [] },
        transactionTypeBreakdown: { labels: [], values: [] },
        peakHourAnalysis: { labels: [], values: [] },
        revenueByMembershipType: { labels: [], values: [] },
        currentlyInside: [],
        topMembers: [],
      };
    }

    const revenueCardLabels = analyticsData.revenueCard?.labels || [];
    const transactionLabels = analyticsData.transactionTypeBreakdown?.labels || [];
    const peakLabels = analyticsData.peakHourAnalysis?.labels || [];
    const revenueByTypeLabels = analyticsData.revenueByMembershipType?.labels || [];

    return {
      totalRevenue: analyticsData.summary?.totalRevenue || 0,
      membersInside: analyticsData.summary?.membersInside || 0,
      dayPassInside: analyticsData.summary?.dayPassInside || 0,
      totalTransactions: analyticsData.summary?.totalTransactions || 0,
      peakHour: analyticsData.summary?.peakHour || "—",
      revenueCard: {
        labels: revenueCardLabels,
        values: padDataArray(revenueCardLabels, analyticsData.revenueCard?.values || []),
      },
      transactionTypeBreakdown: {
        labels: transactionLabels,
        values: padDataArray(transactionLabels, analyticsData.transactionTypeBreakdown?.amounts || []),
      },
      peakHourAnalysis: {
        labels: peakLabels,
        values: padDataArray(peakLabels, analyticsData.peakHourAnalysis?.values || []),
      },
      revenueByMembershipType: {
        labels: revenueByTypeLabels,
        values: padDataArray(revenueByTypeLabels, analyticsData.revenueByMembershipType?.values || []),
      },
      currentlyInside: analyticsData.currentlyInside || [],
      topMembers: analyticsData.topMembers || [],
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
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 8, boxHeight: 8, padding: 8, font: { size: 10 } },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return ` ${context.label}: ${pct}%`;
          },
        },
      },
    },
  };

  const hasRevenueCard = sampleData.revenueCard.values.some((v) => v > 0);
  const hasTransaction = sampleData.transactionTypeBreakdown.values.some((v) => v > 0);
  const hasRevenueByType = sampleData.revenueByMembershipType.values.some((v) => v > 0);
  const hasPeakData = sampleData.peakHourAnalysis.values.some((v) => v > 0);

  const revenueCardData = hasRevenueCard
    ? { labels: sampleData.revenueCard.labels, datasets: [{ data: sampleData.revenueCard.values, backgroundColor: ["#10B981", "#6366F1"], borderWidth: 0 }] }
    : EMPTY_PIE_DATA;

  const transactionBreakdownData = hasTransaction
    ? { labels: sampleData.transactionTypeBreakdown.labels, datasets: [{ data: sampleData.transactionTypeBreakdown.values, backgroundColor: ["#10B981", "#6366F1", "#F59E0B", "#8B5CF6"], borderWidth: 0 }] }
    : EMPTY_PIE_DATA;

  const revenueByTypeData = hasRevenueByType
    ? { labels: sampleData.revenueByMembershipType.labels, datasets: [{ data: sampleData.revenueByMembershipType.values, backgroundColor: PIE_COLORS, borderWidth: 0 }] }
    : EMPTY_PIE_DATA;

  const peakLineData = {
    labels: hasPeakData ? sampleData.peakHourAnalysis.labels : Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: "Check-ins",
        data: hasPeakData ? sampleData.peakHourAnalysis.values : Array(24).fill(0),
        fill: true,
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        borderColor: hasPeakData ? "#8B5CF6" : "#D1D5DB",
        tension: 0.4,
        pointRadius: hasPeakData ? 4 : 0,
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard title="Total Revenue" value={`₱${sampleData.totalRevenue.toLocaleString()}`} color="text-green-600" />
        <KpiCard title="Members Inside" value={sampleData.membersInside} color="text-blue-600" />
        <KpiCard title="Day Pass Guests" value={sampleData.dayPassInside} color="text-amber-600" />
        <KpiCard title="Total Transactions" value={sampleData.totalTransactions} color="text-purple-600" />
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
                  key={member.rfidTag || i}
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
                  <p className="text-[10px] text-gray-500">Visits: {member.visitCount}</p>
                  <p className="text-[10px] text-gray-400">{member.rfidTag}</p>
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
              {sampleData.currentlyInside.length}
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
                  sampleData.currentlyInside.map((member, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">{member.full_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] border ${
                          member.visitor_type === "Member"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}>
                          {member.visitor_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(member.entryTime).toLocaleString("en-US", {
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

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-900 mb-3">Peak Hour Analysis (24 Hours)</p>
        {!hasPeakData && <p className="text-xs text-gray-400 mb-2">No check-in data available for this period</p>}
        <div className="w-full h-52 sm:h-64">
          <Line
            data={peakLineData}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <MiniPieCard title="Revenue Breakdown" hasData={hasRevenueCard}>
          <Pie data={revenueCardData} options={hasRevenueCard ? pieOptions : EMPTY_PIE_OPTIONS} />
        </MiniPieCard>
        <MiniPieCard title="Revenue by Membership Type" hasData={hasRevenueByType}>
          <Pie data={revenueByTypeData} options={hasRevenueByType ? pieOptions : EMPTY_PIE_OPTIONS} />
        </MiniPieCard>
        <MiniPieCard title="Transaction Breakdown" hasData={hasTransaction}>
          <Doughnut data={transactionBreakdownData} options={hasTransaction ? pieOptions : EMPTY_PIE_OPTIONS} />
        </MiniPieCard>
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

const MiniPieCard = ({ title, hasData, children }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
    <p className="text-xs font-medium text-gray-900 mb-1">{title}</p>
    {!hasData && <p className="text-[11px] text-gray-400 mb-2">No data available</p>}
    <div className="w-full h-40">{children}</div>
  </div>
);

export default SubscriptionAnalytical;