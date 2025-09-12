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
  <div className="bg-white p-4 rounded shadow text-center">
    <h2 className="text-sm text-gray-500">{title}</h2>
    <p className="text-xl font-bold text-indigo-600">{value}</p>
  </div>
);

const SubscriptionActAnalytics = () => {
  const [loginData, setLoginData] = useState([]);
  const [hourlyStats, setHourlyStats] = useState([]);
  const [mostActiveMembers, setMostActiveMembers] = useState([]);
  const [peakHour, setPeakHour] = useState("—");
  const [range, setRange] = useState("all");
  const [totalLogins, setTotalLogins] = useState(0);

  const [adminId, setAdminId] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/auth-status");
        console.log("📥 SubscriptionActAnalytics user:", data);

        if (!data.isAuthenticated || !data.user) {
          throw new Error("Not authenticated");
        }
        setAdminId(data.user.adminId);
      } catch (err) {
        console.error("❌ Failed to fetch user in SubscriptionActAnalytics:", err);
        setAdminId(null);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!adminId) return;
    const fetchActivityAnalytics = async () => {
      try {
        const { data } = await api.get("/api/prepaid-activity-analytics", {
          params: { admin_id: adminId, range, system_type: "subscription" },
        });

        setTotalLogins(data.total_logins || 0);
        setLoginData(data.entry_logs || []);
        setHourlyStats(data.scans_by_hour || []);
        setPeakHour(data.peak_hour || "—");
        setMostActiveMembers(data.most_active_members || []);
      } catch (err) {
        console.error("❌ Failed to fetch subscription analytics:", err);
      }
    };
    fetchActivityAnalytics();
  }, [adminId, range]);

  const chartData = {
    labels: hourlyStats.map((d) => `${d.hour}:00`),
    datasets: [
      {
        label: "Logins",
        data: hourlyStats.map((d) => d.count),
        borderColor: "#4F46E5",
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
      x: { title: { display: true, text: "Hour" } },
      y: { beginAtZero: true, title: { display: true, text: "Logins" }, ticks: { precision: 0 } },
    },
  };

  return (
    <div className="p-6 bg-gray-100 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">📊 Subscription Activity Analytics</h1>

      {/* Range Buttons */}
      <div className="flex gap-2">
        {["today", "yesterday", "last-7-days", "all"].map((label) => (
          <button
            key={label}
            className={`px-4 py-1 rounded text-sm font-medium shadow-sm ${
              range === label ? "bg-indigo-600 text-white" : "bg-white border text-gray-700"
            }`}
            onClick={() => setRange(label)}
          >
            {label.replace("-", " ").toUpperCase()}
          </button>
        ))}
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KPI title="Total Members Inside" value={loginData.filter((log) => log.status === "inside").length} />
        <KPI title="Total Logins" value={totalLogins} />
        <KPI title="Peak Hour" value={peakHour} />
      </div>

      {/* Members Currently Inside */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">🟢 Members Currently Inside</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
          {loginData.filter((log) => log.status === "inside").map((member, index) => (
            <li
              key={index}
              className="bg-green-50 px-4 py-2 rounded shadow flex justify-between items-center"
            >
              <span>{member.full_name}</span>
              <span className="font-mono text-green-700">{member.rfid_tag}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Chart and Top 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* 📈 Line Chart */}
        <div className="bg-white p-4 rounded shadow h-full">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">📈 Logins by Hour</h2>
          {hourlyStats.length === 0 ? (
            <p className="text-gray-400 italic text-sm">No login data available.</p>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>

        {/* 🏅 Top 3 Members */}
        <div className="bg-white p-4 rounded shadow h-full">
          <h2 className="text-lg font-semibold mb-4">🏆 Top 3 Most Active Members</h2>
          <div className="grid grid-cols-3 gap-4 text-center items-end mt-12">
            {[1, 0, 2].map((i) =>
              mostActiveMembers[i] ? (
                <div
                  key={i}
                  className={`p-4 rounded shadow ${
                    i === 0
                      ? "bg-yellow-100 text-yellow-700 scale-110 z-10"
                      : i === 1
                      ? "bg-gray-200 text-gray-700"
                      : "bg-orange-100 text-orange-700"
                  } flex flex-col items-center gap-2`}
                >
                  <div className="text-3xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
                  <img
                    src={`http://localhost:5000/${mostActiveMembers[i].profile_image_url || "default-profile.png"}`}
                    alt={mostActiveMembers[i].full_name}
                    className="w-20 h-20 rounded-full object-cover border"
                  />
                  <p className="font-semibold">{mostActiveMembers[i].full_name}</p>
                  <p className="text-sm">Visits: {mostActiveMembers[i].login_count}</p>
                  {mostActiveMembers[i].subscription_type && (
                    <>
                      <p className="text-xs italic text-gray-600">
                        Plan: {mostActiveMembers[i].subscription_type}
                      </p>
                      <p className="text-xs text-gray-500">
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

      {/* 🧾 Member Activity Logs */}
      <div className="bg-white rounded shadow overflow-hidden">
        <h2 className="text-lg font-semibold px-6 py-4 border-b">🧾 Member Activity Logs</h2>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto scroll-smooth">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-800 text-white uppercase text-xs">
              <tr>
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Profile</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">RFID</th>
                <th className="px-6 py-3">Entry</th>
                <th className="px-6 py-3">Exit</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loginData.map((log, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-6 py-4">{index + 1}</td>
                  <td className="px-6 py-4">
                    {log.profile_image_url ? (
                      <img
                        src={`http://localhost:5000/${log.profile_image_url}`}
                        alt={log.full_name}
                        onError={(e) => {
                          e.target.src = "/default-profile.png";
                        }}
                        className="w-10 h-10 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                        N/A
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">{log.full_name}</td>
                  <td className="px-6 py-4 font-mono">{log.rfid_tag}</td>
                  <td className="px-6 py-4">{log.entry_time || "—"}</td>
                  <td className="px-6 py-4">{log.exit_time || "—"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        log.status === "inside"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
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
