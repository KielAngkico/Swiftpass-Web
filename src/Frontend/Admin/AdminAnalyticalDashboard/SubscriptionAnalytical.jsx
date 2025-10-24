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
import { Line, Pie, Bar, Doughnut } from "react-chartjs-2";
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

const SubscriptionAnalytical = () => {
  const [adminId, setAdminId] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
    const { showToast } = useToast(); 
  


  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user) throw new Error("Not authenticated");
        setAdminId(data.user.adminId || data.user.id);
      } catch (err) {
        console.error(" Error fetching admin:", err);
        setError("Failed to authenticate");
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

        const { data } = await api.get("/api/analytics", { params });
        setAnalyticsData(data);
        setError(null);
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setError("Failed to load analytics");
        setAnalyticsData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [adminId, filterType, startDate, endDate]);

  const handleDownloadPDF = async () => {
    if (!analyticsData) {
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

      const filterData = {
        filter_type: filterType,
        start_date: filterType === "custom" ? startDate : undefined,
        end_date: filterType === "custom" ? endDate : undefined,
        gym_name: gymInfo.gym_name,
        owner_name: gymInfo.admin_name,
      };

      const filename = await generateAnalyticsPDF(analyticsData, filterData);

showToast({ message: `PDF generated successfully: ${filename}`, type: "success" });

    } catch (error) {
      console.error("error generating PDF:", error);
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
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: ₱${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  const revenueCardData = {
    labels: sampleData.revenueCard.labels,
    datasets: [{
      data: sampleData.revenueCard.values,
      backgroundColor: ["#10B981", "#6366F1"],
      borderWidth: 0,
    }],
  };

  const transactionBreakdownData = {
    labels: sampleData.transactionTypeBreakdown.labels,
    datasets: [{
      data: sampleData.transactionTypeBreakdown.values,
      backgroundColor: ["#10B981", "#6366F1", "#F59E0B", "#8B5CF6"],
      borderWidth: 0,
    }],
  };

  const peakHoursData = {
    labels: sampleData.peakHourAnalysis.labels,
    datasets: [{ label: "Check-ins", data: sampleData.peakHourAnalysis.values, backgroundColor: "#8B5CF6" }],
  };

  const revenueByTypeData = {
    labels: sampleData.revenueByMembershipType.labels,
    datasets: [{
      label: "Revenue",
      data: sampleData.revenueByMembershipType.values,
      backgroundColor: ["#6366F1", "#8B5CF6", "#A78BFA", "#EC4899", "#F59E0B"],
    }],
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading analytics...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-600">Error: {error}</div>;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-3 flex flex-col space-y-3 w-full min-h-screen">


      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">Analytics Dashboard</h1>
            <p className="text-xs text-gray-500">Summary of your activity and trends</p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={!analyticsData}
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
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <KpiCard title="Total Revenue" value={`₱${sampleData.totalRevenue.toLocaleString()}`} color="text-green-600" />
        <KpiCard title="Members Inside" value={sampleData.membersInside} color="text-blue-600" />
        <KpiCard title="Day Pass Guests Inside" value={sampleData.dayPassInside} color="text-amber-600" />
        <KpiCard title="Total Transactions" value={sampleData.totalTransactions} color="text-purple-600" />
        <KpiCard title="Peak Hour" value={sampleData.peakHour} color="text-gray-700" />
      </div>

      {/* Row 2: Engagement & Activity Snapshot - 60/40 split */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="lg:w-[60%] w-full">
          <div className="bg-white p-3 rounded-md shadow-sm h-full">
            <h2 className="text-sm font-semibold text-gray-800 mb-2">🏆 Top 3 Most Active Members</h2>
            <div className="grid grid-cols-3 gap-3 text-center mt-2 text-[10px]">
              {[1, 0, 2].map((i) => {
                const member = sampleData.topMembers[i];
                return member ? (
                  <div
                    key={member.rfidTag || i}
                    className={`p-3 rounded shadow flex flex-col items-center gap-2 ${
                      i === 0
                        ? "bg-yellow-100 text-yellow-700 scale-105 z-10"
                        : i === 1
                        ? "bg-gray-200 text-gray-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    <div className="text-2xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
                    <img
                      src={`http://localhost:5000/${member.profile_image_url || "default-profile.png"}`}
                      alt={member.name}
                      onError={(e) => {
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%236366F1' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='40' fill='white'%3E" + member.name.charAt(0).toUpperCase() + "%3C/text%3E%3C/svg%3E";
                      }}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white shadow"
                    />
                    <p className="font-semibold text-sm">{member.name}</p>
                    <p className="text-[10px]">Visits: {member.visitCount}</p>
                    <p className="text-[10px] italic text-gray-500">{member.rfidTag}</p>
                  </div>
                ) : (
                  <div key={i} className="p-3 rounded shadow bg-gray-50 flex items-center justify-center text-gray-400 text-xs min-h-[160px]">
                    No data
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div id="transactionTypeChart" className="lg:w-[40%] w-full">
          <ChartCard title="Transaction Type Breakdown">
            <Doughnut data={transactionBreakdownData} options={pieOptions} />
          </ChartCard>
        </div>
      </div>

      {/* Row 3: Revenue Insights - 40/60 split */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div id="revenueChart" className="lg:w-[40%] w-full">
          <ChartCard title="Revenue Breakdown (Cash vs Cashless)">
            <Pie data={revenueCardData} options={pieOptions} />
          </ChartCard>
        </div>
        <div id="membershipTypeChart" className="lg:w-[60%] w-full">
          <ChartCard title="Revenue by Membership Type">
            <Bar data={revenueByTypeData} options={chartOptions} />
          </ChartCard>
        </div>
      </div>

      {/* Row 4: Temporal Patterns - 60/40 split */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div id="peakHourChart" className="lg:w-[60%] w-full">
          <ChartCard title="Peak Hour Analysis (24 Hours)">
            <Line 
              data={{
                labels: sampleData.peakHourAnalysis.labels,
                datasets: [
                  {
                    label: "Check-ins",
                    data: sampleData.peakHourAnalysis.values,
                    fill: true,
                    backgroundColor: "rgba(139, 92, 246, 0.2)",
                    borderColor: "#8B5CF6",
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: "#8B5CF6",
                  },
                ],
              }}
              options={{
                ...chartOptions,
                scales: {
                  y: { beginAtZero: true },
                },
              }}
            />
          </ChartCard>
        </div>

        <div className="lg:w-[40%] w-full">
          <div className="bg-white rounded-md shadow-sm p-3 h-full">
            <h2 className="text-sm font-semibold text-gray-800 mb-2">
              👥 Currently Inside ({sampleData.currentlyInside.length})
            </h2>
            <div className="overflow-y-auto max-h-[250px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Name</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">RFID</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Type</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Entry</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleData.currentlyInside.length > 0 ? (
                    sampleData.currentlyInside.map((member, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="py-2 px-3 text-xs text-gray-800">{member.name}</td>
                        <td className="py-2 px-3 text-xs text-gray-600">{member.rfidTag}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-medium ${
                            member.visitorType === "Member" 
                              ? "bg-blue-100 text-blue-700" 
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {member.visitorType}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-600">
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
                      <td colSpan="4" className="py-4 text-center text-gray-500 text-xs">
                        No one is currently inside
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, color }) => (
  <div className="bg-white p-3 rounded-md shadow-sm">
    <h2 className="text-xs text-gray-500">{title}</h2>
    <p className={`text-lg font-bold ${color}`}>{value}</p>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-white p-3 rounded-md shadow-sm h-full">
    <h2 className="text-sm font-semibold text-gray-800 mb-2">{title}</h2>
    <div className="w-full h-52 sm:h-64">{children}</div>
  </div>
);

export default SubscriptionAnalytical;
