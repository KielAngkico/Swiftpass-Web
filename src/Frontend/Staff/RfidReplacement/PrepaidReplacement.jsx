import React, { useState, useEffect } from "react";
import api from "../../../api";

const PrepaidReplacement = () => {
  const [adminId, setAdminId] = useState(null);
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [replacementFee, setReplacementFee] = useState(0);
  const [newRfidTag, setNewRfidTag] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [cashlessRef, setCashlessRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch user/admin ID
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user) throw new Error("Not authenticated");
        const id = data.user.adminId || data.user.id;
        if (!id) throw new Error("Missing admin ID");
        setAdminId(id);
      } catch (err) {
        console.error("❌ Failed to fetch user:", err);
        if (err.response?.status === 401) window.location.href = "/login";
      }
    };
    fetchUser();
  }, []);

  // Fetch members
  useEffect(() => {
    if (!adminId) return;
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/api/get-members?admin_id=${adminId}`);
        setMembers(data.members || []);
        setFilteredMembers(data.members || []);
      } catch (err) {
        console.error("❌ Failed to fetch members:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [adminId]);

  // Fetch replacement fee from pricing options
  useEffect(() => {
    if (!adminId) return;
    const fetchReplacementFee = async () => {
      try {
        const { data } = await api.get(`/api/get-pricing/${adminId}`);
        const replacementPlan = data.find(plan => plan.plan_name === "Replacement Fee");
        if (replacementPlan) {
          setReplacementFee(parseFloat(replacementPlan.amount_to_pay) || 0);
        }
      } catch (err) {
        console.error("❌ Failed to fetch replacement fee:", err);
      }
    };
    fetchReplacementFee();
  }, [adminId]);

  // Fetch payment methods
  useEffect(() => {
    if (!adminId) return;
    const fetchPaymentMethods = async () => {
      try {
        const { data } = await api.get(`/api/payment-methods/${adminId}`);
        setPaymentMethods(Array.isArray(data) ? data : data.methods || []);
      } catch (err) {
        console.error("❌ Failed to fetch payment methods:", err);
      }
    };
    fetchPaymentMethods();
  }, [adminId]);

  // Handle search
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredMembers(members);
      return;
    }
    const filtered = members.filter(member =>
      member.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.rfid_tag?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMembers(filtered);
  };

  // Handle member selection
  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setNewRfidTag("");
    setPaymentMethod("");
    setCashlessRef("");
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newRfidTag.trim()) {
      alert("Please enter a new RFID tag");
      return;
    }

    if (!paymentMethod) {
      alert("Please select a payment method");
      return;
    }

    if (paymentMethod.toLowerCase() !== "cash" && !cashlessRef.trim()) {
      alert(`Please enter ${paymentMethod} reference number`);
      return;
    }

    setSubmitting(true);

    try {
      await api.put(`/api/replace-member-rfid/${selectedMember.id}`, {
        new_rfid_tag: newRfidTag,
        replacement_fee: replacementFee,
        payment_method: paymentMethod,
        cashless_reference: paymentMethod.toLowerCase() !== "cash" ? cashlessRef : null,
        admin_id: adminId,
      });

      alert("RFID replaced successfully!");
      setSelectedMember(null);
      setNewRfidTag("");
      setPaymentMethod("");
      setCashlessRef("");
      
      // Refresh members list
      const { data } = await api.get(`/api/get-members?admin_id=${adminId}`);
      setMembers(data.members || []);
      setFilteredMembers(data.members || []);
    } catch (err) {
      console.error("❌ Failed to replace RFID:", err);
      alert(err.response?.data?.error || "Failed to replace RFID");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white p-2">
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
          RFID Replacement
        </h1>
        <p className="text-xs text-gray-500">
          Search and replace member RFID tags
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="🔍 Search by name or RFID tag"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            Search
          </button>
        </div>
      </div>

      {/* Members List */}
      {!selectedMember && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-700 text-white">
                <tr>
                  <th className="px-4 py-2 text-left">Profile</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Current RFID</th>
                  <th className="px-4 py-2 text-left">Credits</th>
                  <th className="px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                      Loading members...
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                      No members found
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">
                        {member.profile_image_url ? (
                          <img
                            src={`http://localhost:5000${member.profile_image_url}`}
                            alt={member.member_name}
                            className="w-10 h-10 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                            N/A
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 font-medium">{member.member_name}</td>
                      <td className="px-4 py-2 font-mono text-blue-600">
                        {member.rfid_tag || "No RFID"}
                      </td>
                      <td className="px-4 py-2 text-green-600 font-semibold">
                        ₱{parseFloat(member.credits || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleSelectMember(member)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                        >
                          Replace
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Replacement Form */}
      {selectedMember && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Replace RFID for {selectedMember.member_name}</h2>
            <button
              onClick={() => setSelectedMember(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-xs text-gray-600">Current RFID</label>
                <input
                  type="text"
                  value={selectedMember.rfid_tag || "No RFID"}
                  readOnly
                  className="w-full border border-gray-200 px-3 py-2 rounded bg-gray-50 text-sm"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs text-gray-600">Current Credits (₱)</label>
                <input
                  type="text"
                  value={`₱${parseFloat(selectedMember.credits || 0).toFixed(2)}`}
                  readOnly
                  className="w-full border border-gray-200 px-3 py-2 rounded bg-gray-50 text-sm text-green-600 font-semibold"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs text-gray-600">New RFID Tag *</label>
                <input
                  type="text"
                  value={newRfidTag}
                  onChange={(e) => setNewRfidTag(e.target.value)}
                  placeholder="Scan or enter new RFID"
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs text-gray-600">Replacement Fee (₱)</label>
                <input
                  type="number"
                  value={replacementFee}
                  readOnly
                  className="w-full border border-gray-200 px-3 py-2 rounded bg-gray-50 text-sm"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs text-gray-600">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.name}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {paymentMethod && paymentMethod.toLowerCase() !== "cash" && (
              <div>
                <label className="block mb-1 text-xs text-gray-600">
                  {paymentMethod} Reference *
                </label>
                <input
                  type="text"
                  value={cashlessRef}
                  onChange={(e) => setCashlessRef(e.target.value)}
                  placeholder={`Enter ${paymentMethod} reference number`}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
              >
                {submitting ? "Processing..." : "Replace RFID"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PrepaidReplacement;
