import React, { useState, useEffect } from "react";
import { API_URL } from "../../config";
import { useWebSocket } from "../../contexts/WebSocketContext";

const AddEmployeeModal = ({ isOpen, onClose, onEmployeeAdded, adminId }) => {
  const { 
    scanModeEnabled, 
    scannedRfidForStaff, 
    toggleScanMode, 
    clearScannedRfid 
  } = useWebSocket();

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    address: "",
    contact_number: "",
    email: "",
    password: "",
    rfid_tag: "", // ✅ NEW: RFID field
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // ✅ Auto-fill RFID when scanned
  useEffect(() => {
    if (scannedRfidForStaff && isOpen) {
      setFormData(prev => ({ ...prev, rfid_tag: scannedRfidForStaff }));
      clearScannedRfid();
      
      setNotification({
        type: "success",
        message: `✅ RFID Card Scanned: ${scannedRfidForStaff}`
      });
      setTimeout(() => setNotification(null), 3000);
    }
  }, [scannedRfidForStaff, isOpen, clearScannedRfid]);

  // ✅ Cleanup scan mode when modal closes
  useEffect(() => {
    if (!isOpen && scanModeEnabled) {
      toggleScanMode(false);
    }
  }, [isOpen, scanModeEnabled, toggleScanMode]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    if (e.target.type === "file") {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(file ? URL.createObjectURL(file) : null);
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleScanRfid = () => {
    if (scanModeEnabled) {
      toggleScanMode(false);
      setNotification({
        type: "info",
        message: "🔴 RFID Scan Mode Disabled"
      });
    } else {
      toggleScanMode(true);
      setNotification({
        type: "info",
        message: "🟢 RFID Scan Mode Active - Please scan RFID card now..."
      });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formPayload = new FormData();
      for (const key in formData) formPayload.append(key, formData[key]);
      formPayload.append("admin_id", adminId);
      if (imageFile) formPayload.append("profile_image", imageFile);

      const res = await fetch(`${API_URL}/api/add-employee`, { method: "POST", body: formPayload });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add employee");

      onEmployeeAdded({ 
        user_id: data.id, 
        ...formData, 
        profile_image_url: data.profile_image_url 
      });

      // Reset form
      setFormData({ 
        name: "", 
        age: "", 
        address: "", 
        contact_number: "", 
        email: "", 
        password: "",
        rfid_tag: "" 
      });
      setImageFile(null);
      setImagePreview(null);

      alert("Employee added successfully!");
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white p-5 rounded-md shadow-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Add New Employee</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ✅ Notification Banner */}
        {notification && (
          <div
            className={`mb-4 p-3 rounded-md text-sm font-medium ${
              notification.type === "success"
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-blue-100 text-blue-800 border border-blue-300"
            }`}
          >
            {notification.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left / Middle columns: Form Fields */}
            <div className="space-y-3 md:col-span-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Age *</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Number *</label>
                <input
                  type="text"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="2"
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* ✅ NEW: RFID Tag Field with Scan Button */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  RFID Tag (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="rfid_tag"
                    value={formData.rfid_tag}
                    onChange={handleChange}
                    placeholder="Scan or enter manually"
                    className="flex-1 p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleScanRfid}
                    className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
                      scanModeEnabled
                        ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    {scanModeEnabled ? "🔴 Scanning..." : "📡 Scan RFID"}
                  </button>
                </div>
                {scanModeEnabled && (
                  <p className="text-xs text-blue-600 mt-1 animate-pulse">
                    ⏳ Waiting for RFID scan...
                  </p>
                )}
              </div>
            </div>

            {/* Right column: Image */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-60 h-60 bg-gray-100 border rounded-md flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">No Image</span>
                )}
              </div>
              <label className="cursor-pointer bg-blue-500 text-white text-xs px-4 py-2 rounded-md hover:bg-blue-600">
                Upload Picture
                <input type="file" accept="image/*" onChange={handleChange} className="hidden" />
              </label>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white px-3 py-2 rounded-md text-xs hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-xs disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
