import React, { useState, useEffect } from "react";
import { API_URL } from "../../config";
import { useWebSocket } from "../../contexts/WebSocketContext";
import { useWebcam } from "../../hooks/useWebcam";

const AddEmployeeModal = ({
  isOpen, onClose, onEmployeeAdded, onEmployeeUpdated,
  adminId, mode = "add", editingEmployee = null, showToast,
}) => {
  const { scanModeEnabled, scannedRfidForStaff, toggleScanMode, clearScannedRfid } = useWebSocket();

  const [formData, setFormData] = useState({
    name: "", age: "", address: "", contact_number: "",
    email: "", password: "pass123", rfid_tag: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Webcam hook
  const { isWebcamActive, videoRef, canvasRef, startWebcam, stopWebcam, capturePhoto } = useWebcam(showToast);

  const handleCapturePhoto = () => {
    capturePhoto((file, preview) => {
      setImageFile(file);
      setImagePreview(preview);
    });
  };

  useEffect(() => {
    if (mode === "edit" && editingEmployee && isOpen) {
      setFormData({
        name: editingEmployee.name || "", age: editingEmployee.age || "",
        address: editingEmployee.address || "", contact_number: editingEmployee.contact_number || "",
        email: editingEmployee.email || "", password: "", rfid_tag: editingEmployee.rfid_tag || "",
      });
      setImagePreview(editingEmployee.profile_image_url || null);
    } else if (mode === "add" && isOpen) {
      setFormData({ name: "", age: "", address: "", contact_number: "", email: "", password: "pass123", rfid_tag: "" });
      setImagePreview(null);
      setImageFile(null);
    }
  }, [mode, editingEmployee, isOpen]);

useEffect(() => {
  if (!scannedRfidForStaff) return;

  const status = scannedRfidForStaff?.status;
  const reason = scannedRfidForStaff?.reason;

  // Always show error toast, regardless of isOpen or scanModeEnabled
  if (status === "error") {
    showToast({ message: reason || "RFID scan failed.", type: "error" });
    clearScannedRfid();
    if (scanModeEnabled) toggleScanMode(false);
    return;
  }

  // Only auto-fill if modal is open
  if (!isOpen) return;

  const rfidTag = typeof scannedRfidForStaff === 'string' ? scannedRfidForStaff : scannedRfidForStaff.rfid_tag;

  if (!rfidTag) {
    showToast({ message: "Invalid RFID data received.", type: "error" });
    clearScannedRfid();
    return;
  }

  setFormData(prev => ({ ...prev, rfid_tag: rfidTag }));
  clearScannedRfid();
  if (scanModeEnabled) toggleScanMode(false);
  showToast({ message: `RFID scanned: ${rfidTag}`, type: "success" });
}, [scannedRfidForStaff, isOpen]);

  // ✅ Stop webcam when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (scanModeEnabled) toggleScanMode(false);
      if (isWebcamActive) stopWebcam();
    }
  }, [isOpen, scanModeEnabled, toggleScanMode, isWebcamActive, stopWebcam]);

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
      showToast({ message: "RFID scan mode disabled", type: "info" });
    } else {
      toggleScanMode(true);
      showToast({ message: "Scan mode active — scan the card now", type: "info", duration: 5000 });
    }
  };

const validate = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (!/^[a-zA-Z\s\-']+$/.test(formData.name.trim())) return 'Name must be letters and spaces only';
    if (formData.name.trim().length < 2) return 'Name must be at least 2 characters';

    if (!formData.age) return 'Age is required';
    if (formData.age < 1 || formData.age > 120) return 'Age must be between 1 and 120';

    if (!formData.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email address';

    if (!formData.contact_number.trim()) return 'Contact number is required';
    if (!/^09\d{9}$/.test(formData.contact_number)) return 'Must be a valid PH number (09XXXXXXXXX)';

    if (!formData.address.trim()) return 'Address is required';
    if (formData.address.trim().length < 10) return 'Address must be at least 10 characters';

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) { showToast({ message: error, type: 'error' }); return; }
    setIsSubmitting(true);
    try {
      const formPayload = new FormData();
      for (const key in formData) {
        if (key === "password" && !formData[key] && mode === "edit") continue;
        formPayload.append(key, formData[key]);
      }
      formPayload.append("admin_id", adminId);
      if (imageFile) formPayload.append("profile_image", imageFile);

      let res, data;

      if (mode === "edit" && editingEmployee) {
        res = await fetch(`${API_URL}/api/update-employee/${editingEmployee.user_id}`, { method: "PUT", body: formPayload });
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
        } else {
          const text = await res.text();
          console.error("Non-JSON response:", text);
          throw new Error("Server returned an invalid response.");
        }
        if (!res.ok) throw new Error(data.message || data.error || "Failed to update employee");

        if (formData.rfid_tag && formData.rfid_tag.trim() !== "" && formData.rfid_tag !== editingEmployee.rfid_tag) {
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
            throw new Error("Failed to update RFID - server error");
          }
          if (!rfidRes.ok) throw new Error(rfidData.error || rfidData.message || "Failed to update RFID");
        }

        onEmployeeUpdated({
          user_id: editingEmployee.user_id, ...formData,
          profile_image_url: data.profile_image_url || editingEmployee.profile_image_url
        });
      } else {
        res = await fetch(`${API_URL}/api/add-employee`, { method: "POST", body: formPayload });
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
        } else {
          const text = await res.text();
          console.error("Non-JSON response:", text);
          throw new Error("Server returned an invalid response.");
        }
        if (!res.ok) throw new Error(data.message || "Failed to add employee");
        onEmployeeAdded({ user_id: data.id, ...formData, profile_image_url: data.profile_image_url });
      }

      setTimeout(() => {
        setFormData({ name: "", age: "", address: "", contact_number: "", email: "", password: "pass123", rfid_tag: "" });
        setImageFile(null);
        setImagePreview(null);
        onClose();
      }, 800);
    } catch (err) {
      showToast({ message: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

const fieldClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 read-only:bg-gray-50 read-only:cursor-not-allowed";
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-medium text-gray-900">{mode === "edit" ? "Edit Employee" : "Add New Employee"}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{mode === "edit" ? "Update employee details and RFID" : "Fill in the employee account details"}</p>
          </div>
          <button onClick={onClose} className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 w-7 h-7 rounded-lg text-xs font-medium transition-colors flex items-center justify-center">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-3 md:col-span-2">
              <p className="text-xs font-medium text-gray-900 pb-2 border-b border-gray-100">Personal Information</p>

              <div className="grid grid-cols-[1fr_80px] gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className={fieldClass} required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Age</label>
                  <input type="number" name="age" value={formData.age} onChange={handleChange} className={fieldClass} required min="1" max="120" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Contact Number</label>
                  <input type="text" name="contact_number" value={formData.contact_number} onChange={handleChange} className={fieldClass} required />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows="2" className={`${fieldClass} resize-none`} required />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Password</label>
                <input type="text" value="pass123" readOnly className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-400 cursor-not-allowed" />
                <p className="text-[11px] text-gray-400 mt-1">Default password </p>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  RFID Tag {mode === "add" && <span className="text-gray-400"></span>}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text" name="rfid_tag" value={formData.rfid_tag} onChange={handleChange}
                    placeholder={scanModeEnabled ? "Scanning..." : mode === "edit" ? "Scan to replace RFID" : "Scan or enter manually"}
                    className={`${fieldClass} flex-1`}
readOnly
                  />
                  <button type="button" onClick={handleScanRfid}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${scanModeEnabled ? "bg-blue-50 text-blue-600 border-blue-200 animate-pulse" : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"}`}>
                    {scanModeEnabled ? "Scanning..." : "Scan RFID"}
                  </button>
                </div>
              </div>
            </div>

            {/* ✅ Profile Photo Column with Camera */}
{/* Profile Photo Column */}
<div className="flex flex-col items-center gap-3">
  <p className="text-xs font-medium text-gray-900 pb-2 border-b border-gray-100 w-full text-center">
    Profile Photo
  </p>

<div className="w-full aspect-square max-w-[260px] bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex items-center justify-center">    {isWebcamActive ? (
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
    ) : imagePreview ? (
      <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
    ) : (
      <span className="text-xs text-gray-400">No image</span>
    )}
  </div>

  <canvas ref={canvasRef} className="hidden" />

  {/* ACTION BUTTONS */}
  <div className="flex gap-2 w-full">
    {!isWebcamActive ? (
      <>
        <button
          type="button"
          onClick={startWebcam}
          className="flex-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
        >
          Open Camera
        </button>

        <label className="flex-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer text-center">
          Upload
          <input
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
        </label>
      </>
    ) : (
      <>
        <button
          type="button"
          onClick={handleCapturePhoto}
          className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          Capture
        </button>

        <button
          type="button"
          onClick={stopWebcam}
          className="flex-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </>
    )}
  </div>
</div>
          </div>

          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40">
              {isSubmitting ? (mode === "edit" ? "Updating..." : "Adding...") : (mode === "edit" ? "Update Employee" : "Add Employee")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;