import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api";
import {IP} from "../../../IpConfig";

const PrepaidAddMember = ({ rfid_tag, staffUser }) => {
  const staffName = staffUser?.name;
  const adminId = staffUser?.adminId;

  const [formData, setFormData] = useState({
    full_name: "",
    gender: "",
    age: "",
    rfid_tag: rfid_tag || "",
    phone_number: "",
    address: "",
    email: "",
    password: "",
    membership_type: "",
    payment: "",
    initial_balance: "",
    payment_method: "cash",
    reference: "",
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [serverMessage, setServerMessage] = useState("");
  const [availablePlans, setAvailablePlans] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const wsRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (rfid_tag) {
      setFormData(prev => ({ ...prev, rfid_tag }));
    }
  }, [rfid_tag]);

  useEffect(() => {
    if (!adminId) return; 
    const fetchPaymentMethods = async () => {
      try {
        const { data } = await api.get(`/api/payment-methods/${adminId}`);
        setPaymentMethods(data);
      } catch (err) {
        console.error("❌ Failed to fetch payment methods:", err);
      }
    };
    fetchPaymentMethods();
  }, [adminId]);

  useEffect(() => {
    const rfidFromState = location.state?.rfid_tag;
    if (rfidFromState && rfidFromState !== formData.rfid_tag) {
      setFormData((prev) => ({ ...prev, rfid_tag: rfidFromState }));
    }
  }, [location.state, formData.rfid_tag]);

 
  useEffect(() => {
    if (!adminId) return; 
    const fetchPlans = async () => {
      try {
        const { data } = await api.get(`/api/get-pricing/${adminId}`);
        setAvailablePlans(data.filter((plan) => plan.system_type === "prepaid_entry"));
      } catch (err) {
        console.error("❌ Failed to fetch plans:", err);
      }
    };
    fetchPlans();
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


  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "plan_name") {
      const selectedPlan = availablePlans.find((plan) => plan.plan_name === value);
      if (selectedPlan) {
        setFormData((prev) => ({
          ...prev,
          plan_name: value,
          payment: selectedPlan.amount_to_pay,
          initial_balance: selectedPlan.amount_to_credit,
        }));
      } else {
        setFormData((prev) => ({ ...prev, plan_name: value, payment: "", initial_balance: "" }));
      }
      return;
    }

    if (name === "payment") {
      const amount = parseFloat(value);
      const computedBalance = isNaN(amount) ? "" : amount.toFixed(2);
      setFormData((prev) => ({ ...prev, payment: value, initial_balance: computedBalance }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!staffName || !adminId) {
    alert("⚠️ Staff info missing. Please login again.");
    return;
  }

  const requestBody = new FormData();
  Object.entries({ ...formData, staff_name: staffName, admin_id: adminId }).forEach(([key, value]) => {
    if (value !== undefined && value !== null) requestBody.append(key, value);
  });

  if (selectedImage) requestBody.append("member_image", selectedImage);


  console.log("📤 Sending FormData:");
  for (let [key, value] of requestBody.entries()) {
    console.log(`${key}:`, value);
  }

  try {
    const response = await api.post("/api/add-member", requestBody, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const result = response.data; 
    setServerMessage(result.message);

    alert("✅ Member added successfully!");
    setFormData({
      full_name: "",
      gender: "",
      age: "",
      rfid_tag: "",
      phone_number: "",
      address: "",
      email: "",
      password: "",
      payment: "",
      payment_method: "cash",
      initial_balance: "",
      reference: "",
    });
    setSelectedImage(null);
    setImagePreview(null);
  } catch (err) {
    console.error("❌ Error submitting form:", err);

    const errorMessage = err.response?.data?.message || "Something went wrong. Please try again.";
    alert(`❌ ${errorMessage}`);
  }
};



return (
  <div className="px-6 py-8 bg-gray-100 min-h-screen">
    <main className="max-w-screen-lg">
      <h1 className="text-xl font-bold mb-6 text-black">➕ Add Prepaid Member</h1>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-white rounded-lg shadow"
      >
        {/* LEFT COLUMN (Form Inputs) */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Personal Info */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-black">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-black">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block mb-1 text-black">RFID Tag</label>
                <input
                  type="text"
                  name="rfid_tag"
                  value={formData.rfid_tag}
                  readOnly
                  className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100 text-black cursor-not-allowed"
                />
              </div>
              <div className="col-span-2">
                <label className="block mb-1 text-black">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block mb-1 text-black">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  className="w-full border border-gray-300 px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block mb-1 text-black">Phone Number</label>
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block mb-1 text-black">Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block mb-1 text-black">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded bg-white"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block mb-1 text-black">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>
          </section>

          {/* Plan Info */}
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-black">Plan Details</h2>
            <select
              name="plan_name"
              value={formData.plan_name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 px-3 py-2 rounded bg-white"
            >
              <option value="">-- Choose a Plan --</option>
              {availablePlans.map((plan) => (
                <option key={plan.id} value={plan.plan_name}>
                  {plan.plan_name} — ₱{plan.amount_to_pay} → ₱
                  {plan.amount_to_credit}
                </option>
              ))}
            </select>
          </section>

          {/* Payment Info */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-black">Payment Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-black">Payment (₱)</label>
                <input
                  type="text"
                  name="payment"
                  value={formData.payment}
                  onChange={handleChange}
                  className="w-full border border-gray-300 px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block mb-1 text-black">Balance to be Added</label>
                <input
                  type="text"
                  name="initial_balance"
                  value={formData.initial_balance}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-50 px-3 py-2 rounded text-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-black">Payment Method</label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 px-3 py-2 rounded bg-white"
                >
                  <option value="">Select Payment Method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.name.toLowerCase()}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>
              {formData.payment_method &&
                formData.payment_method !== "cash" && (
                  <div>
                    <label className="block mb-1 text-black">
                      {formData.payment_method.toUpperCase()} Reference No.
                    </label>
                    <input
                      type="text"
                      name="reference"
                      value={formData.reference}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 px-3 py-2 rounded"
                    />
                  </div>
                )}
            </div>
          </section>

          {/* Submit */}
          <div>
            <button
              type="submit"
              className="w-1/2 mt-2 px-5 py-2 rounded bg-black text-white font-semibold"
            >
              ➕ Add Member
            </button>
            {serverMessage && (
              <p className="text-sm text-gray-600 mt-2">{serverMessage}</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (Profile Picture Upload) */}
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-lg font-semibold text-black">Profile Picture</h2>
          <div className="w-40 h-40 border border-gray-300 rounded flex items-center justify-center bg-gray-50 overflow-hidden">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Profile Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-400 text-sm">Upload Photo</span>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
      </form>
    </main>
  </div>
);


};

export default PrepaidAddMember;
