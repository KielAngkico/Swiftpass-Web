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
  
  // ✅ Get authenticated user info
  const [currentUser, setCurrentUser] = useState(null);
  const staffName = staffUser?.name || currentUser?.name || "";
  const adminId = staffUser?.adminId || staffUser?.admin_id || staffUser?.userId || currentUser?.adminId || currentUser?.id;

  const [rfid, setRfid] = useState(scannedRfid || "");
  const [guest, setGuest] = useState(
    scannedRfid && guest_data ? guest_data : null
  );
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

  // ✅ Fetch current user from /api/me
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

  // ✅ Update state when navigation state changes
  useEffect(() => {
    console.log("🔄 Navigation state changed:", { scannedRfid, guest_data, full_name });
    
    if (scannedRfid && guest_data) {
      setRfid(scannedRfid);
      setGuest(guest_data);
      setGuestName(full_name || guest_data.guest_name || "");
      setGender(guest_data.gender || "");
      setImagePreview(guest_data.profile_image_url || null);
      
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
        setSessionFee(fee); // ✅ Always use latest DB fee
      }
    } catch (err) {
      console.error("❌ Failed to fetch session fee:", err);
    }
  };

  // ✅ Always call both, no conditions
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

return (
  <div className="min-h-screen w-full bg-white p-2">
    <main className="max-w-screen-md mx-auto">
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
          Day Pass Renewal
        </h1>
        <p className="text-xs text-gray-500">
          Renew a guest's day pass using RFID. No key fob fee required.
        </p>
        {(staffUser || currentUser) && (
          <p className="text-xs text-gray-600 mt-1">
            Staff: <span className="font-medium">{staffName}</span> | 
            Admin ID: <span className="font-medium">{adminId}</span>
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg shadow"
      >
        {/* Column 1 & 2: Form Fields */}
        <div className="md:col-span-2 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-xs text-gray-600">Guest Name</label>
              <input
                type="text"
                value={guestName}
                readOnly
                className="w-full border border-gray-200 px-2 py-1.5 rounded bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-600">RFID Tag</label>
              <input
                type="text"
                value={rfid}
                onChange={(e) => setRfid(e.target.value)}
                placeholder="Scan RFID tag"
                className="w-full border border-gray-300 px-2 py-1.5 rounded text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-xs text-gray-600">Email Address</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full border border-gray-200 px-2 py-1.5 rounded bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-600">Mobile Number</label>
              <input
                type="tel"
                value={mobileNumber}
                readOnly
                className="w-full border border-gray-200 px-2 py-1.5 rounded bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-xs text-gray-600">Gender</label>
              <input
                type="text"
                value={gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : ""}
                readOnly
                className="w-full border border-gray-200 px-2 py-1.5 rounded bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-600">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
                className="w-full border border-gray-300 px-2 py-1.5 rounded text-sm bg-white"
              >
                <option value="">Select Payment Method</option>
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
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
                placeholder={`Enter ${paymentMethod} reference`}
                className="w-full border border-gray-300 px-2 py-1.5 rounded text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">

            <div>
              <label className="block mb-1 text-xs text-gray-600">Session Fee (₱)</label>
              <input
                type="text"
                value={`₱${(sessionFee || 0).toFixed(2)}`}
                readOnly
                className="w-full border border-gray-200 bg-gray-50 px-2 py-1.5 rounded text-sm text-gray-700"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !guest || !paymentMethod}
              className="w-1/2 mt-2 px-4 py-2 rounded bg-black text-white text-sm font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Renew Day Pass"}
            </button>
          </div>
        </div>

        {/* Column 3: Guest Photo */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-700">Guest Photo</label>
          
          <div className="w-40 h-52 border-2 border-gray-300 rounded bg-gray-50 overflow-hidden mx-auto">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Guest"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `
                    <div class="w-full h-full flex items-center justify-center">
                      <span class="text-gray-400 text-xs text-center px-2">
                        ${guestName ? guestName.charAt(0).toUpperCase() : "No Photo"}
                      </span>
                    </div>
                  `;
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400 text-xs text-center px-2">
                  {guestName ? guestName.charAt(0).toUpperCase() : "No Photo"}
                </span>
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Valid Until: <span className="font-medium">Today 11:59 PM</span>
            </p>
          </div>
        </div>
      </form>
    </main>
  </div>
);

};

export default DayPassRenewal;