import React from "react";

const Footer = () => {
  return (
    <footer className="bg-black text-white py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="text-sm font-bold text-[#007BFF]">SwiftPass</div>
          <p className="text-gray-400 text-xs text-center md:text-left">
            © {new Date().getFullYear()} SwiftPass. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
