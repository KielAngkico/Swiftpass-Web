import React, { useEffect, useState } from "react";
import api from "../../../api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { generatePrepaidTransactionsPDF } from "../../../utils/transactionsReport";
import { useToast } from "../../../components/ToastManager";

const KpiBox = ({ title, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1">
    <p className="text-xs text-gray-500">{title}</p>
    <p className={`text-base font-semibold ${color}`}>{value}</p>
  </div>
);

const PrepaidTransactions = () => {
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
  const { showToast } = useToast();

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
      return { ...txn, profile_image_url: match?.member_image || null };
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
      filteredData = filteredData.filter((txn) => new Date(txn.transaction_date) >= startDate);
    if (endDate)
      filteredData = filteredData.filter((txn) => new Date(txn.transaction_date) <= endDate);

    setFiltered(filteredData);
  }, [search, filterMethod, filterType, transactions, members, startDate, endDate]);

  const handleDownloadPDF = async () => {
    if (filtered.length === 0) {
      showToast({ message: "No transaction data to download", type: "error" });
      return;
    }
    try {
      showToast({ message: "Generating PDF...", type: "info" });
      const { data: meData } = await api.get("/api/me");
      if (!meData.authenticated || !meData.user) throw new Error("Not authenticated");
      const currentAdminId = meData.user.adminId || meData.user.id;
      if (!currentAdminId) throw new Error("Missing admin ID");
      const { data: gymInfo } = await api.get(`/api/gym-info/${currentAdminId}`);
      const transactionsData = {
        transactions: filtered,
        total_revenue: totalRevenue,
        total_transactions: filtered.length,
        cash_revenue: cashRevenue,
        cashless_revenue: gcashRevenue,
      };
      const filterData = {
        gym_name: gymInfo.gym_name,
        owner_name: gymInfo.admin_name,
        start_date: startDate ? startDate.toISOString().split("T")[0] : null,
        end_date: endDate ? endDate.toISOString().split("T")[0] : null,
        filter_type: filterType !== "All" ? filterType : null,
        filter_method: filterMethod !== "All" ? filterMethod : null,
        search_term: search || null,
      };
      const filename = generatePrepaidTransactionsPDF(transactionsData, filterData);
      showToast({ message: `PDF generated successfully: ${filename}`, type: "success" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast({ message: "Failed to generate PDF", type: "error" });
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

  const inputClass =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white";

  return (
    <div className="flex flex-col">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Sales Report</h1>
        <p className="text-xs text-gray-500 mt-0.5">Overview of prepaid transactions</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
        <KpiBox title="Total Revenue" value={`₱${totalRevenue.toFixed(2)}`} color="text-green-700" />
        <KpiBox title="Total Transactions" value={totalTransactions} color="text-blue-600" />
        <KpiBox title="Cash Revenue" value={`₱${cashRevenue.toFixed(2)}`} color="text-gray-900" />
        <KpiBox title="Cashless Revenue" value={`₱${gcashRevenue.toFixed(2)}`} color="text-gray-900" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2 flex-1">
              <input
                type="text"
                placeholder="Search member"
                className={`${inputClass} max-w-[180px]`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className={`${inputClass} max-w-[140px]`}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="All">All Types</option>
                <option value="new_membership">New Membership</option>
                <option value="Tapup">Tap-Up</option>
                <option value="product_purchase">Others</option>
              </select>
              <select
                className={`${inputClass} max-w-[140px]`}
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
                className={`${inputClass} max-w-[130px]`}
                placeholderText="Start date"
                isClearable
              />
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                minDate={startDate}
                maxDate={new Date()}
                dateFormat="yyyy-MM-dd"
                className={`${inputClass} max-w-[130px]`}
                placeholderText="End date"
                isClearable
              />
            </div>
            <button
              onClick={handleDownloadPDF}
              disabled={filtered.length === 0}
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
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Profile</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Plan</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Method</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Staff</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-xs text-gray-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-xs text-gray-400">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map((txn, index) => (
                  <tr key={txn.transaction_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      {txn.profile_image_url ? (
                        <img
                          src={txn.profile_image_url}
                          alt={txn.member_name}
                          className="w-7 h-7 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[9px] text-gray-400 font-medium">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-800">{txn.member_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{txn.transaction_type}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{txn.plan_name || "N/A"}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-800">₱{parseFloat(txn.amount).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${txn.payment_method === "Cash" ? "bg-green-50 text-green-700 border-green-100" : "bg-blue-50 text-blue-700 border-blue-100"}`}>
                        {txn.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{txn.staff_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(txn.transaction_date).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-100 flex justify-end">
            <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
              {filtered.length} {filtered.length === 1 ? "record" : "records"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrepaidTransactions;