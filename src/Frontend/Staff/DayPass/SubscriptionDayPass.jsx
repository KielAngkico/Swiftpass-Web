import React, { useState, useEffect } from "react";
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

const SubscriptionDayPass = ({ rfid_tag, staffUser }) => {
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

  const adminId = staffUser?.adminId || staffUser?.admin_id || staffUser?.userId;
  const staffName = staffUser?.name || "";
  const { showToast } = useToast();

  const {
    isWebcamActive,
    videoRef,
    canvasRef,
    startWebcam,
    stopWebcam,
    capturePhoto,
  } = useWebcam(showToast);

  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateMobile = (number) =>
    /^[0-9]{7,15}$/.test(number);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      showToast({ message: "Please enter a valid email address.", type: "error" });
      return;
    }

    if (!validateMobile(mobileNumber)) {
      showToast({ message: "Please enter a valid mobile number (7-15 digits).", type: "error" });
      return;
    }

    if (paymentMethod && paymentMethod.toLowerCase() !== "cash" && cashlessRef.trim() === "") {
      showToast({ message: "Please enter your cashless payment reference number.", type: "error" });
      return;
    }

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
      formData.append("system_type", "subscription");
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
        <h1 className="text-xl font-semibold text-gray-900">Subscription Day Pass</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Register guests with an RFID subscription day pass and payment details.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                placeholder="09xxxxxxxxx"
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
                <option value="other">Other</option>
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
              onClick={handleSubmit}
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

          <div className="w-40 h-52 border border-gray-200 rounded-lg bg-gray-50 overflow-hidden mx-auto">
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
      </div>
    </div>
  );
};

export default SubscriptionDayPass;