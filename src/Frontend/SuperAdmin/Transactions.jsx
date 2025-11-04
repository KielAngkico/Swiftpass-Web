import React, { useState, useEffect } from "react";
import axios from "axios";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import { API_URL } from "../../config";
import { useToast } from "../../components/ToastManager";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const KpiBox = ({ title, value, color }) => (
  <div className="bg-white shadow p-3 rounded text-center">
    <h3 className="text-xs text-gray-600 truncate">{title}</h3>
    <p className={`text-lg font-bold ${color}`}>{value}</p>
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
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const txnRes = await axios.get(`${API_URL}/api/superadmin-transactions`);
      setTransactions(txnRes.data);
      setFiltered(txnRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      showToast({ message: "Failed to fetch transactions", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filteredData = transactions;

    if (search) {
      filteredData = filteredData.filter((txn) => {
        const referenceNumber = txn.reference_number || "";
        const orderId = txn.order_id ? txn.order_id.toString() : "";
        return (
          referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
          orderId.includes(search) ||
          txn.id.toString().includes(search)
        );
      });
    }

    if (filterType !== "All") {
      filteredData = filteredData.filter((txn) => txn.transaction_type === filterType);
    }

    if (filterMethod !== "All") {
      filteredData = filteredData.filter(
        (txn) => txn.payment_method.toLowerCase() === filterMethod.toLowerCase()
      );
    }

    if (startDate) {
      filteredData = filteredData.filter(
        (txn) => new Date(txn.created_at) >= startDate
      );
    }

    if (endDate) {
      filteredData = filteredData.filter(
        (txn) => new Date(txn.created_at) <= endDate
      );
    }

    setFiltered(filteredData);
  }, [search, filterType, filterMethod, transactions, startDate, endDate]);

  const totalRevenue = filtered.reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
  const totalTransactions = filtered.length;
  const cashRevenue = filtered
    .filter((txn) => txn.payment_method.toLowerCase() === "cash")
    .reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
  const gcashRevenue = filtered
    .filter((txn) => txn.payment_method.toLowerCase() === "gcash")
    .reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);

  const packagePurchases = filtered.filter(txn => txn.transaction_type === "Package Purchase").length;
  const orderPayments = filtered.filter(txn => txn.transaction_type === "Order Payment").length;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <SuperAdminSidebar />
      
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Super Admin Transactions</h1>
          <p className="text-sm text-gray-600">Overview of all admin transactions</p>
        </div>

        {/* KPI Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiBox title="💰 Total Revenue" value={`₱${totalRevenue.toFixed(2)}`} color="text-green-600" />
          <KpiBox title="📄 Total Transactions" value={totalTransactions} color="text-blue-600" />
          <KpiBox title="💵 Cash Revenue" value={`₱${cashRevenue.toFixed(2)}`} color="text-teal-600" />
          <KpiBox title="📲 GCash Revenue" value={`₱${gcashRevenue.toFixed(2)}`} color="text-purple-600" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
          <KpiBox title="📦 Package Purchases" value={packagePurchases} color="text-orange-600" />
          <KpiBox title="🛒 Order Payments" value={orderPayments} color="text-indigo-600" />
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-3">Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="🔍 Search Reference/Order/Transaction ID"
              className="w-full p-2 border border-gray-300 rounded text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="w-full p-2 border border-gray-300 rounded text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Package Purchase">Package Purchase</option>
              <option value="Order Payment">Order Payment</option>
            </select>

            <select
              className="w-full p-2 border border-gray-300 rounded text-sm"
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
              className="w-full p-2 border border-gray-300 rounded text-sm"
              placeholderText="Start Date"
              isClearable
            />

            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              minDate={startDate}
              maxDate={new Date()}
              dateFormat="yyyy-MM-dd"
              className="w-full p-2 border border-gray-300 rounded text-sm"
              placeholderText="End Date"
              isClearable
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Transaction History</h2>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <span className="mt-4 text-gray-600 block">Loading transactions...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions found</h3>
                <p className="text-gray-500">Try adjusting your filters or search criteria.</p>
              </div>
            ) : (
              <table className="min-w-full text-sm text-left border-collapse">
                <thead className="bg-gray-700 text-white uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Admin ID</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((txn, index) => (
                    <tr key={txn.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-3 font-medium text-gray-900">#{txn.id}</td>
                      <td className="px-4 py-3 text-gray-700">
                        Admin #{txn.admin_id}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          txn.transaction_type === "Package Purchase" 
                            ? "bg-orange-100 text-orange-700" 
                            : "bg-indigo-100 text-indigo-700"
                        }`}>
                          {txn.transaction_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-600">
                        ₱{parseFloat(txn.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-600">
                        ₱{parseFloat(txn.total_amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          txn.payment_method.toLowerCase() === "cash" 
                            ? "bg-teal-100 text-teal-700" 
                            : "bg-purple-100 text-purple-700"
                        }`}>
                          {txn.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {txn.reference_number || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {txn.order_id || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(txn.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminTransactions;