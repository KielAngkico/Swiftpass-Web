import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api";

const SubscriptionAddMember = ({ branchName }) => {
  const [formData, setFormData] = useState({
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
    gcash_reference: "",
    plan_name: "",
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [serverMessage, setServerMessage] = useState("");
  const [staffName, setStaffName] = useState("");
  const [availablePlans, setAvailablePlans] = useState([]);
  const [amountToPay, setAmountToPay] = useState(0.0);
  const [subscriptionType, setSubscriptionType] = useState("");
  const [subscriptionStart, setSubscriptionStart] = useState("");
  const [subscriptionExpiry, setSubscriptionExpiry] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);

  const wsRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();


  useEffect(() => {
const fetchStaff = async () => {
  try {
    const { data } = await api.get("/api/auth-status");
    if (!data.isAuthenticated || !data.user) {
      throw new Error("Not authenticated");
    }
    setStaffName(data.user.name);
    setAdminId(data.user.adminId); 
  } catch (err) {
    console.error("❌ Failed to fetch staff user:", err);
    if (err.response?.status === 401) {
      window.location.href = "/login";
    } else {
      navigate("/login");
    }
  }
};
    fetchStaff();
  }, [navigate]);


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
    const { data } = await api.get("/api/payment-methods");
    setPaymentMethods(data);
  } catch (err) {
    console.error("❌ Failed to fetch payment methods:", err);
  }
};
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
const fetchPlans = async () => {
  try {
    const res = await fetch(`${IP}/api/get-pricing`, { credentials: "include" });
    const data = await res.json();
    setAvailablePlans(data.filter((plan) => plan.system_type === "subscription"));
  } catch (err) {
    console.error("❌ Failed to fetch plans:", err);
  }
};
    fetchPlans();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      setSelectedImage(file);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handlePlanChange = (e) => {
    const value = e.target.value;
    const selected = availablePlans.find((plan) => plan.plan_name === value);

    if (selected) {
      const today = new Date();
      const start = today.toISOString().split("T")[0];

      const expiry = new Date(today);
      expiry.setDate(expiry.getDate() + selected.duration_in_days);
      const end = expiry.toISOString().split("T")[0];

      setSubscriptionType(selected.plan_name);
      setAmountToPay(selected.amount_to_pay);
      setSubscriptionStart(start);
      setSubscriptionExpiry(end);
      setFormData((prev) => ({ ...prev, plan_name: selected.plan_name }));
    } else {
      setSubscriptionType("");
      setAmountToPay(0);
      setSubscriptionStart("");
      setSubscriptionExpiry("");
      setFormData((prev) => ({ ...prev, plan_name: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staffName) {
      alert("⚠️ Staff info missing. Please login again.");
      return;
    }

    const requestBody = new FormData();
    Object.entries(formData).forEach(([key, value]) => requestBody.append(key, value || ""));
    requestBody.append("staff_name", staffName);
    requestBody.append("subscription_type", subscriptionType);
    requestBody.append("subscription_start", subscriptionStart);
    requestBody.append("subscription_expiry", subscriptionExpiry);
    requestBody.append("payment", amountToPay);

    if (selectedImage) {
      requestBody.append("member_image", selectedImage);
    }

    try {
      const response = await fetch(`${IP}/api/add-subscription-member`, {
        method: "POST",
        body: requestBody,
      });
      const result = await response.json();
      setServerMessage(result.message);

      if (response.ok) {
        alert("✅ Member added successfully!");
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
          gcash_reference: "",
          plan_name: "",
        });
        setSelectedImage(null);
        setImagePreview(null);
        setSubscriptionType("");
        setAmountToPay(0);
        setSubscriptionStart("");
        setSubscriptionExpiry("");
      } else {
        alert(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      console.error("❌ Error submitting form:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">
          ➕ Add Subscription Member
        </h1>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-white p-8 rounded-2xl shadow-lg"
        >
          {/* LEFT COLUMN (Form Inputs) */}
          <div className="md:col-span-2 space-y-6">
            {/* Personal Info */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Personal Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  className="w-full p-3 border rounded-lg"
                  required
                />
                <input
                  type="text"
                  name="rfid_tag"
                  value={formData.rfid_tag}
                  readOnly
                  className="w-full p-3 border rounded-lg bg-gray-100 text-gray-500"
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full p-3 border rounded-lg col-span-2"
                  required
                />
<input
  type="password"
  name="password"
  value={formData.password}
  onChange={handleChange}
  placeholder="Password"
  className="w-full p-3 border rounded-lg"
  required
  autocomplete="current-password"
/>

                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="Phone Number"
                  className="w-full p-3 border rounded-lg"
                  required
                />
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="Age"
                  className="w-full p-3 border rounded-lg"
                  required
                />
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-lg"
                  required
                >
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Address"
                className="w-full p-3 border rounded-lg mt-4"
                required
              />
            </section>

            {/* Subscription Info */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Subscription Details
              </h2>
              <select
                value={subscriptionType}
                onChange={handlePlanChange}
                className="w-full p-3 border rounded-lg"
                required
              >
                <option value="">-- Choose a Plan --</option>
                {availablePlans.map((plan) => (
                  <option key={plan.id} value={plan.plan_name}>
                    {plan.plan_name} — ₱{plan.amount_to_pay} /{" "}
                    {plan.duration_in_days} days
                  </option>
                ))}
              </select>
              <div className="mt-3">
                <input
                  type="text"
                  value={`₱${amountToPay}`}
                  readOnly
                  className="w-full p-3 border rounded-lg bg-gray-100"
                />
              </div>
            </section>

            {/* Payment Info */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Payment Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-lg"
                  required
                >
                  <option value="">Select Payment Method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.name.toLowerCase()}>
                      {method.name}
                    </option>
                  ))}
                </select>
                {formData.payment_method &&
                  formData.payment_method !== "cash" && (
                    <input
                      type="text"
                      name="reference"
                      value={formData.reference}
                      onChange={handleChange}
                      placeholder={`${formData.payment_method.toUpperCase()} Reference No.`}
                      className="w-full p-3 border rounded-lg"
                      required
                    />
                  )}
              </div>
            </section>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-black text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition"
            >
              ➕ Add Member
            </button>

            {serverMessage && (
              <p className="text-sm text-center text-gray-600 mt-4">
                {serverMessage}
              </p>
            )}
          </div>

          {/* RIGHT COLUMN (Profile Picture Upload) */}
          <div className="flex flex-col items-center justify-start space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Profile Picture
            </h2>
            <div className="w-48 h-48 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-gray-100 overflow-hidden">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-500 text-sm">Choose File</span>
              )}
            </div>
            <input
              type="file"
              name="profile_image_url"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </form>
      </main>
    </div>
  );
};

export default SubscriptionAddMember;
