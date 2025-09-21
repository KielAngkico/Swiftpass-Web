import React, { useEffect } from "react";
import { useAuth } from "../App"; 
import logo from "../assets/Final_SwiftPass_Logo.jpg";
import api from "../api"; 
import { getAccessToken, setAccessToken } from "../tokenMemory"; 

const Header = ({ onLogoutClick, loading }) => {
  const { user, setUser } = useAuth();

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

  return (
    <header className="bg-gray-700 text-white p-3 flex justify-between items-center sticky z-15 text-xs">
      <div className="flex items-center gap-3">
        <img src={logo} alt="SwiftPass Logo" className="h-8 w-auto" />
        <h1 className="text-xl font-bold">SwiftPass</h1>
      </div>

        <button
          className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
          onClick={onLogoutClick}
          disabled={loading}
        >
          {loading ? "Logging out..." : "Logout"}
        </button>
      
    </header>
  );
};

export default Header;
