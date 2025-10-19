import React, { useEffect, useState } from "react";
import api from "../../../api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { generateSubscriptionTransactionsPDF } from "../../../utils/transactionsReport";

const KpiBox = ({ title, value, color }) => (
  <div className="bg-white shadow p-2 rounded text-center">
    <h3 className="text-[10px] sm:text-xs text-gray-600 truncate">{title}</h3>
    <p className={`text-sm sm:text-base font-bold ${color}`}>{value}</p>
  </div>
);

const SubscriptionTransactions = () => {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user) throw new Error("Not authenticated");
        setUser(data.user);
      } catch {
        window.location.href = "/login";
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user?.id && !user?.adminId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const adminId = user.adminId || user.id;
        const [txnRes, memberRes] = await Promise.all([
          api.get(`/api/get-admin-transactions/${adminId}`),
          api.get(`/api/get-members?admin_id=${adminId}`),
        ]);
        setTransactions(txnRes.data || []);
        setFiltered(txnRes.data || []);
        setMembers(memberRes.data?.members || []);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    const merged = transactions.map((txn) => {
      const match = members.find((m) => m.rfid_tag === txn.rfid_tag);
      return { ...txn, profile_image_url: match?.profile_image_url || null };
    });

    let filteredData = merged;

    if (search)
      filteredData = filteredData.filter((txn) =>
        txn.member_name?.toLowerCase().includes(search.toLowerCase())
      );

    if (filterMethod !== "All")
      filteredData = filteredData.filter((txn) => txn.payment_method === filterMethod);

    if (filterType !== "All")
      filteredData = filteredData.filter((txn) => txn.transaction_type === filterType);

    if (startDate)
      filteredData = filteredData.filter(
        (txn) => new Date(txn.transaction_date) >= startDate
      );

    if (endDate)
      filteredData = filteredData.filter(
        (txn) => new Date(txn.transaction_date) <= endDate
      );

    setFiltered(filteredData);
  }, [search, filterMethod, filterType, transactions, members, startDate, endDate]);

  const handleDownloadPDF = async () => {
    if (filtered.length === 0) {
      setNotification({ message: "No transaction data to download", type: "error" });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      setNotification({ message: "Generating PDF...", type: "info" });

      const { data: meData } = await api.get("/api/me");
      if (!meData.authenticated || !meData.user) {
        throw new Error("Not authenticated");
      }

      const currentAdminId = meData.user.adminId || meData.user.id;
      if (!currentAdminId) throw new Error("Missing admin ID");

      const { data: gymInfo } = await api.get(`/api/gym-info/${currentAdminId}`);

      const transactionsData = {
        transactions: filtered,
        total_revenue: totalRevenue,
        total_transactions: filtered.length,
        cash_revenue: cashRevenue,
        cashless_revenue: gcashRevenue
      };

      const filterData = {
        gym_name: gymInfo.gym_name,
        owner_name: gymInfo.admin_name,
        start_date: startDate ? startDate.toISOString().split("T")[0] : null,
        end_date: endDate ? endDate.toISOString().split("T")[0] : null,
        filter_type: filterType !== "All" ? filterType : null,
        filter_method: filterMethod !== "All" ? filterMethod : null,
        search_term: search || null
      };

      const filename = generateSubscriptionTransactionsPDF(transactionsData, filterData);

      setNotification({
        message: `PDF generated successfully: ${filename}`,
        type: "success"
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      setNotification({
        message: "Failed to generate PDF",
        type: "error"
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const totalRevenue = transactions.reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
  const totalTransactions = filtered.length;
  const cashRevenue = filtered
    .filter((txn) => txn.payment_method === "Cash")
    .reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
  const gcashRevenue = filtered
    .filter((txn) => txn.payment_method === "GCash")
    .reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);

  return (
    <div className="min-h-screen w-full bg-white p-2 flex flex-col space-y-3">
      {notification && (
        <div
          className={`p-3 rounded text-sm ${
            notification.type === "success"
              ? "bg-green-100 text-green-800 border border-green-300"
              : notification.type === "info"
              ? "bg-blue-100 text-blue-800 border border-blue-300"
              : "bg-red-100 text-red-800 border border-red-300"
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="flex justify-between items-start">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold">Sales Report</h1>
        <p className="text-xs text-gray-500">Overview of your transactions</p>
      </div>

        <button
          onClick={handleDownloadPDF}
          disabled={filtered.length === 0}
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

      {/* KPI Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <KpiBox title="💰 Total Revenue" value={`₱${totalRevenue.toFixed(2)}`} color="text-green-600" />
        <KpiBox title="📄 Total Transactions" value={totalTransactions} color="text-blue-600" />
        <KpiBox title="💵 Cash Revenue" value={`₱${cashRevenue.toFixed(2)}`} color="text-teal-600" />
        <KpiBox title="📲 Cashless" value={`₱${gcashRevenue.toFixed(2)}`} color="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input
          type="text"
          placeholder="🔍 Search Member"
          className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm placeholder:text-gray-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="All">All Types</option>
          <option value="new_membership">New Membership</option>
          <option value="renewal">Renewal</option>
          <option value="product_purchase">Others</option>
        </select>

        <select
          className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm"
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
        >
          <option value="All">All Methods</option>
          <option value="Cash">Cash</option>
          <option value="GCash">Cashless</option>
        </select>

        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          maxDate={new Date()}
          dateFormat="yyyy-MM-dd"
          className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm"
          placeholderText="Start Date"
          isClearable
        />

        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          minDate={startDate}
          maxDate={new Date()}
          dateFormat="yyyy-MM-dd"
          className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm"
          placeholderText="End Date"
          isClearable
        />
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-[10px] sm:text-xs text-left border-collapse">
          <thead className="bg-gray-700 text-white uppercase text-[9px] sm:text-[10px]">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Profile</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((txn, index) => (
              <tr key={txn.transaction_id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-2">{index + 1}</td>
                <td className="px-3 py-2">
                  {txn.profile_image_url ? (
                    <img
                      src={`http://localhost:5000/${txn.profile_image_url}`}
                      alt={txn.member_name}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center text-[8px] text-gray-500">
                      N/A
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 font-medium text-gray-800">{txn.member_name}</td>
                <td className="px-3 py-2">{txn.transaction_type}</td>
                <td className="px-3 py-2">{txn.plan_name || "N/A"}</td>
                <td className="px-3 py-2">₱{parseFloat(txn.amount).toFixed(2)}</td>
                <td className="px-3 py-2">{txn.payment_method}</td>
                <td className="px-3 py-2">{txn.staff_name}</td>
                <td className="px-3 py-2">{new Date(txn.transaction_date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubscriptionTransactions;
