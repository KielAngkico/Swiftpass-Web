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

  const adminId = staffUser?.adminId || staffUser?.admin_id || staffUser?.userId;
  const staffName = staffUser?.name || "";
  const { showToast } = useToast();

  // Use the custom webcam hook
  const {
    isWebcamActive,
    videoRef,
    canvasRef,
    startWebcam,
    stopWebcam,
    capturePhoto
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
        setSessionFee(res.data.session_fee || 0);
        setKeyFobFee(res.data.key_fob_fee || 0);
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
      formData.append("system_type", "prepaid_entry");
      formData.append("staff_name", staffName);
      formData.append("admin_id", adminId);
      formData.append("mobile_number", mobileNumber);
      formData.append("email", email);
      formData.append("expires_at", formatDateToLocalString(expires_at));
      formData.append("payment_method", paymentMethod);
      formData.append("cashless_reference", paymentMethod && paymentMethod.toLowerCase() !== "cash" ? cashlessRef.trim() : "");
      formData.append("rfid_keyfob_fee", keyFobFee);

      if (selectedImage) {
        formData.append("guest_image", selectedImage);
      }

      console.log("📤 Sending FormData:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      await api.post("/api/register-session", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showToast({ message: "Day pass session registered successfully!", type: "success" });
      
      // Reset form
      setGuestName("");
      setGender("");
      setMobileNumber("");
      setEmail("");
      setCashlessRef("");
      setSelectedImage(null);
      setImagePreview(null);
      setPaymentMethod("");
    } catch (error) {
      console.error("Error registering session:", error);
      showToast({ message: error.response?.data?.error || "Failed to register day pass session. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white p-2">
      <main className="max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
            Prepaid Day Pass
          </h1>
          <p className="text-xs text-gray-500">
            Register guests with an RFID prepaid day pass and payment details.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-white rounded-lg shadow"
        >
          {/* Column 1: Guest Information */}
          <div className="flex flex-col gap-4 h-full self-stretch">
            <h2 className="text-sm font-semibold text-gray-700">Guest Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Guest Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">RFID Tag</label>
                <input
                  type="text"
                  value={rfid}
                  readOnly
                  placeholder="Scan RFID tag"
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-gray-100 text-gray-700"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-white"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Column 2: Payment Information */}
          <div className="flex flex-col gap-4 h-full self-stretch">
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Payment Information</h2>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    required
                    className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-white"
                  >
                    <option value="">Select</option>
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.name}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </div>
                {paymentMethod && paymentMethod.toLowerCase() !== "cash" && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      {paymentMethod} Reference
                    </label>
                    <input
                      type="text"
                      value={cashlessRef}
                      onChange={(e) => setCashlessRef(e.target.value)}
                      required
                      placeholder={`Enter ${paymentMethod} reference`}
                      className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                    />
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Fees</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">RFID Tag Fee</label>
                  <input
                    type="text"
                    value={`₱${keyFobFee.toFixed(2)}`}
                    readOnly
                    className="w-full border border-gray-200 bg-gray-50 px-3 py-2 rounded text-sm text-gray-700 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Session Fee</label>
                  <input
                    type="text"
                    value={`₱${sessionFee.toFixed(2)}`}
                    readOnly
                    className="w-full border border-gray-200 bg-gray-50 px-3 py-2 rounded text-sm text-gray-700 font-semibold"
                  />
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={submitting || loadingCheck}
              className="w-1/2 mt-2 px-4 py-2 rounded bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Add Guest"}
            </button>
          </div>

          {/* Column 3: Profile Picture */}
          <div className="flex flex-col items-center gap-3 w-80">
            <h2 className="text-sm font-semibold text-gray-700">Profile Picture</h2>
            <div className="bg-white border rounded-lg shadow w-3/4">
              <div className="bg-black h-16 flex items-center justify-center">
                <h3 className="text-white font-semibold text-sm">PHOTO</h3>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="w-50 h-50 border border-gray-300 rounded flex items-center justify-center bg-gray-50 overflow-hidden">
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
                      alt="Profile Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-sm">Upload or Capture Photo</span>
                  )}
                </div>
              </div>
            </div>

            {/* Hidden canvas for capturing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Webcam Controls */}
            <div className="flex gap-2 w-3/4">
              {!isWebcamActive ? (
                <>
                  <button
                    type="button"
                    onClick={startWebcam}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700"
                  >
                    📷 Open Camera
                  </button>
                  <label className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 cursor-pointer text-center">
                    📁 Upload
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
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700"
                  >
                    📸 Capture
                  </button>
                  <button
                    type="button"
                    onClick={stopWebcam}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700"
                  >
                    ✖ Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default PrepaidDayPass;