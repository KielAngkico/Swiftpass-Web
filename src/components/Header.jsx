import React, { useState, useEffect } from "react";
import { useAuth } from "../App"; 
import logo from "../assets/Final_SwiftPass_Logo.jpg";
import api from "../api"; 
import { getAccessToken, setAccessToken } from "../tokenMemory"; 
import ProfileDropdown from "./ProfileDropdown";

const SubscriptionBanner = ({ user }) => {
  if (user?.role !== "admin" || !user?.subscription_end_date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(user.subscription_end_date);
  endDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

  if (daysLeft > 14) return null;

  let message = "";
  let bgColor = "";
  let textColor = "";

  if (daysLeft < 0) {
    message = "Your subscription has expired.";
    bgColor = "#dc2626";
    textColor = "#fff";
  } else if (daysLeft === 0) {
    message = "Your subscription expires today!";
    bgColor = "#dc2626";
    textColor = "#fff";
  } else {
    message = `Your subscription expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}.`;
    bgColor = "#f59e0b";
    textColor = "#1c1917";
  }

  return (
    <div style={{ background: bgColor, color: textColor }}
      className="w-full text-center text-xs py-1.5 px-4 font-medium tracking-wide">
      ⚠️ {message}
    </div>
  );
};

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
    <>
      <header className="bg-[#212529] text-white p-3 flex justify-between items-center sticky z-15 text-xs">
        <div className="flex items-center gap-3">
          <img src={logo} alt="SwiftPass Logo" className="h-8 w-auto" />
          <h1 className="text-xl font-bold">SwiftPass</h1>
        </div>

        {user && (
          <ProfileDropdown onLogoutClick={onLogoutClick} loading={loading} />
        )}
      </header>

      {user && <SubscriptionBanner user={user} />}
    </>
  );
};

export default Header;