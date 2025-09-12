import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import StaffSidebar from "../../../components/StaffSidebar";
import PrepaidDayPass from "./PrepaidDayPass";
import SubscriptionDayPass from "./SubscriptionDayPass";
import api from "../../../api";

const DayPass = () => {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [systemType, setSystemType] = useState("");

  useEffect(() => {
    const fetchStaffInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data } = await api.get("/api/auth-status");
        console.log("📥 Staff info response:", data);
        
        if (!data.isAuthenticated || !data.user) {
          throw new Error("Not authenticated");
        }

        setUser(data.user);
        const systemType = data.user.systemType || data.user.system_type || "";
        console.log("🔍 System type:", systemType);
        setSystemType(systemType);
        
      } catch (err) {
        console.error("❌ Failed to fetch staff info:", err);
        setError(err.message);
        
        if (err.response?.status === 401) {
          window.location.href = "/login";
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchStaffInfo();
  }, []);

  if (loading) {
    return (
      <div className="flex">
        <StaffSidebar />
        <div className="flex-1 p-6 text-center py-12">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading day pass system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex">
        <StaffSidebar />
        <div className="flex-1 p-6 text-center py-12">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Error Loading Day Pass System
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const rfid_tag = location.state?.rfid_tag || "";
  const final_system_type = location.state?.system_type || systemType;

  return (
    <div className="flex">
      <StaffSidebar />
      <div className="flex-1 p-4">
        {final_system_type === "prepaid_entry" ? (
          <PrepaidDayPass rfid_tag={rfid_tag} />
        ) : (
          <SubscriptionDayPass rfid_tag={rfid_tag} />
        )}
      </div>
    </div>
  );
};

export default DayPass;