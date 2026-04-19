import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import { API_URL } from "../../config";
import { useToast } from "../../components/ToastManager";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ROWS_PER_PAGE = 10;

const KpiBox = ({ title, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1">
    <p className="text-xs text-gray-500">{title}</p>
    <p className={`text-base font-semibold ${color}`}>{value}</p>
  </div>
);

const SuperAdminTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterMethod, setFilterMethod] = useState("All");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/superadmin-transactions`);
      setTransactions(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      showToast({ message: "Failed to fetch transactions", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let data = transactions;

    if (search) {
      data = data.filter((txn) => {
        const ref = txn.reference_number || "";
        const order = txn.order_id ? txn.order_id.toString() : "";
        return (
          ref.toLowerCase().includes(search.toLowerCase()) ||
          order.includes(search) ||
          txn.id.toString().includes(search)
        );
      });
    }

    if (filterType !== "All") {
      data = data.filter((txn) => txn.transaction_type === filterType);
    }

    if (filterMethod !== "All") {
      data = data.filter((txn) => txn.payment_method.toLowerCase() === filterMethod.toLowerCase());
    }

    if (startDate) {
      data = data.filter((txn) => new Date(txn.created_at) >= startDate);
    }

    if (endDate) {
      data = data.filter((txn) => new Date(txn.created_at) <= endDate);
    }

    setFiltered(data);
    setPage(1);
  }, [search, filterType, filterMethod, transactions, startDate, endDate]);

  const totalRevenue = filtered.reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
  const totalTransactions = filtered.length;
  const cashRevenue = filtered
    .filter((txn) => txn.payment_method.toLowerCase() === "cash")
    .reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
  const gcashRevenue = filtered
    .filter((txn) => txn.payment_method.toLowerCase() === "gcash")
    .reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
  const packagePurchases = filtered.filter((txn) => txn.transaction_type === "Package Purchase").length;
  const orderPayments = filtered.filter((txn) => txn.transaction_type === "Order Payment").length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const handleClearFilters = () => {
    setSearch("");
    setFilterType("All");
    setFilterMethod("All");
    setStartDate(null);
    setEndDate(null);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />

      <div className="flex-1 min-w-0 p-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Transactions</h1>
          <p className="text-xs text-gray-500 mt-0.5">Overview of all admin transactions</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          <KpiBox title="Total Revenue" value={`₱${totalRevenue.toFixed(2)}`} color="text-green-700" />
          <KpiBox title="Total Transactions" value={totalTransactions} color="text-blue-600" />
          <KpiBox title="Cash Revenue" value={`₱${cashRevenue.toFixed(2)}`} color="text-gray-900" />
          <KpiBox title="GCash Revenue" value={`₱${gcashRevenue.toFixed(2)}`} color="text-blue-600" />
          <KpiBox title="Package Purchases" value={packagePurchases} color="text-gray-900" />
          <KpiBox title="Order Payments" value={orderPayments} color="text-gray-900" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-medium text-gray-900 mb-3 pb-3 border-b border-gray-100">Filters</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="Search reference / order / ID"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Package Purchase">Package Purchase</option>
              <option value="Order Payment">Order Payment</option>
            </select>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
            >
              <option value="All">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
            </select>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              maxDate={new Date()}
              dateFormat="yyyy-MM-dd"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholderText="Start date"
              isClearable
            />
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              minDate={startDate}
              maxDate={new Date()}
              dateFormat="yyyy-MM-dd"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholderText="End date"
              isClearable
            />
          </div>
          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">Transaction History</p>
            <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
              {filtered.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-3 text-xs text-gray-400">Loading transactions...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-xs font-medium text-gray-500">No transactions found</p>
                <p className="text-xs text-gray-400 mt-0.5">Try adjusting your filters or search criteria.</p>
              </div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["ID", "Admin ID", "Type", "Amount", "Total Amount", "Method", "Reference", "Order ID", "Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">#{txn.id}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">Admin #{txn.admin_id}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] border rounded-full px-2.5 py-0.5 font-medium ${
                          txn.transaction_type === "Package Purchase"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}>
                          {txn.transaction_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-green-700">
                        ₱{parseFloat(txn.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">
                        ₱{parseFloat(txn.total_amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] border rounded-full px-2.5 py-0.5 font-medium ${
                          txn.payment_method.toLowerCase() === "cash"
                            ? "bg-green-50 text-green-700 border-green-100"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}>
                          {txn.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{txn.reference_number || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{txn.order_id || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(txn.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!loading && filtered.length > 0 && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Showing {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="text-xs text-gray-400 px-1">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors border ${
                          page === p
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminTransactions;