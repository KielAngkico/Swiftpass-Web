import React, { useEffect, useState } from "react";
import api from "../../../api";  

const KpiBox = ({ title, value, color }) => (
  <div className="bg-white shadow p-4 rounded text-center">
    <h3 className="text-sm text-gray-600">{title}</h3>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
);

const PrepaidTransactions = () => {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        console.log("📥 PrepaidTransactions user:", data);

        if (!data.authenticated || !data.user) {
          throw new Error("Not authenticated");
        }

        setUser(data.user);
      } catch (err) {
        console.error("❌ Failed to fetch user:", err);
        if (err.response?.status === 401) {
          window.location.href = "/login";
        }
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
      } catch (err) {
        console.error("❌ Failed to fetch transactions or members:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);
  useEffect(() => {
    const merged = transactions.map((txn) => {
      const match = members.find((m) => m.rfid_tag === txn.rfid_tag);
      return {
        ...txn,
        profile_image_url: match?.profile_image_url || null,
      };
    });

    let filteredData = merged;

    if (search) {
      filteredData = filteredData.filter((txn) =>
        txn.member_name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filterMethod !== "All") {
      filteredData = filteredData.filter((txn) => txn.payment_method === filterMethod);
    }

    if (filterType !== "All") {
      filteredData = filteredData.filter((txn) => txn.transaction_type === filterType);
    }

    setFiltered(filteredData);
  }, [search, filterMethod, filterType, transactions, members]);
  const totalRevenue = transactions.reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
  const totalTransactions = filtered.length;
  const cashRevenue = filtered
    .filter((txn) => txn.payment_method === "Cash")
    .reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
  const gcashRevenue = filtered
    .filter((txn) => txn.payment_method === "GCash")
    .reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);

  return (
  <div className="flex h-screen overflow-hidden bg-gray-100">
    <div className="flex-1 p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">Prepaid Transactions</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full mb-6">
        <KpiBox title="💰 Total Revenue" value={`₱${totalRevenue.toFixed(2)}`} color="text-green-600" />
        <KpiBox title="📄 Total Transactions" value={totalTransactions} color="text-blue-600" />
        <KpiBox title="💵 Cash Revenue" value={`₱${cashRevenue.toFixed(2)}`} color="text-teal-600" />
        <KpiBox title="📲 Cashless" value={`₱${gcashRevenue.toFixed(2)}`} color="text-purple-600" />
      </div>
<div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
  <div className="flex flex-col w-full md:w-1/3">
    <label className="text-sm text-gray-500 mb-1">🔍 Search by Member Name</label>
    <input
      type="text"
      placeholder="e.g. John Doe"
      className="p-3 border border-gray-300 rounded"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>

  <div className="flex flex-col w-full md:w-1/4">
    <label className="text-sm text-gray-500 mb-1">📄 Filter Transaction Type</label>
    <select
      className="p-3 border border-gray-300 rounded"
      value={filterType}
      onChange={(e) => setFilterType(e.target.value)}
    >
      <option value="All">All Types</option>
      <option value="new_membership">New Membership</option>
      <option value="tapup">Tap-Up</option>
      <option value="product_purchase">Others</option>
    </select>
  </div>

  <div className="flex flex-col w-full md:w-1/4">
    <label className="text-sm text-gray-500 mb-1">💳 Filter Payment Method</label>
    <select
      className="p-3 border border-gray-300 rounded"
      value={filterMethod}
      onChange={(e) => setFilterMethod(e.target.value)}
    >
      <option value="All">All Methods</option>
      <option value="Cash">Cash</option>
      <option value="GCash">Cashless</option>
    </select>
  </div>
</div>
      {filtered.length === 0 ? (
        <p className="text-gray-500 italic">No transactions found.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-800 text-white uppercase text-xs">
              <tr>
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Profile</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Transaction Type</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3">Staff</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((txn, index) => (
                <tr key={txn.transaction_id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-6 py-4">{index + 1}</td>
                  <td className="px-6 py-4">
                    {txn.profile_image_url ? (
                      <img
                        src={`http://localhost:5000/${txn.profile_image_url}`}
                        alt={txn.member_name}
                        className="w-10 h-10 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                        N/A
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">{txn.member_name}</td>
                  <td className="px-6 py-4">{txn.transaction_type}</td>
                  <td className="px-6 py-4">{txn.plan_name || "N/A"}</td>
                  <td className="px-6 py-4">₱{parseFloat(txn.amount).toFixed(2)}</td>
                  <td className="px-6 py-4">{txn.payment_method}</td>
                  <td className="px-6 py-4">{txn.staff_name}</td>
                  <td className="px-6 py-4">{new Date(txn.transaction_date).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedTxn(txn)}
                      className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 relative animate-fade-in">
            <button
              onClick={() => setSelectedTxn(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl font-bold"
              aria-label="Close"
            >
              &times;
            </button>

            <h2 className="text-2xl font-bold text-indigo-700 mb-4">Transaction Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
              <p><span className="font-semibold">Transaction ID:</span> {selectedTxn.transaction_id}</p>
              <p><span className="font-semibold">Member Name:</span> {selectedTxn.member_name}</p>
              <p><span className="font-semibold">RFID Tag:</span> {selectedTxn.rfid_tag}</p>
              <p><span className="font-semibold">Plan:</span> {selectedTxn.plan_name || "N/A"}</p>
              <p><span className="font-semibold">Amount:</span> ₱{parseFloat(selectedTxn.amount).toFixed(2)}</p>
              <p><span className="font-semibold">Payment Method:</span> {selectedTxn.payment_method}</p>
              {selectedTxn.payment_method === "GCash" && (
                <p><span className="font-semibold">GCash Ref:</span> {selectedTxn.reference || "N/A"}</p>
              )}
              <p><span className="font-semibold">Processed By:</span> {selectedTxn.staff_name}</p>
              <p><span className="font-semibold">Date:</span> {new Date(selectedTxn.transaction_date).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

export default PrepaidTransactions;
