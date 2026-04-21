import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../../api";
import { useToast } from "../../components/ToastManager";
import StaffSidebar from "../../components/StaffSidebar";

function formatDateToLocalString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

const DayPassRenewal = ({ staffUser }) => {
  const location = useLocation();
  const { rfid_tag: scannedRfid, guest_data, full_name } = location.state || {};

  console.log("🎯 DayPassRenewal received:", { scannedRfid, guest_data, full_name });

  const [currentUser, setCurrentUser] = useState(null);
  const staffName = staffUser?.name || currentUser?.name || "";
  const adminId = staffUser?.adminId || staffUser?.admin_id || staffUser?.userId || currentUser?.adminId || currentUser?.id;

  const [rfid, setRfid] = useState(scannedRfid || "");
  const [guest, setGuest] = useState(scannedRfid && guest_data ? guest_data : null);
  const [guestName, setGuestName] = useState(full_name || guest_data?.guest_name || "");
  const [gender, setGender] = useState(guest_data?.gender || "");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [imagePreview, setImagePreview] = useState(guest_data?.profile_image_url || null);

  const [sessionFee, setSessionFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data } = await api.get('/api/me');
        if (data?.authenticated && data?.user) {
          setCurrentUser(data.user);
          console.log("✅ Current user loaded:", data.user);
        }
      } catch (err) {
        console.error("❌ Failed to fetch current user:", err);
      }
    };

    if (!staffUser) {
      fetchCurrentUser();
    }
  }, [staffUser]);

  useEffect(() => {
    console.log("🔄 Navigation state changed:", { scannedRfid, guest_data, full_name });

    if (scannedRfid && guest_data) {
      setRfid(scannedRfid);
      setGuest(guest_data);
      setGuestName(full_name || guest_data.guest_name || "");
      setGender(guest_data.gender || "");
      setImagePreview(guest_data.profile_image_url || null);
      setEmail(guest_data.email || "");
      setMobileNumber(guest_data.mobile_number || "");

      const paidAmount = parseFloat(guest_data.paid_amount);
      if (!isNaN(paidAmount)) {
        setSessionFee(paidAmount);
      }

      console.log("✅ State updated:", {
        guestName: full_name || guest_data.guest_name,
        gender: guest_data.gender,
        imagePreview: guest_data.profile_image_url,
        sessionFee: paidAmount
      });
    }
  }, [scannedRfid, guest_data, full_name]);

  useEffect(() => {
    if (!adminId) {
      console.log("⏳ Waiting for adminId...");
      return;
    }

    console.log("✅ Admin ID available:", adminId);

    const fetchPaymentMethods = async () => {
      try {
        const { data } = await api.get(`/api/payment-methods/${adminId}`);
        console.log("💳 Payment methods fetched:", data);
        setPaymentMethods(data);
      } catch (err) {
        console.error("❌ Failed to fetch payment methods:", err);
        showToast({ message: "Failed to load payment methods", type: "error" });
      }
    };

    const fetchSessionFee = async () => {
      try {
        const res = await api.get(`/api/session-fee?admin_id=${adminId}`);
        const fee = parseFloat(res.data.session_fee);
        console.log("💰 Session fee fetched:", fee);
        if (!isNaN(fee)) {
          setSessionFee(fee);
        }
      } catch (err) {
        console.error("❌ Failed to fetch session fee:", err);
      }
    };

    fetchPaymentMethods();
    fetchSessionFee();
  }, [adminId, guest_data, showToast]);

  useEffect(() => {
    if (rfid && rfid.length >= 8 && adminId && rfid !== scannedRfid) {
      fetchGuest();
    }
  }, [rfid, adminId, scannedRfid]);

  const fetchGuest = async () => {
    if (!rfid || !adminId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/daypass-guest/${rfid}?admin_id=${adminId}`);

      if (data) {
        setGuest(data);
        setGuestName(data.guest_name || "");
        setGender(data.gender || "");
        setImagePreview(data.profile_image_url || null);
        setEmail(data.email || "");
        setMobileNumber(data.mobile_number || "");

        const paidAmount = parseFloat(data.paid_amount);
        if (!isNaN(paidAmount)) {
          setSessionFee(paidAmount);
        }
      } else {
        setGuest(null);
        showToast({ message: "Guest not found.", type: "error" });
      }
    } catch (err) {
      console.error("Error fetching guest:", err);
      showToast({ message: "Error fetching guest data.", type: "error" });
      setGuest(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!guest || !paymentMethod || !staffName) {
      showToast({ message: "Please complete all required fields.", type: "error" });
      return;
    }

    if (paymentMethod && paymentMethod.toLowerCase() !== "cash" && !reference) {
      showToast({ message: "Please enter payment reference number.", type: "error" });
      return;
    }

    setLoading(true);

    try {
      const expires_at = new Date();
      expires_at.setHours(23, 59, 59, 999);

      const payload = {
        rfid_tag: guest.rfid_tag || rfid,
        full_name: guest.guest_name || guestName,
        admin_id: guest.admin_id || adminId,
        staff_name: staffName,
        system_type: "prepaid_entry",
        expires_at: formatDateToLocalString(expires_at),
        payment_method: paymentMethod,
        cashless_reference: paymentMethod.toLowerCase() !== "cash" ? reference || "" : null,
        session_fee: Number(sessionFee),
      };

      console.log("📤 Payload to submit:", payload);

      await api.post("/api/renew-daypass", payload);

      showToast({ message: "Day pass renewed successfully!", type: "success" });
      setGuest(null);
      setRfid("");
      setGuestName("");
      setGender("");
      setImagePreview(null);
      setEmail("");
      setMobileNumber("");
      setPaymentMethod("");
      setReference("");
      setSessionFee(0);
    } catch (err) {
      console.error("❌ Error renewing day pass:", err);
      showToast({ message: "Failed to renew day pass.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-xs text-gray-500 mb-1";
  const readonlyClass = "w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 bg-gray-50 cursor-not-allowed";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StaffSidebar />

      <div className="flex-1 min-w-0 p-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Day Pass Renewal</h1>
          <p className="text-xs text-gray-500 mt-0.5">Renew a guest's day pass using RFID. No key fob fee required.</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          className="bg-white border border-gray-200 rounded-xl p-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-gray-900 pb-2 border-b border-gray-100">Guest Lookup</p>
              <div className="space-y-2">
                <div>
                  <label className={labelClass}>Scan or Enter RFID</label>
                  <input
                    type="text"
                    value={rfid}
                    onChange={(e) => setRfid(e.target.value)}
                    placeholder="Scan RFID tag"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Guest Name</label>
                  <input type="text" value={guestName} readOnly placeholder="No guest loaded" className={readonlyClass} />
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input type="text" value={email} readOnly placeholder="—" className={readonlyClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Mobile Number</label>
                    <input type="text" value={mobileNumber} readOnly placeholder="—" className={readonlyClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Gender</label>
                    <input
                      type="text"
                      value={gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : ""}
                      readOnly
                      placeholder="—"
                      className={readonlyClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-gray-900 pb-2 border-b border-gray-100">Payment</p>
              <div className="space-y-2">
                <div>
                  <label className={labelClass}>Session Fee</label>
                  <input type="text" value={`₱${(sessionFee || 0).toFixed(2)}`} readOnly className={readonlyClass} />
                </div>
                <div>
                  <label className={labelClass}>Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    required
                    className={`${inputClass} bg-white`}
                  >
                    <option value="">Select</option>
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.name}>{method.name}</option>
                    ))}
                  </select>
                </div>
                {paymentMethod && paymentMethod.toLowerCase() !== "cash" && (
                  <div>
                    <label className={labelClass}>{paymentMethod} Reference</label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      required
                      placeholder={`Enter ${paymentMethod} reference`}
                      className={inputClass}
                    />
                  </div>
                )}
                <div>
                  <label className={labelClass}>Valid Until</label>
                  <input type="text" value="Today 11:59 PM" readOnly className={readonlyClass} />
                </div>
              </div>
              <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={loading || !guest || !paymentMethod}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : "Renew Day Pass"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-gray-900 pb-2 border-b border-gray-100">Guest Preview</p>
              <div className="flex flex-col items-center gap-2">
                <div className="w-70 h-70 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Guest"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `<span class="text-3xl font-medium text-gray-300">${guestName ? guestName.charAt(0).toUpperCase() : "?"}</span>`;
                      }}
                    />
                  ) : (
                    <span className="text-3xl font-medium text-gray-300">
                      {guestName ? guestName.charAt(0).toUpperCase() : "?"}
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-gray-900 text-center">
                  {guestName || "No guest loaded"}
                </p>
                {guest && (
                  <p className="text-xs text-gray-400 text-center">
                    Fee: ₱{(sessionFee || 0).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default DayPassRenewal;