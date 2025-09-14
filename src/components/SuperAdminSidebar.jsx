import React, { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiMenu, FiUserPlus, FiPackage } from "react-icons/fi";
import { FaDumbbell } from "react-icons/fa";
import { useAuth } from "../App"; 

const SuperAdminSidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = sessionStorage.getItem("superadmin-sidebar-collapsed");
    return stored ? JSON.parse(stored) : false;
  });

  useEffect(() => {
    sessionStorage.setItem("superadmin-sidebar-collapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => setIsCollapsed(prev => !prev);

  
  const navItems = useMemo(() => {
    if (!user) return [];
    return [
      { path: "/SuperAdmin/addClient", label: "Partners Management", icon: <FiUserPlus /> },
      { path: "/SuperAdmin/ExerciseLibrary", label: "Exercise Library", icon: <FaDumbbell /> },
      { path: "/SuperAdmin/SplitLibrary", label: "Workout Split Library", icon: <FiPackage /> },
      { path: "/SuperAdmin/RepRange", label: "Rep Range", icon: <FiPackage /> },
      { path: "/SuperAdmin/FoodLibrary", label: "Food Library", icon: <FiPackage /> },
      { path: "/SuperAdmin/AllergensMasterList", label: "Allergens Master List", icon: <FiPackage /> },
      { path: "/SuperAdmin/ItemsInventory", label: "Invetory", icon: <FiPackage /> },
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

export default SuperAdminSidebar;
