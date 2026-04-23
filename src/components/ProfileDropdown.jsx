import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../App";
import { API_URL } from "../config";
import MyProfile from "./MyProfile";
import ChangePassword from "./ChangePassword";

const ProfileDropdown = ({ onLogoutClick, loading }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleSelect = (action) => {
    setOpen(false);
    if (action === "logout") {
      onLogoutClick();
    } else {
      setView(action);
    }
  };

  if (!user) return null;

  return (
    <div className="relative flex items-center gap-3" ref={ref}>
      <span className="hidden sm:block text-sm text-gray-300 font-medium">
        {user.name}
      </span>

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center hover:bg-blue-500 transition-colors border-2 border-transparent hover:border-blue-400 overflow-hidden"
        title={user.name}
      >
        {user.profile_image_url ? (
          <img
            src={`${API_URL}${user.profile_image_url}`}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <span>{getInitials(user.name)}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-52 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{user.role}</p>
          </div>

          <div className="py-1">
            <button
              onClick={() => handleSelect("profile")}
              className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <UserIcon />
              View / Edit Profile
            </button>

            <button
              onClick={() => handleSelect("password")}
              className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LockIcon />
              Change Password
            </button>

            <div className="border-t border-gray-100 my-1" />

            <button
              onClick={() => handleSelect("logout")}
              disabled={loading}
              className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <LogoutIcon />
              {loading ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>
      )}

      <MyProfile isOpen={view === "profile"} onClose={() => setView(null)} />
      <ChangePassword isOpen={view === "password"} onClose={() => setView(null)} />
    </div>
  );
};

const UserIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default ProfileDropdown;