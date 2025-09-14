import React, { useEffect } from "react";
import { useAuth } from "../App"; 
import logo from "../assets/Final_SwiftPass_Logo.jpg";
import api from "../api"; 
import { getAccessToken, setAccessToken } from "../tokenMemory"; 

const Header = ({ onLogoutClick, loading }) => {
  const { user, setUser } = useAuth();


useEffect(() => {
  const fetchUserInfo = async () => {
    try {
      const token = getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      console.log("📤 Fetching /api/me with headers:", headers);

      const res = await api.get("/api/me", { headers, withCredentials: true });

      console.log("📥 /api/me response:", res.data);

      if (res.data?.user) {
        setUser(res.data.user);
        if (res.data.accessToken) setAccessToken(res.data.accessToken);
      } else {
        setUser(null);
        setAccessToken(null);
      }
    } catch (err) {
      console.error("❌ Failed to fetch user info:", err.response?.status, err.response?.data || err.message);
      setUser(null);
      setAccessToken(null);
    }
  };

  fetchUserInfo();
}, [setUser]);


  return (
    <header className="bg-gray-700 text-white p-4 flex justify-between items-center sticky z-20">
      {/* Logo and App Name */}
      <div className="flex items-center gap-3">
        <img src={logo} alt="SwiftPass Logo" className="h-10 w-auto" />
        <h1 className="text-xl font-bold">SwiftPass</h1>
      </div>

      {/* User Info and Logout */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="text-sm">
            <span className="font-medium">Hi! {user.name}</span>
            {user.role && <span className="text-gray-300 ml-2">({user.role})</span>}
          </div>
        )}

        <button
          className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
          onClick={onLogoutClick}
          disabled={loading}
        >
          {loading ? "Logging out..." : "Logout"}
        </button>
      </div>
    </header>
  );
};

export default Header;
