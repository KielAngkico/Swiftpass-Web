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

const PrepaidDayPass = ({ rfid_tag, staffUser }) => {
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
        const res = await api.get(`/api/session-fee?admin_id=${adminId}`);

        setSessionFee(res.data.session_fee);
      } catch {
        setSessionFee(0);
      } finally {
        setLoadingCheck(false);
      }
    };

    fetchSessionFee();
  }, [rfid, adminId]);

  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateMobile = (number) =>
    /^[0-9]{7,15}$/.test(number);

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
        system_type: "prepaid_entry",
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
    <div className="px-6 py-8 bg-gray-100 h-screen ">
      <main className="max-w-screen-lg">
        <h1 className="text-xl font-bold mb-6 text-black">Prepaid Day Pass</h1>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-lg shadow"
        >
          <div className="md:col-span-2 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-black">Guest Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block mb-1 text-black">RFID Tag</label>
                <input
                  type="text"
                  value={rfid}
                  readOnly
                  placeholder="Scan RFID tag"
                  className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100 text-black cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-black">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block mb-1 text-black">Mobile Number</label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-black">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded bg-white"
                >
                  <option value="" disabled>Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-black">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded bg-white"
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
              <label className="block mb-1 text-black">
                {paymentMethod} Reference
              </label>
              <input
                type="text"
                value={cashlessRef}
                onChange={(e) => setCashlessRef(e.target.value)}
                required
                placeholder={`Enter ${paymentMethod} reference`}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>
          )}


            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-black">RFID Tag Fee(₱)</label>
                <input
                  type="number"
                  value={KEYFOB_FEE}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-50 px-3 py-2 rounded text-black"
                />
              </div>
              <div>
                <label className="block mb-1 text-black">Session Fee (₱)</label>
                <input
                  type="number"
                  value={sessionFee}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-50 px-3 py-2 rounded text-black"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting || loadingCheck}
                className="w-1/2 mt-2 px-5 py-2 rounded bg-black text-white font-semibold"
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

export default PrepaidDayPass;
