import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import StaffSidebar from "../../../components/StaffSidebar";
import PrepaidTapUp from "./PrepaidTapUp"; 
import SubscriptionRenewal from "./SubscriptionRenewal";
import api from "../../../api";

const MembershipTransactions = () => {
  const location = useLocation();
  const { rfid_tag, full_name, current_balance, subscription_expiry } = location.state || {};
  
  const [systemType, setSystemType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data } = await api.get("/api/auth-status");
        console.log("📥 Staff info response:", data);
        
        if (!data.isAuthenticated || !data.user) {
          throw new Error("Not authenticated");
        }
        
        const systemType = data.user.systemType || data.user.system_type || "";
        console.log("🔍 System type:", systemType);
        setSystemType(systemType.toLowerCase().trim());
      } catch (err) {
        console.error("❌ Failed to fetch staff user:", err);
        setError(err.message);
        
        if (err.response?.status === 401) {
          window.location.href = "/login";
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);


  if (loading) {
    return (
      <div className="flex">
        <StaffSidebar />
        <div className="flex-1 p-6 text-center py-12">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading transaction system...</p>
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
            Error Loading Transaction System
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

  return (
    <div className="flex">
      <StaffSidebar />
      <div className="flex-1 p-4">
        {systemType === "prepaid_entry" ? (
          <PrepaidTapUp
            rfid_tag={rfid_tag}
            full_name={full_name}
            current_balance={current_balance}
          />
        ) : (
          <SubscriptionRenewal
            rfid_tag={rfid_tag}
            full_name={full_name}
            subscription_expiry={subscription_expiry}
          />
        )}
      </div>
    </div>
  );
};

export default MembershipTransactions;