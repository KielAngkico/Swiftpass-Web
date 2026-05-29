import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import { useLocation } from "react-router-dom";
import Login from "../Frontend/Login";
import axios from "axios";
import { API_URL } from "../config";
import { getAccessToken } from "../tokenMemory";
import { FaBars, FaTimes } from "react-icons/fa";
import logo from "../../uploads/Final_SwiftPass_Logo-cropped.png";

const Navbar = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const fetchUser = async () => {
    try {
      const token = getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.get(`${API_URL}/api/me`, {
        headers,
        withCredentials: true,
      });

      if (res.data?.user) {
        setUserName(res.data.user.name || "");
      } else {
        setUserName("");
      }
    } catch (err) {
      console.warn("❌ Navbar failed to fetch user:", err.response?.data || err.message);
      setUserName("");
    }
  };

  useEffect(() => {
    fetchUser();

    const handleAuthChange = () => fetchUser();
    window.addEventListener("auth-changed", handleAuthChange);
    return () => window.removeEventListener("auth-changed", handleAuthChange);
  }, []);

  if (location.pathname !== "/") return null;

  return (
    <div className="absolute top-0 left-0 w-full z-15 fixed">
      <div className="mx-auto flex justify-between items-center py-3 px-5 md:px-20 lg:px-32 bg-[#212529]">
        <img
          src={logo}
          alt="Swiftpass Logo"
          className="h-8 md:h-9 object-contain"
        />

        {/* Desktop Nav Links */}
        <ul className="hidden md:flex gap-7 text-white text-sm/5 items-center">
          <a href="#main" className="cursor-pointer hover:text-gray-400">Home</a>
          <a href="#about" className="cursor-pointer hover:text-gray-400">About</a>
          <a href="#features" className="cursor-pointer hover:text-gray-400">Features</a>
          <a href="#Contact" className="cursor-pointer hover:text-gray-400">Contact</a>

          {/* Registration Forms Dropdown */}
          <div className="relative group">
            <button className="cursor-pointer hover:text-gray-400 flex items-center gap-1">
              Registration Forms
              <span className="text-xs">▾</span>
            </button>
            <div className="absolute top-full left-0 mt-2 w-48 bg-white text-black rounded-xl shadow-lg overflow-hidden opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-50">
              <a
                href="/member-registration"
                className="block px-4 py-3 text-sm hover:bg-blue-50 hover:text-blue-600 border-b border-gray-100"
              >
                Member Registration
              </a>
              <a
                href="/partner-registration"
                className="block px-4 py-3 text-sm hover:bg-blue-50 hover:text-blue-600"
              >
                Partner Registration
              </a>
            </div>
          </div>
        </ul>

        {/* Desktop Login Button */}
        <div className="hidden md:flex items-center">
          <button
            onClick={() => setIsLoginOpen(true)}
            className="bg-[#007BFF] text-white px-6 py-2 rounded-xl hover:bg-[#0056b3] transition text-sm"
          >
            {userName ? `Hi, ${userName}` : "Login"}
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-100 text-black flex flex-col items-center py-4 space-y-4 shadow-lg">
          <a href="#main" className="hover:text-gray-400" onClick={() => setIsMenuOpen(false)}>Home</a>
          <a href="#about" className="hover:text-gray-400" onClick={() => setIsMenuOpen(false)}>About</a>
          <a href="#features" className="hover:text-gray-400" onClick={() => setIsMenuOpen(false)}>Features</a>
          <a href="#Contact" className="hover:text-gray-400" onClick={() => setIsMenuOpen(false)}>Contact</a>
          <a
            href="/member-registration"
            className="border border-gray-800 px-6 py-2 rounded-xl text-black hover:bg-gray-200 transition text-sm"
            onClick={() => setIsMenuOpen(false)}
          >
            Member Register
          </a>
          <a
            href="/partner-registration"
            className="border border-gray-800 px-6 py-2 rounded-xl text-black hover:bg-gray-200 transition text-sm"
            onClick={() => setIsMenuOpen(false)}
          >
            Partner Register
          </a>
          <button
            onClick={() => {
              setIsLoginOpen(true);
              setIsMenuOpen(false);
            }}
            className="bg-[#007BFF] px-6 py-2 rounded-xl text-white hover:bg-[#0056b3] transition text-sm"
          >
            {userName ? `Hi, ${userName}` : "Login"}
          </button>
        </div>
      )}

      {isLoginOpen && <Login closeModal={() => setIsLoginOpen(false)} />}
    </div>
  );
};

export default Navbar;