import React, { useState, useEffect } from "react";
import api from "../../../api";
import { useWebSocket } from "../../../contexts/WebSocketContext";
import { useToast } from "../../../components/ToastManager";

const PrepaidReplacement = ({ staffUser }) => {
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

  // Fetch user/admin ID
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

  // If staffUser prop is provided, use it
  useEffect(() => {
    if (staffUser) {
      const id = staffUser.adminId || staffUser.admin_id || staffUser.userId;
      const name = staffUser.name || "";
      if (id) setAdminId(id);
      if (name) setStaffName(name);
    }
  }, [staffUser]);

  // Fetch replacement fee
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

  // Listen for scanned RFID from WebSocket
  useEffect(() => {
    if (replacementScannedRfid && scanActive) {
      console.log("📡 RFID scanned from WebSocket:", replacementScannedRfid);
      setNewRfidTag(replacementScannedRfid);
      setScanActive(false);
      showToast({ message: "✅ RFID captured: " + replacementScannedRfid, type: "success" });
      clearReplacementScannedRfid();
    }
  }, [replacementScannedRfid, scanActive, clearReplacementScannedRfid, showToast]);

  const fetchMember = async () => {
    if (!searchTerm) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/get-members?admin_id=${adminId}`);
      const allMembers = data.members || [];

      const filtered = allMembers.filter(member =>
        member.system_type === "prepaid_entry" &&
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
        showToast({ message: "Member not found or not a prepaid account.", type: "error" });
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
    console.log("🔍 Scan button clicked - activating replacement scan mode");
    
    // Activate replacement scan mode via WebSocket
    toggleReplacementScanMode(true);
    
    // Update local state
    setScanActive(true);
    setNewRfidTag("");
    showToast({ message: "📡 Scanning active - tap RFID tag now", type: "info" });
    
    console.log("Replacement scan mode activation sent to backend");
  };

  const handleRfidInputChange = (e) => {
    const value = e.target.value;
    setNewRfidTag(value);
    if (value.length > 0 && scanActive) {
      setScanActive(false);
      showToast({ message: "✅ RFID captured: " + value, type: "success" });
      // Turn off scan mode when manually entering
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

      showToast({ message: "RFID replaced successfully!", type: "success" });
      setSelectedMember(null);
      setSearchTerm("");
      setNewRfidTag("");
      setPaymentMethod("");
      setReference("");
      setMembers([]);
      setScanActive(false);
      
      // Make sure scan mode is off
      toggleReplacementScanMode(false);
    } catch (err) {
      console.error("Failed to replace RFID:", err);
      showToast({ message: err.response?.data?.message || "Failed to replace RFID.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-fit bg-white p-2">
      <main className="max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
            RFID Replacement - Prepaid
          </h1>
          <p className="text-xs text-gray-500">
            Search and replace member RFID tags
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white rounded-lg shadow items-start">
          <div className="flex flex-col gap-4 h-full">
            <h2 className="text-sm font-semibold text-gray-700">
              Replacement Details & Payment
            </h2>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Search Member (Name or RFID)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      fetchMember();
                    }
                  }}
                  placeholder="Enter name or RFID tag"
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm focus:ring focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={fetchMember}
                  className="px-4 py-2 rounded bg-black text-white font-semibold text-sm hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
            </div>

            {members.length > 1 && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Select Member
                </label>
                <select
                  onChange={(e) => {
                    const member = members.find(m => m.id === parseInt(e.target.value));
                    if (member) {
                      setSelectedMember(member);
                      setMembers([]);
                    }
                  }}
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-white"
                >
                  <option value="">-- Choose a Member --</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.member_name} - {member.rfid_tag}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Current RFID Tag
              </label>
              <input
                type="text"
                value={selectedMember?.rfid_tag || ""}
                readOnly
                placeholder="Current RFID will appear here"
                className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                New RFID Tag
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRfidTag}
                  onChange={handleRfidInputChange}
                  placeholder={scanActive ? "Waiting for RFID scan..." : "Scan or enter new RFID tag"}
                  className={`flex-1 border px-3 py-2 rounded text-sm transition-all ${
                    scanActive ? "border-green-500 bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500" : "border-gray-300"
                  }`}
                  autoComplete="off"
                  autoFocus={scanActive}
                />
                <button
                  type="button"
                  onClick={startScan}
                  disabled={scanActive}
                  className={`px-3 py-2 rounded font-semibold text-sm transition-all ${
                    scanActive
                      ? "bg-green-500 text-white cursor-not-allowed opacity-75"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {scanActive ? "Scanning..." : "Scan"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Replacement Fee
              </label>
              <input
                type="number"
                value={replacementFee}
                onChange={(e) => setReplacementFee(e.target.value)}
                placeholder="Enter replacement fee"
                className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-white"
              >
                <option value="">Select</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.name.toLowerCase()}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>

            {paymentMethod !== "cash" && paymentMethod !== "" && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  {paymentMethod.charAt(0).toUpperCase() +
                    paymentMethod.slice(1)}{" "}
                  Reference No.
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                  required
                />
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-1/2 mt-4 px-4 py-2 rounded bg-black text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Confirm Replacement"}
            </button>
          </div>

          <div className="flex flex-col items-center gap-3 w-80">
            <h2 className="text-sm font-semibold text-gray-700">Member ID</h2>
            <div className="bg-white border rounded-lg shadow w-3/4">
              <div className="bg-black h-16 flex items-center justify-center">
                <h3 className="text-white font-semibold text-sm">
                  GYM MEMBER ID
                </h3>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="w-32 h-32 border border-gray-300 rounded flex items-center justify-center bg-gray-50 overflow-hidden mb-3">
                  {selectedMember?.profile_image_url ? (
                    <img
                      src={selectedMember.profile_image_url}
                      alt="Member Photo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-sm">
                      {selectedMember?.full_name || selectedMember?.member_name
                        ? (selectedMember?.full_name || selectedMember?.member_name).charAt(0).toUpperCase()
                        : "?"}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-semibold text-gray-800">
                  {selectedMember?.full_name || selectedMember?.member_name || "No Member Loaded"}
                </h4>
                <p className="text-xs text-gray-600">
                  Balance:{" "}
                  <span className="font-medium">
                    {selectedMember
                      ? `₱${parseFloat(selectedMember.current_balance || selectedMember.credits || 0).toFixed(2)}`
                      : "N/A"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrepaidReplacement;