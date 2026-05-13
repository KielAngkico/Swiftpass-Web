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
    password: "1234",
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
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [showRegistrations, setShowRegistrations] = useState(true);
  const [isFromRegistration, setIsFromRegistration] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, showConfirm } = useToast();

  const { isWebcamActive, videoRef, canvasRef, startWebcam, stopWebcam, capturePhoto } = useWebcam(showToast);

  useEffect(() => {
    if (rfid_tag) setFormData(prev => ({ ...prev, rfid_tag }));
  }, [rfid_tag]);

  useEffect(() => {
    const rfidFromState = location.state?.rfid_tag;
    if (rfidFromState && rfidFromState !== formData.rfid_tag) {
      setFormData((prev) => ({ ...prev, rfid_tag: rfidFromState }));
    }
  }, [location.state, formData.rfid_tag]);
  const customerNumberDisplay = location.state?.customer_number_display || null;

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
        if (membershipPlan) setMembershipFee(parseFloat(membershipPlan.amount_to_pay));
      } catch (err) {
        console.error("❌ Failed to fetch membership fee:", err);
      }
    };
    fetchMembershipFee();
  }, [adminId]);

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

  const handleRegistrationClick = (registration) => {
    setFormData({
      full_name: registration.full_name || "",
      age: registration.age || "",
      gender: registration.gender || "",
      rfid_tag: rfid_tag || "",
      phone_number: registration.phone_number || "",
      address: registration.address || "",
      email: registration.email || "",
      password: registration.password || "1234",
      payment_method: "",
      reference: "",
      emergency_contact_person: registration.emergency_contact_person || "",
      emergency_contact_number: registration.emergency_contact_number || "",
      emergency_contact_relationship: registration.emergency_contact_relationship || "",
    });
    setIsFromRegistration(registration.registration_number);
    showToast({ message: "Registration loaded! Please assign RFID and complete payment.", type: "info" });
  };

  const handleDeleteRegistration = async (registrationNumber, e) => {
    e.stopPropagation();
    showConfirm("Delete this registration request?", async () => {
      try {
        await api.delete(`/api/pending-member-registrations/${registrationNumber}`);
        fetchPendingRegistrations();
        showToast({ message: "Registration deleted successfully!", type: "success" });
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

const validate = () => {
    if (!formData.full_name.trim()) return 'Full name is required';
    if (!/^[a-zA-Z\s\-']+$/.test(formData.full_name.trim())) return 'Full name must be letters and spaces only';

    if (!formData.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email address';

    if (!formData.phone_number.trim()) return 'Phone number is required';
    if (!/^09\d{9}$/.test(formData.phone_number)) return 'Must be a valid PH number (09XXXXXXXXX)';

    if (!formData.age) return 'Age is required';
    if (formData.age < 10 || formData.age > 100) return 'Age must be between 10 and 100';

    if (!formData.gender) return 'Gender is required';

    if (!formData.address.trim()) return 'Address is required';
    if (formData.address.trim().length < 10) return 'Address must be at least 10 characters';

    if (!formData.payment_method) return 'Payment method is required';
    if (formData.payment_method !== 'cash' && !formData.reference.trim()) return 'Reference number is required';

    if (formData.emergency_contact_number && !/^09\d{9}$/.test(formData.emergency_contact_number)) {
      return 'Emergency contact number must be a valid PH number (09XXXXXXXXX)';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) { showToast({ message: error, type: 'error' }); return; }
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
      if (value !== undefined && value !== null && value !== '') requestBody.append(key, value);
    });
    requestBody.append("subscription_type", "Membership");
    requestBody.append("subscription_start", new Date().toISOString().split("T")[0]);
    requestBody.append("subscription_expiry", new Date().toISOString().split("T")[0]);
    requestBody.append("payment", membershipFee);
    requestBody.append("plan_name", "Membership Fee");
    if (selectedImage) requestBody.append("member_image", selectedImage);

    console.log("📤 Sending FormData:");
    for (let [key, value] of requestBody.entries()) console.log(`${key}:`, value);

    try {
      const response = await api.post("/api/add-subscription-member", requestBody, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const result = response.data;
      setServerMessage(result.message);
      showToast({ message: "Member added successfully!", type: "success" });

      if (isFromRegistration) {
        try {
          await api.delete(`/api/pending-member-registrations/${isFromRegistration}`);
          fetchPendingRegistrations();
        } catch (error) {
          console.error("Failed to delete registration:", error);
        }
      }

      setFormData({
        full_name: "", age: "", gender: "", rfid_tag: "", phone_number: "",
        address: "", email: "", password: "1234", payment_method: "", reference: "",
        emergency_contact_person: "", emergency_contact_number: "", emergency_contact_relationship: "",
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

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-xs text-gray-500 mb-1";
  const readonlyClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 bg-gray-50 cursor-not-allowed";

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Add Subscription Member</h1>
        <p className="text-xs text-gray-500 mt-0.5">Fill out the form to register a new subscription member.</p>
      </div>

      {pendingRegistrations.length > 0 && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-xs font-medium text-gray-900">
                Pending Registrations
                <span className="ml-2 text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                  {pendingRegistrations.length}
                </span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Click a registration to review and approve</p>
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
                  <p className="text-xs font-medium text-gray-900">{registration.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{registration.email}</p>
                  <div className="mt-auto pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400">Expires: {getTimeRemaining(registration.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="flex flex-col gap-4 h-full self-stretch">
            <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100">Personal Information</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required placeholder="Enter full name" className={inputClass} />
                </div>
<div>
  <label className={labelClass}>RFID Tag</label>
  <input
    type="text"
    name="rfid_tag"
    value={formData.rfid_tag}
    onChange={(e) =>
      setFormData({ ...formData, rfid_tag: e.target.value })
    }
    className={readonlyClass}
  />
  {customerNumberDisplay && (
    <p className="text-[11px] text-blue-600 font-medium mt-1">{customerNumberDisplay}</p>
  )}
</div>

              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="Enter email" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Password</label>
<input
  type="text"
  name="password"
  value={formData.password}
  onChange={handleChange}
  className={inputClass}
  readOnly
/>                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="text" name="phone_number" value={formData.phone_number} onChange={handleChange} required placeholder="Enter phone" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Age</label>
                  <input type="text" name="age" value={formData.age} onChange={handleChange} required placeholder="e.g. 25" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} required className={`${inputClass} bg-white`}>
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} required placeholder="Enter address" rows={2} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 h-full self-stretch">
            <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100">Emergency Contact</p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Contact Person</label>
                <input type="text" name="emergency_contact_person" value={formData.emergency_contact_person} onChange={handleChange} placeholder="Full name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contact Number</label>
                <input type="text" name="emergency_contact_number" value={formData.emergency_contact_number} onChange={handleChange} placeholder="Phone number" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Relationship</label>
                <input type="text" name="emergency_contact_relationship" value={formData.emergency_contact_relationship} onChange={handleChange} placeholder="Enter Age" className={inputClass} />
              </div>
            </div>

            <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100 mt-2">Payment Information</p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Membership Fee</label>
                <input type="text" value={`₱${membershipFee.toFixed(2)}`} readOnly className={readonlyClass} />
              </div>
              <div>
                <label className={labelClass}>Payment Method</label>
                <select name="payment_method" value={formData.payment_method} onChange={handleChange} required className={`${inputClass} bg-white`}>
                  <option value="">Select</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.name.toLowerCase()}>{method.name}</option>
                  ))}
                </select>
              </div>
              {formData.payment_method && formData.payment_method !== "cash" && (
                <div>
                  <label className={labelClass}>{formData.payment_method.toUpperCase()} Ref No.</label>
                  <input type="text" name="reference" value={formData.reference} onChange={handleChange} required placeholder="Reference number" className={inputClass} />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors">
                Add Member
              </button>
            </div>
            {serverMessage && <p className="text-xs text-gray-400 mt-1">{serverMessage}</p>}
          </div>

          <div className="flex flex-col gap-4 h-full self-stretch">
            <p className="text-sm font-medium text-gray-900 pb-3 border-b border-gray-100">Profile Picture</p>
            <div className="flex flex-col items-center gap-3">
              <div className="w-80 h-80 aspect-square border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                {isWebcamActive ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : imagePreview ? (
                  <img src={imagePreview} alt="Profile Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">Upload or capture photo</span>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2 w-full">
                {!isWebcamActive ? (
                  <>
                    <button
                      type="button"
                      onClick={startWebcam}
                      className="flex-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                    >
                      Open Camera
                    </button>
                    <label className="flex-1 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer text-center">
                      Upload
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                    >
                      Capture
                    </button>
                    <button
                      type="button"
                      onClick={stopWebcam}
                      className="flex-1 bg-white text-red-500 border border-red-100 hover:bg-red-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

export default SubscriptionAddMember;