import React, { useState, useEffect } from "react";
import api from "../../../api";
import { useWebSocket } from "../../../contexts/WebSocketContext";
import { useToast } from "../../../components/ToastManager";

const SubscriptionReplacement = ({ staffUser }) => {
  const {
    replacementScannedRfid,
    clearReplacementScannedRfid,
    toggleReplacementScanMode
  } = useWebSocket();

  const [adminId, setAdminId] = useState(null);
  const [staffName, setStaffName] = useState("");
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [replacementFee, setReplacementFee] = useState(0);
  const [newRfidTag, setNewRfidTag] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanActive, setScanActive] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user) throw new Error("Not authenticated");
        const id = data.user.adminId || data.user.admin_id || data.user.userId;
        const name = data.user.name || "";
        if (!id) throw new Error("Missing admin ID");
        setAdminId(id);
        setStaffName(name);
      } catch (err) {
        console.error("❌ Failed to fetch user:", err);
        if (err.response?.status === 401) window.location.href = "/login";
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (staffUser) {
      const id = staffUser.adminId || staffUser.admin_id || staffUser.userId;
      const name = staffUser.name || "";
      if (id) setAdminId(id);
      if (name) setStaffName(name);
    }
  }, [staffUser]);

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

  useEffect(() => {
    if (replacementScannedRfid && scanActive) {
      console.log("🔄 Replacement RFID scanned:", replacementScannedRfid);

      if (replacementScannedRfid.status === "error") {
        showToast({
          message: replacementScannedRfid.reason || "Invalid RFID for replacement",
          type: "error"
        });
        setScanActive(false);
        clearReplacementScannedRfid();
        toggleReplacementScanMode(false);
        return;
      }

      const scannedTag = replacementScannedRfid.rfid_tag || replacementScannedRfid;
      setNewRfidTag(scannedTag);
      setScanActive(false);
      showToast({ message: `✅ RFID captured: ${scannedTag}`, type: "success" });
      clearReplacementScannedRfid();
      toggleReplacementScanMode(false);
    }
  }, [replacementScannedRfid, scanActive, clearReplacementScannedRfid, showToast, toggleReplacementScanMode]);

  const fetchMember = async () => {
    if (!searchTerm) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/get-members?admin_id=${adminId}`);
      const allMembers = data.members || [];

      const filtered = allMembers.filter(member =>
        member.system_type === "subscription" &&
        (member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.rfid_tag?.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      if (filtered.length === 1) {
        setSelectedMember(filtered[0]);
      } else if (filtered.length > 1) {
        setMembers(filtered);
        setSelectedMember(null);
        showToast({ message: `Found ${filtered.length} members. Please select one.`, type: "info" });
      } else {
        setSelectedMember(null);
        showToast({ message: "Member not found or not a subscription account.", type: "error" });
      }
    } catch (err) {
      console.error("❌ Error fetching member:", err);
      showToast({ message: "Error fetching member data.", type: "error" });
      setSelectedMember(null);
    } finally {
      setLoading(false);
    }
  };

  const startScan = () => {
    console.log("🔄 Starting replacement scan mode");
    toggleReplacementScanMode(true);
    setScanActive(true);
    setNewRfidTag("");
    showToast({ message: "🔍 Scanning active - tap new RFID tag now", type: "info" });
  };

  const handleRfidInputChange = (e) => {
    const value = e.target.value;
    setNewRfidTag(value);
    if (value.length > 0 && scanActive) {
      setScanActive(false);
      showToast({ message: "✅ RFID captured: " + value, type: "success" });
      toggleReplacementScanMode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedMember || !newRfidTag || !paymentMethod || !replacementFee) {
      showToast({ message: "Please complete all required fields.", type: "error" });
      return;
    }

    if (!staffName || !adminId) {
      showToast({ message: "Missing staff or admin information.", type: "error" });
      return;
    }

    if (paymentMethod.toLowerCase() !== "cash" && !reference.trim()) {
      showToast({ message: `Please enter ${paymentMethod} reference number.`, type: "error" });
      return;
    }

    if (newRfidTag.trim() === selectedMember.rfid_tag) {
      showToast({ message: "New RFID tag must be different from the current one.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        new_rfid_tag: newRfidTag.trim(),
        replacement_fee: Number(replacementFee),
        payment_method: paymentMethod,
        reference: paymentMethod.toLowerCase() !== "cash" ? reference : null,
        admin_id: adminId,
        staff_name: staffName,
      };

      await api.put(`/api/replace-member-rfid/${selectedMember.id}`, payload);

      showToast({ message: "✅ RFID replaced successfully!", type: "success" });
      setSelectedMember(null);
      setSearchTerm("");
      setNewRfidTag("");
      setPaymentMethod("");
      setReference("");
      setMembers([]);
      setScanActive(false);
      toggleReplacementScanMode(false);
    } catch (err) {
      console.error("Failed to replace RFID:", err);
      showToast({ message: err.response?.data?.message || "Failed to replace RFID.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      console.log("🧹 Component unmounting - disabling replacement scan mode");
      toggleReplacementScanMode(false);
    };
  }, []);

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-xs text-gray-500 mb-1";
  const readonlyClass = "w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 bg-gray-50 cursor-not-allowed";

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">RFID Replacement</h1>
        <p className="text-xs text-gray-500 mt-0.5">Search and replace member RFID tags.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-900 pb-2 border-b border-gray-100">Member Lookup</p>
            <div className="space-y-2">
              <div>
                <label className={labelClass}>Search Member (Name or RFID)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => { if (e.key === "Enter") { e.preventDefault(); fetchMember(); } }}
                    placeholder="Enter name or RFID tag"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={fetchMember}
                    className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap"
                  >
                    Search
                  </button>
                </div>
              </div>
              {members.length > 1 && (
                <div>
                  <label className={labelClass}>Select Member</label>
                  <select
                    onChange={(e) => {
                      const member = members.find(m => m.id === parseInt(e.target.value));
                      if (member) { setSelectedMember(member); setMembers([]); }
                    }}
                    className={`${inputClass} bg-white`}
                  >
                    <option value="">Choose a member</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name || member.member_name} - {member.rfid_tag}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={labelClass}>Member Name</label>
                <input type="text" value={selectedMember?.full_name || selectedMember?.member_name || ""} readOnly placeholder="No member loaded" className={readonlyClass} />
              </div>
              <div>
                <label className={labelClass}>Current RFID Tag</label>
                <input type="text" value={selectedMember?.rfid_tag || ""} readOnly placeholder="Current RFID will appear here" className={readonlyClass} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-900 pb-2 border-b border-gray-100">Replacement & Payment</p>
            <div className="space-y-2">
              <div>
                <label className={labelClass}>New RFID Tag</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRfidTag}
                    onChange={handleRfidInputChange}
                    placeholder={scanActive ? "Waiting for RFID scan..." : "Scan or enter new RFID tag"}
                    className={`${inputClass} flex-1 ${scanActive ? "border-green-500 bg-green-50 focus:ring-green-500 focus:border-green-500" : ""}`}
                    autoComplete="off"
                    autoFocus={scanActive}
                  />
                  <button
                    type="button"
                    onClick={startScan}
                    disabled={scanActive}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                      scanActive
                        ? "bg-green-500 text-white cursor-not-allowed opacity-75"
                        : "bg-white text-blue-600 border border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    {scanActive ? "Scanning..." : "Scan"}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Replacement Fee</label>
                <input
                  type="text"
                  value={replacementFee}
                  onChange={(e) => setReplacementFee(e.target.value)}
                  placeholder="Enter replacement fee"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={`${inputClass} bg-white`}
                >
                  <option value="">Select</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.name.toLowerCase()}>{method.name}</option>
                  ))}
                </select>
              </div>
              {paymentMethod !== "cash" && paymentMethod !== "" && (
                <div>
                  <label className={labelClass}>
                    {paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Reference No.
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Reference number"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Processing..." : "Confirm Replacement"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-900 pb-2 border-b border-gray-100">Member Preview</p>
            <div className="flex flex-col items-center gap-2">
              <div className="w-70 h-70 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
                {selectedMember?.member_image ? (
                  <img src={selectedMember.member_image} alt="Member Photo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-medium text-gray-300">
                    {selectedMember?.full_name || selectedMember?.member_name
                      ? (selectedMember?.full_name || selectedMember?.member_name).charAt(0).toUpperCase()
                      : "?"}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-gray-900 text-center">
                {selectedMember?.full_name || selectedMember?.member_name || "No member loaded"}
              </p>
              {selectedMember?.subscription_type && (
                <p className="text-xs text-gray-400 text-center">Plan: {selectedMember.subscription_type}</p>
              )}
              {selectedMember?.subscription_expiry && (
                <p className="text-xs text-gray-400 text-center">Expires: {selectedMember.subscription_expiry}</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SubscriptionReplacement;