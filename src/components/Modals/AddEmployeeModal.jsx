import React, { useState, useEffect } from "react";
import { API_URL } from "../../config";
import { useWebSocket } from "../../contexts/WebSocketContext";

const AddEmployeeModal = ({ 
  isOpen, 
  onClose, 
  onEmployeeAdded, 
  onEmployeeUpdated,
  adminId,
  mode = "add",
  editingEmployee = null
}) => {
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
    rfid_tag: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // ✅ Populate form when editing
  useEffect(() => {
    if (mode === "edit" && editingEmployee && isOpen) {
      setFormData({
        name: editingEmployee.name || "",
        age: editingEmployee.age || "",
        address: editingEmployee.address || "",
        contact_number: editingEmployee.contact_number || "",
        email: editingEmployee.email || "",
        password: "",
        rfid_tag: editingEmployee.rfid_tag || "",
      });
      setImagePreview(editingEmployee.profile_image_url || null);
    } else if (mode === "add" && isOpen) {
      setFormData({
        name: "",
        age: "",
        address: "",
        contact_number: "",
        email: "",
        password: "",
        rfid_tag: "",
      });
      setImagePreview(null);
    }
  }, [mode, editingEmployee, isOpen]);

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
      for (const key in formData) {
        // Skip password if empty in edit mode
        if (key === "password" && !formData[key] && mode === "edit") continue;
        formPayload.append(key, formData[key]);
      }
      formPayload.append("admin_id", adminId);
      if (imageFile) formPayload.append("profile_image", imageFile);

      let res, data;
      
      if (mode === "edit" && editingEmployee) {
        console.log("🔄 Updating employee ID:", editingEmployee.user_id);
        console.log("📋 Form data:", formData);
        console.log("🏷️ Old RFID:", editingEmployee.rfid_tag);
        console.log("🏷️ New RFID:", formData.rfid_tag);
        
        // STEP 1: Update employee basic info (name, email, etc.)
        res = await fetch(`${API_URL}/api/update-employee/${editingEmployee.user_id}`, {
          method: "PUT",
          body: formPayload
        });
        
        // Check if response is JSON
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
        } else {
          const text = await res.text();
          console.error("❌ Non-JSON response:", text);
          throw new Error("Server returned an invalid response. Check console for details.");
        }
        
        if (!res.ok) throw new Error(data.message || data.error || "Failed to update employee");
        
        console.log("✅ Basic info updated successfully");
        
        // STEP 2: If RFID changed, update it separately
        if (formData.rfid_tag && formData.rfid_tag.trim() !== "" && formData.rfid_tag !== editingEmployee.rfid_tag) {
          console.log("🔄 RFID changed - calling replace endpoint...");
          
          const rfidRes = await fetch(`${API_URL}/api/replace-employee-rfid/${editingEmployee.user_id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ new_rfid_tag: formData.rfid_tag })
          });
          
          const rfidContentType = rfidRes.headers.get("content-type");
          let rfidData;
          
          if (rfidContentType && rfidContentType.includes("application/json")) {
            rfidData = await rfidRes.json();
          } else {
            const text = await rfidRes.text();
            console.error("❌ RFID endpoint non-JSON response:", text);
            throw new Error("Failed to update RFID - server error");
          }
          
          if (!rfidRes.ok) {
            throw new Error(rfidData.error || rfidData.message || "Failed to update RFID");
          }
          
          console.log("✅ RFID updated successfully:", rfidData);
        }
        
        onEmployeeUpdated({ 
          user_id: editingEmployee.user_id,
          ...formData, 
          profile_image_url: data.profile_image_url || editingEmployee.profile_image_url
        });
        
        setNotification({
          type: "success",
          message: "✅ Employee updated successfully!"
        });
      } else {
        // Add new employee
        res = await fetch(`${API_URL}/api/add-employee`, {
          method: "POST",
          body: formPayload
        });
        
        // Check if response is JSON
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
        } else {
          const text = await res.text();
          console.error("Non-JSON response:", text);
          throw new Error("Server returned an invalid response. Check console for details.");
        }
        
        if (!res.ok) throw new Error(data.message || "Failed to add employee");

        onEmployeeAdded({ 
          user_id: data.id, 
          ...formData, 
          profile_image_url: data.profile_image_url 
        });
        
        setNotification({
          type: "success",
          message: "✅ Employee added successfully!"
        });
      }

      // Reset form
      setTimeout(() => {
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
        setNotification(null);
        onClose();
      }, 1500);

    } catch (err) {
      setNotification({
        type: "error",
        message: `❌ ${err.message}`
      });
      setTimeout(() => setNotification(null), 4000);
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
          <h2 className="text-lg font-semibold text-gray-800">
            {mode === "edit" ? "Edit Employee" : "Add New Employee"}
          </h2>
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
                : notification.type === "error"
                ? "bg-red-100 text-red-800 border border-red-300"
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
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password {mode === "edit" ? "(leave blank to keep current)" : "*"}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required={mode === "add"}
                  placeholder={mode === "edit" ? "Leave blank to keep current password" : ""}
                />
              </div>

              {/* ✅ RFID Tag Field with Scan Button */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  RFID Tag {mode === "add" ? "(Optional)" : "*"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="rfid_tag"
                    value={formData.rfid_tag}
                    onChange={handleChange}
                    placeholder={mode === "edit" ? "Scan to replace RFID" : "Scan or enter manually"}
                    className="flex-1 p-2 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    required={mode === "edit"}
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
              {isSubmitting 
                ? (mode === "edit" ? "Updating..." : "Adding...") 
                : (mode === "edit" ? "Update Employee" : "Add Employee")
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
