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

    const handleAuthChange = () => {
      fetchUser();
    };

    window.addEventListener("auth-changed", handleAuthChange);
    return () => {
      window.removeEventListener("auth-changed", handleAuthChange);
    };
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
        <ul className="hidden md:flex gap-7 text-white text-sm/5">
          <a href="#main" className="cursor-pointer hover:text-gray-400 ">Home</a>
          <a href="#about" className="cursor-pointer hover:text-gray-400">About</a>
          <a href="#Header" className="cursor-pointer hover:text-gray-400">Features</a>
          <a href="#Contact" className="cursor-pointer hover:text-gray-400">Contact</a>
        </ul>
        <button
          onClick={() => setIsLoginOpen(true)}
          className="hidden md:block bg-[#007BFF] text-white px-6 py-2 rounded-xl hover:bg-[#0056b3] transition text-sm"
        >
          {userName ? `Hi, ${userName}` : "Login"}
        </button>
        <button
          className="md:hidden text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </div>
      {isMenuOpen && (
        <div className="md:hidden bg-gray-100 text-black flex flex-col items-center py-4 space-y-4 shadow-lg">
          <a href="#main" className="hover:text-gray-400" onClick={() => setIsMenuOpen(false)}>Home</a>
          <a href="#about" className="hover:text-gray-400" onClick={() => setIsMenuOpen(false)}>About</a>
          <a href="#Header" className="hover:text-gray-400" onClick={() => setIsMenuOpen(false)}>Projects</a>
          <a href="#Contact" className="hover:text-gray-400" onClick={() => setIsMenuOpen(false)}>Contact</a>
          <button
            onClick={() => {
              setIsLoginOpen(true);
              setIsMenuOpen(false);
            }}
            className="bg-white px-6 py-2 rounded-full text-black hover:bg-gray-100 transition"
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
