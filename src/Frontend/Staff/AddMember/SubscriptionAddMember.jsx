import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api";
import { useToast } from "../../../components/ToastManager";
import { useWebcam } from "../../../hooks/useWebcam";

const SubscriptionAddMember = ({ rfid_tag, staffUser }) => {
  const staffName = staffUser?.name;
  const adminId = staffUser?.adminId;

  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    gender: "",
    rfid_tag: rfid_tag || "",
    phone_number: "",
    address: "",
    email: "",
    password: "",
    payment_method: "",
    reference: "",
    emergency_contact_person: "",
    emergency_contact_number: "",
    emergency_contact_relationship: "",
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [serverMessage, setServerMessage] = useState("");
  const [membershipFee, setMembershipFee] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState([]);
  
  // ✅ NEW: Pending registrations state
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [showRegistrations, setShowRegistrations] = useState(true);
  const [isFromRegistration, setIsFromRegistration] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, showConfirm } = useToast();
  
  // Use the custom webcam hook
  const {
    isWebcamActive,
    videoRef,
    canvasRef,
    startWebcam,
    stopWebcam,
    capturePhoto
  } = useWebcam(showToast);

  useEffect(() => {
    if (rfid_tag) {
      setFormData(prev => ({ ...prev, rfid_tag }));
    }
  }, [rfid_tag]);

  useEffect(() => {
    const rfidFromState = location.state?.rfid_tag;
    if (rfidFromState && rfidFromState !== formData.rfid_tag) {
      setFormData((prev) => ({ ...prev, rfid_tag: rfidFromState }));
    }
  }, [location.state, formData.rfid_tag]);

  useEffect(() => {
    if (!adminId) return;
    const fetchPaymentMethods = async () => {
      try {
        const { data } = await api.get(`/api/payment-methods/${adminId}`);
        setPaymentMethods(data);
      } catch (err) {
        console.error("Failed to fetch payment methods:", err);
      }
    };
    fetchPaymentMethods();
  }, [adminId]);

  useEffect(() => {
    if (!adminId) return;
    const fetchMembershipFee = async () => {
      try {
        const { data } = await api.get(`/api/get-pricing/${adminId}`);
        const membershipPlan = data.find(
          (plan) => plan.plan_name === "Membership Fee" && plan.system_type === "subscription"
        );
        if (membershipPlan) {
          setMembershipFee(parseFloat(membershipPlan.amount_to_pay));
        }
      } catch (err) {
        console.error("❌ Failed to fetch membership fee:", err);
      }
    };
    fetchMembershipFee();
  }, [adminId]);

  // ✅ NEW: Fetch pending registrations
  useEffect(() => {
    if (!adminId) return;
    fetchPendingRegistrations();
    const interval = setInterval(fetchPendingRegistrations, 30000);
    return () => clearInterval(interval);
  }, [adminId]);

  const fetchPendingRegistrations = async () => {
    try {
const { data } = await api.get('/api/pending-member-registrations', {
  params: { admin_id: adminId, system_type: 'subscription' }
});
setPendingRegistrations(data);
    } catch (error) {
      console.error("Error fetching pending registrations:", error);
    }
  };

  // ✅ NEW: Handle registration click
  const handleRegistrationClick = (registration) => {
    setFormData({
      full_name: registration.full_name || "",
      age: registration.age || "",
      gender: registration.gender || "",
      rfid_tag: rfid_tag || "",
      phone_number: registration.phone_number || "",
      address: registration.address || "",
      email: registration.email || "",
      password: registration.password || "",
      payment_method: "",
      reference: "",
      emergency_contact_person: registration.emergency_contact_person || "",
      emergency_contact_number: registration.emergency_contact_number || "",
      emergency_contact_relationship: registration.emergency_contact_relationship || "",
    });
    
    setIsFromRegistration(registration.registration_number);
    showToast({ message: "Registration loaded! Please assign RFID and complete payment.", type: "info" });
  };

  // ✅ NEW: Delete registration
  const handleDeleteRegistration = async (registrationNumber, e) => {
    e.stopPropagation();
    showConfirm(
      "Delete this registration request?",
      async () => {
        try {
          await api.delete(`/api/pending-member-registrations/${registrationNumber}`);
          fetchPendingRegistrations();
          showToast({ message: "Registration deleted successfully!", type: "success" });
        } catch (error) {
          showToast({ message: "Failed to delete registration", type: "error" });
        }
      }
    );
  };

  // ✅ NEW: Get time remaining
  const getTimeRemaining = (createdAt) => {
    const created = new Date(createdAt);
    const expiresAt = new Date(created.getTime() + 60 * 60 * 1000);
    const now = new Date();
    const diff = expiresAt - now;
    
    if (diff <= 0) return "Expired";
    
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min left`;
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!staffName || !adminId) {
      showToast({ message: "Staff info missing. Please login again.", type: "error" });
      return;
    }

    if (membershipFee <= 0) {
      showToast({ message: "Membership fee not found. Please contact administrator.", type: "error" });
      return;
    }

    const requestBody = new FormData();

    Object.entries({ ...formData, staff_name: staffName, admin_id: adminId }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        requestBody.append(key, value);
      }
    });

    requestBody.append("subscription_type", "Membership");
    requestBody.append("subscription_start", new Date().toISOString().split("T")[0]);
    requestBody.append("subscription_expiry", new Date().toISOString().split("T")[0]);
    requestBody.append("payment", membershipFee);
    requestBody.append("plan_name", "Membership Fee");

    if (selectedImage) requestBody.append("member_image", selectedImage);

    console.log("📤 Sending FormData:");
    for (let [key, value] of requestBody.entries()) {
      console.log(`${key}:`, value);
    }

    try {
      const response = await api.post("/api/add-subscription-member", requestBody, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result = response.data;
      setServerMessage(result.message);

      showToast({ message: "Member added successfully!", type: "success" });

      // ✅ NEW: Delete registration if it was from pending
      if (isFromRegistration) {
        try {
          await api.delete(`/api/pending-member-registrations/${isFromRegistration}`);
          fetchPendingRegistrations();
        } catch (error) {
          console.error("Failed to delete registration:", error);
        }
      }

      setFormData({
        full_name: "",
        age: "",
        gender: "",
        rfid_tag: "",
        phone_number: "",
        address: "",
        email: "",
        password: "",
        payment_method: "",
        reference: "",
        emergency_contact_person: "",
        emergency_contact_number: "",
        emergency_contact_relationship: "",
      });
      setSelectedImage(null);
      setImagePreview(null);
      setIsFromRegistration(false);

    } catch (err) {
      console.error("❌ Error submitting form:", err);

      if (err.response) {
        console.log("Server error response:", err.response.data);
        showToast({ message: err.response.data.message || 'Something went wrong', type: "error" });
      } else if (err.request) {
        showToast({ message: "Network error. Please check your connection.", type: "error" });
      } else {
        showToast({ message: "Something went wrong. Please try again.", type: "error" });
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-white p-2">
      <main className="max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
            Add Subscription Member
          </h1>
          <p className="text-xs text-gray-500">
            Fill out the form to register a new subscription member.
          </p>
        </div>

        {/* ✅ NEW: Pending Registrations Section */}
        {pendingRegistrations.length > 0 && (
          <div className="mb-6 bg-gray-50 border border-gray-300 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">
                  Pending Registrations ({pendingRegistrations.length})
                </h2>
                <p className="text-xs text-gray-600">Click a registration to review and approve</p>
              </div>
              <button
                onClick={() => setShowRegistrations(!showRegistrations)}
                className="text-gray-700 hover:text-gray-900 text-xs font-medium underline"
              >
                {showRegistrations ? "Hide" : "Show"}
              </button>
            </div>

            {showRegistrations && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {pendingRegistrations.map((registration) => (
                  <div
                    key={registration.registration_number}
                    onClick={() => handleRegistrationClick(registration)}
                    className="bg-white border border-gray-300 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-gray-500 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-medium">
                        {registration.registration_number}
                      </span>
                      <button
                        onClick={(e) => handleDeleteRegistration(registration.registration_number, e)}
                        className="text-gray-400 hover:text-red-600 text-sm font-bold"
                      >
                        ×
                      </button>
                    </div>
                    
                    <h3 className="font-semibold text-base text-gray-900">
                      {registration.full_name}
                    </h3>
                    
                    <p className="text-xs text-gray-600 mt-1">
                      {registration.email}
                    </p>
                    
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Expires: {getTimeRemaining(registration.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-white rounded-lg shadow"
        >
          <div className="flex flex-col gap-4 h-full self-stretch">
            <h2 className="text-sm font-semibold text-gray-700">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">RFID Tag</label>
                <input
                  type="text"
                  name="rfid_tag"
                  value={formData.rfid_tag}
                  readOnly
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-gray-100 text-gray-700"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Phone</label>
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-white"
                >
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 h-full self-stretch">
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Emergency Contact</h2>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Emergency Contact Person</label>
                  <input
                    type="text"
                    name="emergency_contact_person"
                    value={formData.emergency_contact_person}
                    onChange={handleChange}
                    placeholder="Full name"
                    className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Emergency Contact Number</label>
                  <input
                    type="text"
                    name="emergency_contact_number"
                    value={formData.emergency_contact_number}
                    onChange={handleChange}
                    placeholder="Phone number"
                    className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Relationship</label>
                  <input
                    type="text"
                    name="emergency_contact_relationship"
                    value={formData.emergency_contact_relationship}
                    onChange={handleChange}
                    placeholder="Relationship"
                    className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Membership Fee</h2>
              <input
                type="text"
                value={`₱${membershipFee.toFixed(2)}`}
                readOnly
                className="w-full border border-gray-200 bg-gray-50 px-3 py-2 rounded text-sm text-gray-700 font-semibold"
              />
            </section>

            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Payment Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Payment Method</label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    required
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
                {formData.payment_method && formData.payment_method !== "cash" && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      {formData.payment_method.toUpperCase()} Ref No.
                    </label>
                    <input
                      type="text"
                      name="reference"
                      value={formData.reference}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
                    />
                  </div>
                )}
              </div>
            </section>

            <button
              type="submit"
              className="w-1/2 mt-2 px-4 py-2 rounded bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700"
            >
              Add Member
            </button>
            {serverMessage && (
              <p className="text-xs text-gray-500 mt-2">{serverMessage}</p>
            )}
          </div>

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

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-2 w-3/4">
              {!isWebcamActive ? (
                <>
                  <button
                    type="button"
                    onClick={startWebcam}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700"
                  >
                     Open Camera
                  </button>
                  <label className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 cursor-pointer text-center">
                     Upload
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

export default SubscriptionAddMember;