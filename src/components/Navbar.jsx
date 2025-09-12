import React, { useState, useEffect } from "react";
import Login from "../Frontend/Login";
import axios from "axios";
import { API_URL } from "../config";
import { getAccessToken } from "../tokenMemory"; 

const Navbar = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [userName, setUserName] = useState("");

  const fetchUser = async () => {
    try {
      const token = getAccessToken();
      
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const res = await axios.get(`${API_URL}/api/me`, {
        headers,
        withCredentials: true, 
      });

      console.log("🔍 Navbar API response:", res.data);

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
      console.log("🔄 Auth changed - updating navbar");
      fetchUser();
    };

    window.addEventListener("auth-changed", handleAuthChange);

    return () => {
      window.removeEventListener("auth-changed", handleAuthChange);
    };
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full z-10 fixed">
      <div className="mx-auto flex justify-between items-center py-4 px-6 md:px-20 lg:px-32 bg-black">
        <h1 className="font-lg text-white">SWIFTPASS</h1>
        <ul className="hidden md:flex gap-7 text-white">
          <a href="#main" className="cursor-pointer hover:text-gray-400">Home</a>
          <a href="#about" className="cursor-pointer hover:text-gray-400">About</a>
          <a href="#Header" className="cursor-pointer hover:text-gray-400">Projects</a>
          <a href="#Contact" className="cursor-pointer hover:text-gray-400">Contact</a>
        </ul>

        <button
          onClick={() => setIsLoginOpen(true)}
          className="hidden md:block bg-white px-8 py-2 rounded-full hover:bg-gray-100 transition-300"
        >
          {userName ? `Hi, ${userName}` : "Login"}
        </button>
      </div>

      {isLoginOpen && <Login closeModal={() => setIsLoginOpen(false)} />}
    </div>
  );
};

export default Navbar;