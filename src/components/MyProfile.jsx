import React, { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../App";
import { API_URL } from "../config";
import api from "../api";

const MyProfile = ({ isOpen, onClose }) => {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ message: "", type: "" });
  const [form, setForm] = useState({});
  const fileRef = useRef(null);
const [previewImage, setPreviewImage] = useState(null);
const [imageFile, setImageFile] = useState(null);
const [showQR, setShowQR] = useState(false);
const qrRef = useRef(null);

  if (!isOpen) return null;

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const showNotification = (message, type = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: "" }), 4000);
  };

  const startEdit = () => {
setForm({
  name: user?.name || "",
  age: user?.age || "",
  address: user?.address || "",
  contact_number: user?.contact_number || "",
  gym_code: user?.gym_code || "",
});
    setPreviewImage(null);
    setImageFile(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setPreviewImage(null);
    setImageFile(null);
    setNotification({ message: "", type: "" });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showNotification("Image must be under 2MB");
      return;
    }
    setImageFile(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      showNotification("Name is required");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      if (form.age) formData.append("age", form.age);
      if (form.address) formData.append("address", form.address);
      if (form.gym_code) formData.append("gym_code", form.gym_code);
      if (form.contact_number) formData.append("contact_number", form.contact_number);
      if (imageFile) formData.append("profile_image", imageFile);

      const res = await api.put("/api/profile/update", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (res.data?.user) {
        setUser(res.data.user);
        showNotification("Profile updated successfully", "success");
        setEditing(false);
        setPreviewImage(null);
        setImageFile(null);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = previewImage || (user?.profile_image_url ? `${API_URL}${user.profile_image_url}` : null);

  // Reusable read-only field matching code 2's grid style
  const Field = ({ label, value, fullWidth = false }) => {
    if (!value) return null;
    return (
      <div className={`mb-3 border-b border-gray-50 pb-1 ${fullWidth ? "col-span-2" : "col-span-1"}`}>
        <div className="text-[9px] text-gray-400 uppercase tracking-tight">{label}</div>
        <div className="text-xs text-gray-600 truncate">{value}</div>
      </div>
    );
  };

  // Editable field — same label style as Field, but renders an input
  const EditField = ({ label, fullWidth = false, children }) => (
    <div className={`mb-3 pb-1 ${fullWidth ? "col-span-2" : "col-span-1"}`}>
      <div className="text-[9px] text-gray-400 uppercase tracking-tight mb-1">{label}</div>
      {children}
    </div>
  );

  const inputCls = "w-full border border-gray-200 rounded px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400";

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
      <div className="bg-white w-full max-w-[340px] rounded-lg shadow-2xl border border-gray-100 pointer-events-auto p-5">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-900 text-xs uppercase tracking-widest">
            {editing ? "Edit Profile" : "Profile"}
          </span>
          <button
            onClick={() => { cancelEdit(); onClose(); }}
            className="text-gray-300 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Avatar + name row */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-shrink-0">
            <div className="w-30 h-30 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center overflow-hidden">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; }}
                />
              ) : (
                <span className="text-gray-400 text-sm tracking-tighter">
                  {getInitials(user?.name)}
                </span>
              )}
            </div>
            {editing && (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center border-2 border-white hover:bg-black transition-colors"
                  title="Change photo"
                >
                  <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </>
            )}
          </div>
          <div className="overflow-hidden">
            <div className="text-sm text-gray-800 truncate">{user?.name}</div>
            <div className="text-[10px] text-indigo-500 uppercase tracking-tight">{user?.role}</div>
          </div>
        </div>

        {/* Notification */}
        {notification.message && (
          <div className={`mb-4 px-3 py-2 rounded text-xs border ${
            notification.type === "success"
              ? "bg-green-50 text-green-700 border-green-100"
              : "bg-red-50 text-red-600 border-red-100"
          }`}>
            {notification.message}
          </div>
        )}

        {/* Fields — same grid layout, switches between read/edit */}
        <div className="grid grid-cols-2 gap-x-4">
{editing ? (
  <>
    <EditField label="Full Name" fullWidth={true}>
      <input
        type="text"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className={inputCls}
      />
    </EditField>
    {user?.role === "admin" && (
  <EditField label="Gym Code" fullWidth={true}>
    <input
      type="text"
      value={form.gym_code}
      onChange={(e) => setForm({ ...form, gym_code: e.target.value.toUpperCase() })}
      placeholder="Enter gym code"
      className={inputCls}
    />
  </EditField>
)}
    {user?.role === "staff" && (
      <EditField label="Age">
        <input
          type="text"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value.replace(/\D/g, "") })}
          placeholder="Enter age"
          className={inputCls}
        />
      </EditField>
    )}

    <EditField label="Address" fullWidth={true}>
      <input
        type="text"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        placeholder="Enter address"
        className={inputCls}
      />
    </EditField>

    {user?.role === "staff" && (
      <EditField label="Contact Number" fullWidth={true}>
        <input
          type="text"
          value={form.contact_number}
          onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
          placeholder="Enter contact number"
          className={inputCls}
        />
      </EditField>
    )}
  </>
          ) : (
            <>
<Field label="Email Address" value={user?.email} fullWidth={true} />

{user?.role === "admin" && (
  <>
<Field label="Gym Name" value={user?.gym_name} />
<Field label="Status" value={user?.status} />
<Field label="Gym Code" value={user?.gym_code} />
{user?.gym_code && (
  <div className="col-span-2 mb-3">
    <button
      onClick={() => setShowQR(true)}
      className="text-[11px] text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors"
    >
      View QR Code
    </button>
  </div>
)}
<Field
  label="Joined Date"
  value={user?.created_at ? new Date(user.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null}
/>
<Field label="Address" value={user?.address} />
<Field
  label="Subscription Start"
  value={user?.subscription_start_date ? new Date(user.subscription_start_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null}
/>
<Field label="System" value={user?.system_type} />
<Field
  label="Subscription End"
  value={user?.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null}
/>

  </>
)}
{user?.role === "staff" && (
  <>
    <Field label="Gym Name" value={user?.gym_name} />
    <Field label="Status" value={user?.status} />
    <Field label="Gym Code" value={user?.gym_code} />
    <Field label="Address" value={user?.address} />
    <Field label="Gym Owner" value={user?.admin_name} />
    <Field label="Age" value={user?.age} />
    <Field
      label="Joined Date"
      value={user?.created_at ? new Date(user.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null}
    />
    <Field label="Contact" value={user?.contact_number} />
  </>
)}

            </>
          )}
        </div>

        {/* Footer buttons */}
{showQR && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center gap-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-medium text-gray-900">Members Registration QR Code</p>
              <p className="text-xs text-gray-500">{user?.gym_name}</p>
              <div ref={qrRef} className="p-3 border border-gray-200 rounded-lg bg-white">
                <QRCodeSVG
                  value={`${import.meta.env.VITE_IP}/member-registration?gym_code=${user?.gym_code}`}
                  size={180}
                />
              </div>
<p className="text-[10px] text-gray-400 break-all text-center">
                {import.meta.env.VITE_IP}/member-registration?gym_code={user?.gym_code}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const svg = qrRef.current?.querySelector("svg");
                    if (!svg) return;
                    const serialized = new XMLSerializer().serializeToString(svg);
                    const blob = new Blob([serialized], { type: "image/svg+xml" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${user?.gym_code}-qr.svg`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={() => setShowQR(false)}
                  className="text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {editing ? (
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-800 text-white text-[11px] rounded transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              onClick={cancelEdit}
              className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-[11px] rounded transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2 mt-4">
            <button
              onClick={startEdit}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-800 text-white text-[11px] rounded transition-all active:scale-[0.98]"
            >
              Edit Profile
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-[11px] rounded transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProfile;