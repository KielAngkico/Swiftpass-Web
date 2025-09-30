import React, { useState, useEffect } from "react";
import api from "../../../api";

const KEYFOB_FEE = 20;

function formatDateToLocalString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

const SubscriptionDayPass = ({ rfid_tag, staffUser }) => {
  const [rfid, setRfid] = useState(rfid_tag || "");
  const [guestName, setGuestName] = useState("");
  const [gender, setGender] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [sessionFee, setSessionFee] = useState(0);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [cashlessRef, setCashlessRef] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);

  const adminId = staffUser?.adminId || staffUser?.admin_id || staffUser?.userId;
  const staffName = staffUser?.name || "";
const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validateMobile = (number) =>
  /^[0-9]{7,15}$/.test(number);


  useEffect(() => {
    if (!adminId) return;

    const fetchPaymentMethods = async () => {
      try {
        const { data } = await api.get(`/api/payment-methods/${adminId}`);
        if (Array.isArray(data)) {
          setPaymentMethods(data);
        } else if (Array.isArray(data.methods)) {
          setPaymentMethods(data.methods);
        }
      } catch (err) {
        console.error("❌ Failed to fetch payment methods:", err);
      }
    };

    fetchPaymentMethods();
  }, [adminId]);



  useEffect(() => {
    if (!rfid || !adminId) return;

    const fetchSessionFee = async () => {
      setLoadingCheck(true);
      try {
        const res = await axios.get(`/api/session-fee?admin_id=${adminId}`);
        setSessionFee(res.data.session_fee);
      } catch {
        setSessionFee(0);
      } finally {
        setLoadingCheck(false);
      }
    };

    fetchSessionFee();
  }, [rfid, adminId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    if (!validateMobile(mobileNumber)) {
      alert("Please enter a valid mobile number (7-15 digits).");
      return;
    }

    if (paymentMethod === "Cashless" && cashlessRef.trim() === "") {
      alert("Please enter your cashless payment reference number.");
      return;
    }

    if (!adminId || !staffName) {
      alert("⚠️ Staff info missing. Please log in again.");
      return;
    }

    setSubmitting(true);

    try {
      const expires_at = new Date();
      expires_at.setHours(23, 59, 59, 999);

      const payload = {
        guest_name: guestName,
        gender,
        rfid_tag: rfid,
        system_type: "subscription",
        staff_name: staffName,
        admin_id: adminId,
        mobile_number: mobileNumber,
        email,
        expires_at: formatDateToLocalString(expires_at),
        payment_method: paymentMethod,
        cashless_reference: paymentMethod === "Cashless" ? cashlessRef.trim() : "",
        rfid_keyfob_fee: KEYFOB_FEE,
      };

      console.log("Submitting payload:", payload);

      await api.post("/api/register-session", payload);

      alert("Day pass session registered successfully!");
      setGuestName("");
      setGender("");
      setMobileNumber("");
      setEmail("");
      setCashlessRef("");
    } catch (error) {
      console.error("Error registering session:", error);
      alert("Failed to register day pass session. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

return (
  <div className="min-h-screen w-full bg-white p-2">
    <main className="max-w-screen-md">
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
          Subscription Day Pass
        </h1>
        <p className="text-xs text-gray-500">
          Register guests with an RFID subscription day pass and payment details.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg shadow"
      >
        <div className="md:col-span-2 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-xs text-gray-600">Guest Name</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                className="w-full border border-gray-300 px-2 py-1.5 rounded text-sm"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-600">RFID Tag</label>
              <input
                type="text"
                value={rfid}
                readOnly
                placeholder="Scan RFID tag"
                className="w-full border border-gray-200 px-2 py-1.5 rounded bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-xs text-gray-600">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 px-2 py-1.5 rounded text-sm"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-600">Mobile Number</label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                required
                className="w-full border border-gray-300 px-2 py-1.5 rounded text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-xs text-gray-600">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
                className="w-full border border-gray-300 px-2 py-1.5 rounded text-sm bg-white"
              >
                <option value="" disabled>
                  Select gender
                </option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-600">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-gray-300 px-2 py-1.5 rounded text-sm bg-white"
              >
                <option value="">Select</option>
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
                {paymentMethod} Reference
              </label>
              <input
                type="text"
                value={cashlessRef}
                onChange={(e) => setCashlessRef(e.target.value)}
                required
                placeholder={`Enter ${paymentMethod} reference`}
                className="w-full border border-gray-300 px-2 py-1.5 rounded text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-xs text-gray-600">RFID Tag Fee (₱)</label>
              <input
                type="number"
                value={KEYFOB_FEE}
                readOnly
                className="w-full border border-gray-200 bg-gray-50 px-2 py-1.5 rounded text-sm text-gray-700"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-600">Session Fee (₱)</label>
              <input
                type="number"
                value={sessionFee}
                readOnly
                className="w-full border border-gray-200 bg-gray-50 px-2 py-1.5 rounded text-sm text-gray-700"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting || loadingCheck}
              className="w-1/2 mt-2 px-4 py-2 rounded bg-black text-white text-sm font-medium hover:bg-gray-900 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Add Member"}
            </button>
          </div>
        </div>
      </form>
    </main>
  </div>
);

};

export default SubscriptionDayPass;
