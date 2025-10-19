import React, { useEffect, useState } from "react";
import api from "../../../api";

const KpiBox = ({ title, value, color }) => (
  <div className="bg-white shadow p-2 rounded text-center">
    <h3 className="text-[10px] sm:text-xs text-gray-600 truncate">{title}</h3>
    <p className={`text-sm sm:text-base font-bold ${color}`}>{value}</p>
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
        if (!data.authenticated || !data.user) throw new Error("Not authenticated");
        setUser(data.user);
      } catch (err) {
        console.error(err);
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
      } catch (err) {
        console.error(err);
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
    if (search) filteredData = filteredData.filter((txn) => txn.member_name?.toLowerCase().includes(search.toLowerCase()));
    if (filterMethod !== "All") filteredData = filteredData.filter((txn) => txn.payment_method === filterMethod);
    if (filterType !== "All") filteredData = filteredData.filter((txn) => txn.transaction_type === filterType);

    setFiltered(filteredData);
  }, [search, filterMethod, filterType, transactions, members]);

  const totalRevenue = transactions.reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
  const totalTransactions = filtered.length;
  const cashRevenue = filtered.filter((txn) => txn.payment_method === "Cash").reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
  const gcashRevenue = filtered.filter((txn) => txn.payment_method === "GCash").reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);

return (
  <div className="min-h-screen w-full bg-white p-2 flex flex-col space-y-3">
    
    <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-1">
          Prepaid Transactions
        </h2>
        <p className="text-[10px] sm:text-xs text-gray-500">
          {filtered.length} transactions{search && ` matching "${search}"`}
        </p>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto  space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <KpiBox title="💰 Total Revenue" value={`₱${totalRevenue.toFixed(2)}`} color="text-green-600" />
          <KpiBox title="📄 Total Transactions" value={totalTransactions} color="text-blue-600" />
          <KpiBox title="💵 Cash Revenue" value={`₱${cashRevenue.toFixed(2)}`} color="text-teal-600" />
          <KpiBox title="📲 Cashless" value={`₱${gcashRevenue.toFixed(2)}`} color="text-purple-600" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] sm:text-xs text-gray-500 mb-1 block">🔍 Search Member</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] sm:text-xs text-gray-500 mb-1 block">📄 Filter Type</label>
            <select
              className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="new_membership">New Membership</option>
              <option value="tapup">Tap-Up</option>
              <option value="product_purchase">Others</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] sm:text-xs text-gray-500 mb-1 block">💳 Filter Method</label>
            <select
              className="w-full p-2 border border-gray-300 rounded text-xs sm:text-sm"
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
          <p className="text-gray-500 italic text-xs sm:text-sm">No transactions found.</p>
        ) : (
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
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((txn, index) => (
                  <tr key={txn.transaction_id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">
                      {txn.profile_image_url ? (
                        <img
                          src={txn.profile_image_url}
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
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setSelectedTxn(txn)}
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-[10px] sm:text-xs"
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
      </div>
    </div>
  </div>
);
};

export default PrepaidTransactions;
