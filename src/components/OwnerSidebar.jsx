import React, { useState, useEffect, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { FiMenu, FiUsers, FiPieChart, FiBarChart2, FiShoppingCart, FiPackage } from "react-icons/fi";
import { IoPricetagOutline } from "react-icons/io5";
import { useAuth } from "../App";
import trackPageVisit from "../utils/trackPageVisit";

const OwnerSidebar = () => {
  const { user } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = sessionStorage.getItem("owner-sidebar-collapsed");
    return stored ? JSON.parse(stored) : false;
  });

  useEffect(() => {
    sessionStorage.setItem(
      "owner-sidebar-collapsed",
      JSON.stringify(isCollapsed)
    );
  }, [isCollapsed]);

  const toggleSidebar = () => setIsCollapsed((prev) => !prev);

  const navItems = useMemo(() => {
    if (!user) return [];

    return [
      {
        path: "/Admin/AdminAnalyticalDashboard",
        label: "Dashboard",
        icon: <FiPieChart />,
      },
      {
        path: "/Admin/TransactionsReport",
        label: "Sales Report",
        icon: <FiBarChart2 />,
      },
      {
        path: "/Admin/MyOrders",
        label: "My Orders",
        icon: <FiShoppingCart />,
      },
      {
        path: "/Admin/MyRfidInventory",
        label: "RFID Inventory",
        icon: <FiPackage />,
      },
      {
        path: "/Admin/ActivityAnalytics",
        label: "Activity Analytics",
        icon: <FiBarChart2 />,
      },
      {
        path: "/Admin/AdminViewMembers",
        label: "Members Directory",
        icon: <FiUsers />,
      },
      {
        path: "/Admin/AdminViewDayPass",
        label: "Day Pass Guests",
        icon: <FiUsers />,
      },
      {
        path: "/Admin/PricingManagement",
        label: "Pricing",
        icon: <IoPricetagOutline />,
      },
      {
        path: "/Admin/staffManagement",
        label: "Employees Management",
        icon: <FiUsers />,
      },
      {
        path: "/Admin/StaffActivityLogs",
        label: "Employees Activity",
        icon: <FiUsers />,
      },
    ];
  }, [user]);

  return (
    <aside
      className={`min-h-screen bg-gray-900 border-r flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-14" : "w-56"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-4 border-b border-gray-700">
        {!isCollapsed && (
          <div>
            <h2 className="text-sm font-bold text-white">Admin Panel</h2>
            {user && (
              <p className="text-xs text-gray-300 truncate">{user.name}</p>
            )}
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-blue-800 text-white rounded-full"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <FiMenu size={18} />
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 relative">
        <ul className="space-y-1">
          {navItems.map(({ path, label, icon }) => (
            <li key={path} className="relative group">
              <NavLink
                to={path}
                onClick={() => trackPageVisit(label)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-lg transition-all text-xs ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-200 hover:bg-blue-800 hover:text-white"
                  }`
                }
              >
                <span className="text-sm">{icon}</span>

                {!isCollapsed && (
                  <span className="ml-3">{label}</span>
                )}
              </NavLink>

              {isCollapsed && (
                <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-white text-gray-900 text-xs px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
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