import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

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
  
  const staffName = staffUser?.name || "";
  const adminId = staffUser?.adminId || staffUser?.admin_id || staffUser?.userId;

  const [rfid, setRfid] = useState(scannedRfid || "");
  const [guest, setGuest] = useState(
    scannedRfid && guest_data
      ? guest_data
      : null
  );
  const [guestName, setGuestName] = useState(full_name || guest_data?.guest_name || "");
  const [gender, setGender] = useState(guest_data?.gender || "");
  const [imagePreview, setImagePreview] = useState(guest_data?.profile_image_url || null);

  const [sessionFee, setSessionFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mock functions for demo
  const showToast = ({ message, type }) => {
    console.log(`${type.toUpperCase()}: ${message}`);
    alert(`${type.toUpperCase()}: ${message}`);
  };

  // Update state when navigation state changes
  useEffect(() => {
    if (scannedRfid && guest_data) {
      setRfid(scannedRfid);
      setGuest(guest_data);
      setGuestName(full_name || guest_data.guest_name || "");
      setGender(guest_data.gender || "");
      setImagePreview(guest_data.profile_image_url || null);
    }
  }, [scannedRfid, guest_data, full_name]);

  // Mock data for demo
  useEffect(() => {
    // Mock payment methods
    setPaymentMethods([
      { id: 1, name: "Cash" },
      { id: 2, name: "GCash" },
      { id: 3, name: "Card" }
    ]);
    
    // Mock session fee
    setSessionFee(50);
    
    // Mock guest data for demo
    if (!guest) {
      setGuest({
        rfid_tag: "DEMO123",
        guest_name: "John Doe",
        gender: "male",
        profile_image_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400",
        paid_amount: 50,
        admin_id: adminId
      });
      setGuestName("John Doe");
      setGender("male");
      setImagePreview("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      showToast({ message: "Day pass renewed successfully!", type: "success" });
      
      // Reset form
      setGuest(null);
      setRfid("");
      setGuestName("");
      setGender("");
      setImagePreview(null);
      setPaymentMethod("");
      setReference("");
    } catch (err) {
      console.error("❌ Error renewing day pass:", err);
      showToast({ message: "Failed to renew day pass.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 p-6">
      <main className="max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
            Day Pass Renewal
          </h1>
          <p className="text-xs text-gray-500">
            Renew a guest's day pass using RFID. No key fob fee required.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white rounded-lg shadow items-start"
        >
          {/* Left Column: Form Fields */}
          <div className="flex flex-col gap-4 h-full">
            <h2 className="text-sm font-semibold text-gray-700">
              Guest Details & Payment
            </h2>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Scan or Enter RFID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rfid}
                  onChange={(e) => setRfid(e.target.value)}
                  placeholder="Enter RFID tag"
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm focus:ring focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => showToast({ message: "Searching...", type: "info" })}
                  className="px-4 py-2 rounded bg-black text-white font-semibold text-sm hover:bg-gray-800"
                >
                  Search
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Guest Name</label>
              <input
                type="text"
                value={guestName}
                readOnly
                className="w-full border border-gray-200 px-3 py-2 rounded bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Gender</label>
                <input
                  type="text"
                  value={gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : ""}
                  readOnly
                  className="w-full border border-gray-200 px-3 py-2 rounded bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Session Fee</label>
                <input
                  type="text"
                  value={`₱${(sessionFee || 0).toFixed(2)}`}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-50 px-3 py-2 rounded text-sm text-gray-700"
                />
              </div>
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
                  {paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Reference No.
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

            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-xs text-green-700 font-medium">
                ✓ No key fob fee required for renewals
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-1/2 mt-4 px-4 py-2 rounded bg-black text-white font-semibold text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Renew Day Pass"}
            </button>
          </div>

          {/* Right Column: Guest ID Card (matches PrepaidTapUp style) */}
          <div className="flex flex-col items-center gap-3 w-full">
            <h2 className="text-sm font-semibold text-gray-700">Guest ID</h2>
            <div className="bg-white border rounded-lg shadow w-3/4 max-w-sm">
              <div className="bg-black h-16 flex items-center justify-center">
                <h3 className="text-white font-semibold text-sm">DAY PASS GUEST ID</h3>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="w-32 h-32 border border-gray-300 rounded flex items-center justify-center bg-gray-50 overflow-hidden mb-3">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Guest Photo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-4xl font-bold">
                      {guestName
                        ? guestName.charAt(0).toUpperCase()
                        : "?"}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-semibold text-gray-800 text-center">
                  {guestName || "No Guest Loaded"}
                </h4>
                <p className="text-xs text-gray-600 mt-2">
                  Valid Until:{" "}
                  <span className="font-medium">Today 11:59 PM</span>
                </p>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default DayPassRenewal;