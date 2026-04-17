import React from "react";
import { useAuth } from "../App";
import { API_URL } from "../config";

const MyProfile = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  if (!isOpen) return null;

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const Field = ({ label, value, fullWidth = false }) => {
    if (!value) return null;
    return (
      <div className={`mb-3 border-b border-gray-50 pb-1 ${fullWidth ? "col-span-2" : "col-span-1"}`}>
        <div className="text-[9px] text-gray-400 uppercase tracking-tight">{label}</div>
        <div className="text-xs text-gray-600 truncate">{value}</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
      <div className="bg-white w-full max-w-[340px] rounded-lg shadow-2xl border border-gray-100 pointer-events-auto p-5">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-900 text-xs uppercase tracking-widest">Profile</span>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors">✕</button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
            {user?.profile_image_url ? (
              <img
                src={`${API_URL}${user.profile_image_url}`}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.src = ""; 
                  e.target.style.display = "none";
                }}
              />
            ) : null}
            
            {!user?.profile_image_url && (
              <span className="text-gray-400 text-sm tracking-tighter">
                {getInitials(user?.name)}
              </span>
            )}
          </div>
          
          <div className="overflow-hidden">
            <div className="text-sm text-gray-800 truncate">{user?.name}</div>
            <div className="text-[10px] text-indigo-500 uppercase tracking-tight">{user?.role}</div>
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="Email Address" value={user?.email} fullWidth={true} />
          
          <Field label="Status" value={user?.status} />
          <Field label="Age" value={user?.age} />

          {user?.role === "admin" && (
            <>
              <Field label="System" value={user?.system_type} />
              <Field label="Gym" value={user?.gym_name} />
            </>
          )}

          {user?.role === "staff" && (
            <>
              <Field label="Gym" value={user?.gym_name} />
              <Field label="Contact" value={user?.contact_number} />
              <Field label="Manager" value={user?.admin_name} fullWidth={true} />
            </>
          )}

          <Field 
            label="Joined Date" 
            value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : null} 
            fullWidth={true}
          />
        </div>

        <button 
          onClick={onClose}
          className="mt-4 w-full py-2 bg-gray-900 text-white text-[11px] rounded transition-all hover:bg-black active:scale-[0.98]"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default MyProfile;