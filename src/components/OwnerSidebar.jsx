import React, { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiMenu, FiUsers, FiPieChart, FiFileText } from "react-icons/fi";
import { IoPricetagOutline } from "react-icons/io5";
import { useAuth } from "../App"; 

const OwnerSidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = sessionStorage.getItem("owner-sidebar-collapsed");
    return stored ? JSON.parse(stored) : false;
  });

  useEffect(() => {
    sessionStorage.setItem("owner-sidebar-collapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => setIsCollapsed(prev => !prev);

  const navItems = useMemo(() => {
    if (!user) return [];
    return [
      { path: "/Admin/AdminAnalyticalDashboard", label: "Dashboard", icon: <FiPieChart /> },
      { path: "/Admin/TransactionsReport", label: "Sales Report", icon: <FiFileText /> },
      { path: "/Admin/ActivityAnalytics", label: "Activity Analytics", icon: <FiFileText /> },
      { path: "/Admin/AdminViewMembers", label: "Members Directory", icon: <FiUsers /> },
      { path: "/Admin/PricingManagement", label: "Pricing", icon: <IoPricetagOutline /> },
      { path: "/Admin/staffManagement", label: "Staff", icon: <FiUsers /> },
    ];
  }, [user]);

  return (
    <aside
      className={`min-h-screen bg-gray-900 border-r flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        {!isCollapsed && (
          <div>
            <h2 className="text-lg font-bold text-white">Admin Panel</h2>
            {user && <p className="text-sm text-gray-300">{user.name}</p>}
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-blue-800 text-white rounded-full"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <FiMenu size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 relative">
        <ul className="space-y-2">
          {navItems.map(({ path, label, icon }) => (
            <li key={path} className="relative group">
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded-lg transition-all ${
                    isActive ? "bg-blue-600 text-white" : "text-white hover:bg-blue-800"
                  }`
                }
              >
                <span className="text-xl">{icon}</span>
                {!isCollapsed && <span className="ml-4">{label}</span>}
              </NavLink>

              {/* Hover tooltip when collapsed */}
              {isCollapsed && (
                <span className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 bg-white text-gray-900 px-3 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default OwnerSidebar;
