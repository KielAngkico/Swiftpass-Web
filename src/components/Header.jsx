import React, { useState, useEffect } from "react";
import { useAuth } from "../App"; 
import logo from "../assets/Final_SwiftPass_Logo.jpg";
import api from "../api"; 
import { getAccessToken, setAccessToken } from "../tokenMemory"; 
import { API_URL } from "../config"; // ✅ Added this import
import MyProfile from "../Frontend/myProfile";

const Header = ({ onLogoutClick, loading }) => {
  const { user, setUser } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = getAccessToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await api.get("/api/me", { headers, withCredentials: true });

        setUser(res.data?.user || null);
        if (res.data?.accessToken) setAccessToken(res.data.accessToken);
        if (!res.data?.user) setAccessToken(null);
      } catch {
        setUser(null);
        setAccessToken(null);
      }
    };

    fetchUser();
  }, [setUser]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

return (
  <>
    <header className="bg-[#212529] text-white p-3 flex justify-between items-center sticky z-15 text-xs">
      <div className="flex items-center gap-3">
        <img src={logo} alt="SwiftPass Logo" className="h-8 w-auto" />
        <h1 className="text-xl font-bold">SwiftPass</h1>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowProfile(true)}
            className="w-8 h-8 rounded-full bg-blue-600 text-white text-[10px] font-medium flex items-center justify-center hover:bg-blue-700 transition-colors overflow-hidden border border-gray-700"
            title={user.name}
          >
            {user.profile_image_url ? (
              <img
                src={`${API_URL}${user.profile_image_url}`}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <span>{getInitials(user.name)}</span>
            )}
          </button>

          <button
            className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
            onClick={onLogoutClick}
            disabled={loading}
          >
            {loading ? "Logging out..." : "Logout"}
          </button>
        </div>
      )}
    </header>

    <MyProfile isOpen={showProfile} onClose={() => setShowProfile(false)} />
  </>
);
};

export default Header;