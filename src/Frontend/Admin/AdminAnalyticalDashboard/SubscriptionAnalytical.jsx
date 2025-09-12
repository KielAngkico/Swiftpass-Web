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
  Filler,
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
  ChartDataLabels,
  Filler
);

const SubscriptionAnalytical = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("today");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);

        
        const { data: resUser } = await api.get("/api/auth-status");
        if (!resUser?.isAuthenticated || !resUser?.user) return;
        setUser(resUser.user);

        const adminId = resUser.user?.id;
        if (!adminId) return;

      
        const { data: resAnalytics } = await api.get("/api/prepaid-analytics", {
          params: { admin_id: adminId, range, system_type: "subscription" },
        });

        setAnalytics(resAnalytics);
      } catch (err) {
        console.error("❌ Error fetching subscription analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [range]);

  if (loading || !analytics) {
    return <div className="p-6 text-gray-600">Loading subscription analytics...</div>;
  }

 
  const scanLineData = {
    labels: analytics?.scans_by_hour?.map((item) => `${item.hour}:00`) || [],
    datasets: [
      {
        label: "Subscription Logins",
        data: analytics?.scans_by_hour?.map((item) => item.count) || [],
        borderColor: "#4F46E5",
        backgroundColor: "rgba(79, 70, 229, 0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  
  const actionsData = {
    labels: ["New Memberships", "Renewals"],
    datasets: [
      {
        data: [
          analytics?.topups_vs_deductions?.deductions || 0, 
          analytics?.topups_vs_deductions?.topups || 0,    
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
          const total = context.chart.data.datasets[0].data.reduce(
            (sum, val) => sum + val,
            0
          );
          const percentage =
            total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
          return `${percentage}%`;
        },
        color: "#fff",
        font: { weight: "bold", size: 12 },
      },
      legend: { position: "top" },
    },
  };

  return (
 

    
    <div className="p-6 flex h-screen bg-gray-100 overflow-y-auto flex-col space-y-3">
      {/* Header and Filter */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Subscription Analytical Dashboard</h1>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="px-3 py-1 w-36 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last-7-days">Last 7 Days</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Active Members Inside" value={analytics.active_members_inside} color="text-blue-600" />
        <KpiCard
          title="Subscription Revenue Today"
          value={`₱${Number(analytics?.prepaid_revenue_today ?? 0).toLocaleString()}`}
          color="text-green-600"
        />
        <KpiCard
          title="Total Subscription Logins"
          value={Number(analytics?.total_logins_today ?? 0)}
          color="text-purple-600"
        />
        <KpiCard title="Peak Hour" value={analytics.peak_hour} color="text-gray-700" />
      </div>

      {/* Charts */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-3/4 w-full">
          <ChartCard title="Login Trends by Hour">
            <Line data={scanLineData} options={{ maintainAspectRatio: false }} />
          </ChartCard>
        </div>
        <div className="lg:w-1/4 w-full">
          <ChartCard title="New vs Renewal Breakdown">
            <Pie data={actionsData} options={pieOptions} />
          </ChartCard>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white p-4 rounded shadow max-h-[20rem] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Subscription Events</h2>
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="text-gray-600 border-b">
              <th className="pb-2 w-10 text-center">#</th>
              <th className="pb-2 pl-4">Member</th>
              <th className="pb-2">RFID</th>
              <th className="pb-2">Action</th>
              <th className="pb-2">Amount</th>
              <th className="pb-2">Time</th>
              <th className="pb-2">Balance After</th>
            </tr>
          </thead>
          <tbody>
            {analytics?.recent_events?.length > 0 ? (
              analytics.recent_events.map((event, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2 text-center text-gray-500">{index + 1}</td>
                  <td className="py-2 pl-4">{event.name}</td>
                  <td className="py-2">{event.rfid}</td>
                  <td className="py-2">{event.action}</td>
                  <td className="py-2">₱{event.amount}</td>
                  <td className="py-2">{event.time}</td>
                  <td className="py-2">₱{event.balance}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="py-4 text-center text-gray-500">
                  No recent subscription events available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, color }) => (
  <div className="bg-white p-4 rounded shadow">
    <h2 className="text-sm text-gray-500">{title}</h2>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-white p-6 rounded shadow">
    <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
    <div className="h-64">{children}</div>
  </div>
);


export default SubscriptionAnalytical;
