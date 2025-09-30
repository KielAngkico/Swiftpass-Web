import React, { useEffect, useState } from "react";
import api from "../../../api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  ChartDataLabels
);

const PrepaidAnalytical = ({adminUser}) => {
  const [analytics, setAnalytics] = useState(null);
  const [range, setRange] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

useEffect(() => {
  if (!adminUser?.id) return;
  
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const admin_id = adminUser.role === "admin" ? adminUser.id : adminUser.adminId;
      const { data } = await api.get("/api/prepaid-analytics", {
        params: { admin_id, range },
      });
      setAnalytics(data);
    } catch {
      setError("Failed to load prepaid analytics");
    } finally {
      setLoading(false);
    }
  };
  fetchAnalytics();
}, [adminUser, range]);
  if (loading) return <div className="p-2 text-gray-600">Loading...</div>;
  if (error) return <div className="p-2 text-red-600">{error}</div>;
  if (!analytics) return <div className="p-2 text-gray-600">No data available.</div>;

  const scanLineData = {
    labels: analytics.scans_by_hour?.map((i) => `${i.hour}:00`) || [],
    datasets: [
      {
        label: "Prepaid Logins",
        data: analytics.scans_by_hour?.map((i) => i.count) || [],
        borderColor: "#4F46E5",
        backgroundColor: "rgba(79, 70, 229, 0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const actionsData = {
    labels: ["Top-Ups", "Session Deductions"],
    datasets: [
      {
        data: [
          analytics.topups_vs_deductions?.topups || 0,
          analytics.topups_vs_deductions?.deductions || 0,
        ],
        backgroundColor: ["#10B981", "#F59E0B"],
      },
    ],
  };

  const pieOptions = {
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce((s, v) => s + v, 0);
          return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0.0%";
        },
        color: "#fff",
        font: { weight: "bold", size: 12 },
      },
      legend: { position: "top" },
    },
  };

  return (
    <div className="p-2 flex flex-col space-y-3 w-full min-h-screen">
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1">
        <h1 className="text-xl font-semibold text-gray-800">Prepaid Analytical Dashboard</h1>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="px-2 py-1 w-full sm:w-32 border border-gray-300 rounded-md text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last-7-days">Last 7 Days</option>
        </select>
      </div>
      <p className="text-gray-500 text-[11px]">Overview of prepaid logins, revenue, and activity trends</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <KpiCard title="Active Members Inside" value={analytics.active_members_inside} color="text-blue-600" />
        <KpiCard title="Prepaid Revenue Today" value={`₱${Number(analytics?.prepaid_revenue_today ?? 0).toLocaleString()}`} color="text-green-600" />
        <KpiCard title="Total Prepaid Logins" value={Number(analytics?.total_logins_today ?? 0)} color="text-purple-600" />
        <KpiCard title="Peak Hour" value={analytics.peak_hour} color="text-gray-700" />
      </div>

      <div className="flex flex-col lg:flex-row gap-2">
        <div className="flex-1">
          <ChartCard title="Login Trends by Hour"><Line data={scanLineData} options={{ maintainAspectRatio: false }} /></ChartCard>
        </div>
        <div className="lg:w-1/3 w-full">
          <ChartCard title="Top-Up vs Session Breakdown"><Pie data={actionsData} options={pieOptions} /></ChartCard>
        </div>
      </div>

      <div className="bg-white p-2 rounded-md shadow-sm max-h-[18rem] overflow-y-auto">
        <h2 className="text-xs font-semibold text-gray-700 mb-1">Recent Prepaid Events</h2>
        <table className="w-full text-[11px] border-collapse">
          <thead className="bg-gray-700 text-white sticky top-0">
            <tr>
              <th className="p-1 w-6 text-center">#</th>
              <th className="p-1 text-left">Member</th>
              <th className="p-1">Action</th>
              <th className="p-1">Amount</th>
              <th className="p-1">Time</th>
              <th className="p-1">Balance After</th>
            </tr>
          </thead>
          <tbody>
            {analytics?.recent_events?.length ? analytics.recent_events.map((e, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-1 text-center text-gray-500">{i + 1}</td>
                <td className="p-1">{e.name}</td>
                <td className="p-1">{e.action}</td>
                <td className="p-1">₱{e.amount}</td>
                <td className="p-1">{e.time}</td>
                <td className="p-1">₱{e.balance}</td>
              </tr>
            )) : (
              <tr><td colSpan="7" className="p-2 text-center text-gray-500 text-xs">No recent prepaid events available.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, color }) => (
  <div className="bg-white p-2 rounded-md shadow-sm">
    <h2 className="text-xs text-gray-500">{title}</h2>
    <p className={`text-lg font-bold ${color}`}>{value}</p>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-white p-2 rounded-md shadow-sm">
    <h2 className="text-sm font-semibold text-gray-800 mb-1">{title}</h2>
    <div className="w-full h-52 sm:h-64">{children}</div>
  </div>
);

export default PrepaidAnalytical;
