import React, { useState, useEffect, useRef } from "react";
import api from "../../../api";
import { useToast } from "../../../components/ToastManager";
import { useWebcam } from "../../../hooks/useWebcam";

function formatDateToLocalString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

const readonlyInputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 bg-gray-50 cursor-not-allowed";

const PrepaidDayPass = ({ rfid_tag, staffUser }) => {
  const [rfid, setRfid] = useState(rfid_tag || "");
  const [guestName, setGuestName] = useState("");
  const [gender, setGender] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [sessionFee, setSessionFee] = useState(0);
  const [keyFobFee, setKeyFobFee] = useState(0);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [cashlessRef, setCashlessRef] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
const [selectedImage, setSelectedImage] = useState(null);
const [imagePreview, setImagePreview] = useState(null);
const [pendingRegistrations, setPendingRegistrations] = useState([]);
const [showRegistrations, setShowRegistrations] = useState(true);
const [isFromRegistration, setIsFromRegistration] = useState(false);

  const adminId = staffUser?.adminId || staffUser?.admin_id || staffUser?.userId;
  const staffName = staffUser?.name || "";
const { showToast, showConfirm } = useToast();
  const {
    isWebcamActive,
    videoRef,
    canvasRef,
    startWebcam,
    stopWebcam,
    capturePhoto,
  } = useWebcam(showToast);



  useEffect(() => {
    if (rfid_tag) {
      setRfid(rfid_tag);
    }
  }, [rfid_tag]);

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
    if (!adminId) return;

    const fetchFees = async () => {
      setLoadingCheck(true);
      try {
        const res = await api.get(`/api/session-fee?admin_id=${adminId}`);
        setSessionFee(parseFloat(res.data.session_fee) || 0);
        setKeyFobFee(parseFloat(res.data.key_fob_fee) || 0);
      } catch (err) {
        console.error("❌ Failed to fetch fees:", err);
        setSessionFee(0);
        setKeyFobFee(0);
      } finally {
        setLoadingCheck(false);
      }
    };

    fetchFees();
  }, [adminId]);
useEffect(() => {
    if (!adminId) return;
    fetchPendingRegistrations();
    const interval = setInterval(fetchPendingRegistrations, 30000);
    return () => clearInterval(interval);
  }, [adminId]);

  const fetchPendingRegistrations = async () => {
    try {
      const { data } = await api.get('/api/pending-daypass-registrations', {
        params: { admin_id: adminId, system_type: 'prepaid_entry' }
      });
      setPendingRegistrations(data);
    } catch (error) {
      console.error("Error fetching pending registrations:", error);
    }
  };

  const handleRegistrationClick = (registration) => {
    setGuestName(registration.guest_name || '');
    setGender(registration.gender || '');
    setMobileNumber(registration.phone_number || '');
    setEmail(registration.email || '');
    setIsFromRegistration(registration.registration_number);
    showToast({ message: "Registration loaded! Assign RFID and complete payment.", type: "info" });
  };

  const handleDeleteRegistration = async (registrationNumber, e) => {
    e.stopPropagation();
    showConfirm("Delete this day pass request?", async () => {
      try {
        await api.delete(`/api/pending-daypass-registrations/${registrationNumber}`);
        fetchPendingRegistrations();
        showToast({ message: "Deleted successfully!", type: "success" });
      } catch (error) {
        showToast({ message: "Failed to delete registration", type: "error" });
      }
    });
  };

  const getTimeRemaining = (createdAt) => {
    const created = new Date(createdAt);
    const expiresAt = new Date(created.getTime() + 60 * 60 * 1000);
    const diff = expiresAt - new Date();
    if (diff <= 0) return "Expired";
    return `${Math.floor(diff / 60000)} min left`;
  };
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      setSelectedImage(file);
    }
  };

  const handleCapturePhoto = () => {
    capturePhoto((file, preview) => {
      setSelectedImage(file);
      setImagePreview(preview);
    });
  };
  const validate = () => {
  if (!guestName.trim()) return 'Guest name is required';
  if (!/^[a-zA-Z\s\-']+$/.test(guestName.trim())) return 'Guest name must be letters and spaces only';

  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email address';

  if (!mobileNumber.trim()) return 'Mobile number is required';
  if (!/^09\d{9}$/.test(mobileNumber)) return 'Must be a valid PH number (09XXXXXXXXX)';

  if (!gender) return 'Gender is required';

  if (!paymentMethod) return 'Payment method is required';
  if (paymentMethod.toLowerCase() !== 'cash' && !cashlessRef.trim()) return 'Reference number is required';

  return null;
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validate();
if (error) { showToast({ message: error, type: 'error' }); return; }

if (!adminId || !staffName) {
  showToast({ message: "Staff info missing. Please log in again.", type: "error" });
  return;
}
    setSubmitting(true);

    try {
      const expires_at = new Date();
      expires_at.setHours(23, 59, 59, 999);

      const formData = new FormData();
      formData.append("guest_name", guestName);
      formData.append("gender", gender);
      formData.append("rfid_tag", rfid);
      formData.append("system_type", "prepaid_entry");
      formData.append("staff_name", staffName);
      formData.append("admin_id", adminId);
      formData.append("mobile_number", mobileNumber);
      formData.append("email", email);
      formData.append("expires_at", formatDateToLocalString(expires_at));
      formData.append("payment_method", paymentMethod);
      formData.append(
        "cashless_reference",
        paymentMethod && paymentMethod.toLowerCase() !== "cash" ? cashlessRef.trim() : ""
      );
      formData.append("rfid_keyfob_fee", keyFobFee);

      if (selectedImage) {
        formData.append("guest_image", selectedImage);
      }

      console.log("📤 Sending FormData");

      await api.post("/api/register-session", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
showToast({ message: "Day pass session registered successfully!", type: "success" });

      if (isFromRegistration) {
        try {
          await api.delete(`/api/pending-daypass-registrations/${isFromRegistration}`);
          fetchPendingRegistrations();
        } catch (error) {
          console.error("Failed to delete registration:", error);
        }
      }
      setIsFromRegistration(false);
      setGuestName("");
      setGender("");
      setMobileNumber("");
      setEmail("");
      setCashlessRef("");
      setPaymentMethod("");
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error("Error registering session:", error);
      showToast({
        message: error.response?.data?.error || "Failed to register day pass session. Please try again.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Prepaid Day Pass</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Register guests with an RFID prepaid day pass and payment details.
        </p>
{pendingRegistrations.length > 0 && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-xs font-medium text-gray-900">
                Pending Day Pass Requests
                <span className="ml-2 text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                  {pendingRegistrations.length}
                </span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Click a request to load guest info</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRegistrations(!showRegistrations)}
              className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
            >
              {showRegistrations ? "Hide" : "Show"}
            </button>
          </div>
          {showRegistrations && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              {pendingRegistrations.map((registration) => (
                <div
                  key={registration.registration_number}
                  onClick={() => handleRegistrationClick(registration)}
                  className="bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:border-blue-400 hover:ring-1 hover:ring-blue-200 transition-all flex flex-col"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">
                      {registration.registration_number}
                    </span>
                    <button
                      onClick={(e) => handleDeleteRegistration(registration.registration_number, e)}
                      className="bg-white text-red-500 border border-red-100 hover:bg-red-50 w-5 h-5 rounded-full text-xs font-medium transition-colors flex items-center justify-center"
                    >
                      x
                    </button>
                  </div>
                  <p className="text-xs font-medium text-gray-900">{registration.guest_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{registration.email}</p>
                  <div className="mt-auto pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400">Expires: {getTimeRemaining(registration.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="md:col-span-2 flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100">
            Add Guest
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Guest Name</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                placeholder="Enter full name"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">RFID Tag</label>
              <input
                type="text"
                value={rfid}
                readOnly
                placeholder="Scan RFID tag"
                className={readonlyInputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="guest@email.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mobile Number</label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                required
                placeholder="Enter Phone Number"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
                className={`${inputClass} bg-white`}
              >
                <option value="" disabled>Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
                className={`${inputClass} bg-white`}
              >
                <option value="">Select method</option>
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
              <label className="block text-xs text-gray-500 mb-1">
                {paymentMethod} Reference
              </label>
              <input
                type="text"
                value={cashlessRef}
                onChange={(e) => setCashlessRef(e.target.value)}
                required
                placeholder={`Enter ${paymentMethod} reference`}
                className={inputClass}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">RFID Tag Fee</label>
              <input
                type="text"
                value={`₱${(keyFobFee || 0).toFixed(2)}`}
                readOnly
                className={readonlyInputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Session Fee</label>
              <input
                type="text"
                value={`₱${(sessionFee || 0).toFixed(2)}`}
                readOnly
                className={readonlyInputClass}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
            <button
              type="submit"
              disabled={submitting || loadingCheck}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Add Guest"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100">
            Guest Photo
          </p>

          <div className="w-80 h-80 border border-gray-200 rounded-lg bg-gray-50 overflow-hidden mx-auto">
            {isWebcamActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : imagePreview ? (
              <img
                src={imagePreview}
                alt="Guest"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400 text-xs text-center px-2">No photo</span>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="grid grid-cols-2 gap-2">
{!isWebcamActive ? (
  <>
    <button
      type="button"
      onClick={startWebcam}
      className="w-full bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
    >
      Open Camera
    </button>

    <label className="w-full bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-center">
      Upload Photo
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </label>
  </>
) : (
  <>
    <button
      type="button"
      onClick={handleCapturePhoto}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
    >
      Capture
    </button>

    <button
      type="button"
      onClick={stopWebcam}
      className="w-full bg-white text-red-500 border border-red-100 hover:bg-red-50 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
    >
      Cancel
    </button>
  </>
)}
          </div>
        </div>
      </form>
    </div>
  );
};

export default PrepaidDayPass;