import React, { useEffect, useState } from "react";
import api from "../../../api";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const KPI = ({ title, value }) => (
  <div className="bg-white p-2 rounded shadow text-center text-xs sm:text-sm">
    <p className="text-gray-500 truncate">{title}</p>
    <p className="font-bold text-indigo-600 text-sm sm:text-base">{value}</p>
  </div>
);

const SubscriptionActAnalytics = () => {
  const [adminId, setAdminId] = useState(null);
  const [range, setRange] = useState("all");
  const [totalLogins, setTotalLogins] = useState(0);
  const [hourlyStats, setHourlyStats] = useState([]);
  const [peakHour, setPeakHour] = useState("—");
  const [mostActiveMembers, setMostActiveMembers] = useState([]);
  const [loginData, setLoginData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user) throw new Error();
        setAdminId(data.user.adminId);
      } catch {
        setError("Failed to authenticate");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!adminId) return;
    const fetchAnalytics = async () => {
      try {
        const { data } = await api.get("/api/prepaid-activity-analytics", {
          params: { admin_id: adminId, range, system_type: "subscription" },
        });
        setTotalLogins(data.total_logins || 0);
        setHourlyStats(data.scans_by_hour || []);
        setPeakHour(data.peak_hour || "—");
        setMostActiveMembers(data.most_active_members || []);
        setLoginData(data.entry_logs || []);
      } catch {
        setError("Failed to fetch subscription analytics");
      }
    };
    fetchAnalytics();
  }, [adminId, range]);

  const chartData = {
    labels: hourlyStats.map((d) => `${d.hour}:00`),
    datasets: [
      {
        label: "Logins",
        data: hourlyStats.map((d) => d.count),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { title: { display: true, text: "Hour" }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, title: { display: true, text: "Logins" }, ticks: { precision: 0, font: { size: 10 } } },
    },
  };

  if (loading) return <p className="text-xs">Loading analytics...</p>;
  if (error) return <p className="text-red-500 text-xs">{error}</p>;

  return (
    <div className="min-h-screen w-full bg-white p-2 flex flex-col space-y-3">
      <h1 className="text-lg sm:text-xl font-semibold">Subscription Activity Analytics</h1>
      <p className="text-xs text-gray-500">Overview of subscription member activity</p>

      <div className="flex flex-wrap gap-2 text-xs">
        {["today", "yesterday", "last-7-days", "all"].map((label) => (
          <button
            key={label}
            className={`px-3 py-1 rounded text-xs font-medium ${
              range === label ? "bg-indigo-600 text-white" : "bg-white border text-gray-700"
            }`}
            onClick={() => setRange(label)}
          >
            {label.replace("-", " ").toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        <KPI title="Members Inside" value={loginData.filter((l) => l.status === "inside").length} />
        <KPI title="Total Logins" value={totalLogins} />
        <KPI title="Peak Hour" value={peakHour} />
      </div>

      <div className="bg-white p-2 sm:p-4 rounded shadow">
        <h2 className="text-sm font-semibold mb-2">🟢 Members Inside</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 text-xs">
          {loginData.filter((l) => l.status === "inside").map((m, i) => (
            <li key={i} className="bg-green-50 px-2 py-1 rounded shadow flex justify-between items-center text-[10px]">
              <span>{m.full_name}</span>
              <span className="font-mono text-green-700">{m.rfid_tag}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-2 sm:p-4 rounded shadow">
          <h2 className="text-sm font-semibold mb-2">📈 Logins by Hour</h2>
          {hourlyStats.length === 0 ? (
            <p className="text-gray-400 italic text-xs">No login data available.</p>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>

        <div className="bg-white p-2 sm:p-4 rounded shadow">
          <h2 className="text-sm font-semibold mb-2">🏆 Top 3 Most Active</h2>
          <div className="grid grid-cols-3 gap-2 text-center mt-8 text-[10px]">
            {[1, 0, 2].map((i) =>
              mostActiveMembers[i] ? (
                <div
                  key={i}
                  className={`p-2 rounded shadow flex flex-col items-center gap-1 ${
                    i === 0 ? "bg-yellow-100 text-yellow-700 scale-105 z-10" : i === 1 ? "bg-gray-200 text-gray-700" : "bg-orange-100 text-orange-700"
                  }`}
                >
                  <div className="text-xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
                  <img
                    src={`http://localhost:5000/${mostActiveMembers[i].profile_image_url || "default-profile.png"}`}
                    alt={mostActiveMembers[i].full_name}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border"
                  />
                  <p className="font-semibold">{mostActiveMembers[i].full_name}</p>
                  <p className="text-[9px]">Visits: {mostActiveMembers[i].login_count}</p>
                  {mostActiveMembers[i].subscription_type && (
                    <>
                      <p className="text-[9px] italic text-gray-600">Plan: {mostActiveMembers[i].subscription_type}</p>
                      <p className="text-[9px] text-gray-500">
                        {new Date(mostActiveMembers[i].subscription_start).toLocaleDateString()} –{" "}
                        {new Date(mostActiveMembers[i].subscription_expiry).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div key={i}></div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <h2 className="text-sm font-semibold px-2 py-2 border-b">🧾 Member Activity Logs</h2>
        <div className="overflow-x-auto max-h-[350px] overflow-y-auto scroll-smooth text-[10px] sm:text-xs">
          <table className="min-w-full text-left">
            <thead className="bg-gray-700 text-white uppercase text-[9px] sm:text-xs">
              <tr>
                <th className="px-2 py-1">#</th>
                <th className="px-2 py-1">Profile</th>
                <th className="px-2 py-1">Name</th>
                <th className="px-2 py-1">RFID</th>
                <th className="px-2 py-1">Entry</th>
                <th className="px-2 py-1">Exit</th>
                <th className="px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {loginData.map((log, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-2 py-1">{i + 1}</td>
                  <td className="px-2 py-1">
                    {log.profile_image_url ? (
                      <img
                        src={`http://localhost:5000/${log.profile_image_url}`}
                        alt={log.full_name}
                        onError={(e) => (e.target.src = "/default-profile.png")}
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center text-[8px] sm:text-xs text-gray-500">
                        N/A
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1 font-medium">{log.full_name}</td>
                  <td className="px-2 py-1 font-mono">{log.rfid_tag}</td>
                  <td className="px-2 py-1">{log.entry_time || "—"}</td>
                  <td className="px-2 py-1">{log.exit_time || "—"}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionActAnalytics;
