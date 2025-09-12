import React, { useState, useEffect, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { FiMenu, FiUserPlus, FiUsers, FiClipboard, FiLogIn } from "react-icons/fi";
import { useAuth } from "../App";

const StaffSidebar = () => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = sessionStorage.getItem("sidebar-collapsed");
    return stored ? JSON.parse(stored) : false;
  });

  useEffect(() => {
    sessionStorage.setItem("sidebar-collapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const navItems = useMemo(() => {
    if (!user) return [];
    return [
      { path: "/Staff/member-entry", label: "Member Entry", icon: <FiLogIn /> },
      { path: "/Staff/view-members", label: "View Members", icon: <FiUsers /> },
      { path: "/Staff/DayPass", label: "Day Pass", icon: <FiUserPlus /> },
      { path: "/Staff/AddMember", label: "Add Member", icon: <FiUserPlus /> },
      {
        path: "/Staff/MembershipTransactions",
        label: user.systemType === "subscription" ? "Renewal" : "Top Up",
        icon: <FiClipboard />,
      },
    ];
  }, [user]);

  const toggleSidebar = () => setIsCollapsed(prev => !prev);

  return (
    <aside
      className={`min-h-screen bg-gray-900 border-r flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        {!isCollapsed && (
          <h2 className="text-lg font-bold text-white">
            {user ? `Hello, ${user.name}!` : "Guest"}
          </h2>
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

              {/* Hover label when collapsed */}
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

export default StaffSidebar;
