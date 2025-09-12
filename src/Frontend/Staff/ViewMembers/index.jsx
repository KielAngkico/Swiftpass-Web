import React, { useState, useEffect } from "react";
import StaffSidebar from "../../../components/StaffSidebar";
import PrepaidView from "./PrepaidView";
import SubscriptionView from "./SubscriptionView";
import api from "../../../api";

const StaffViewMember = () => {
  const [systemType, setSystemType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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



  return (
    <div className="flex">
      <StaffSidebar />
      <div className="flex-1 p-4">
        {systemType === "prepaid_entry" ? <PrepaidView /> : <SubscriptionView />}
      </div>
    </div>
  );
};

export default StaffViewMember;