import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import StaffSidebar from "../../../components/StaffSidebar";
import PrepaidAddMember from "./PrepaidAddMember";
import SubscriptionAddMember from "./SubscriptionAddMember";
import api from "../../../api";

const AddMember = () => {
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

  const rfid_tag = location.state?.rfid_tag || "";
  const final_system_type = location.state?.system_type || systemType;

  if (!user) return <div className="p-6 text-gray-600">Loading user data...</div>;

  return (
    <div className="flex">
      <StaffSidebar />
      <div className="flex-1 p-4">
{final_system_type === "prepaid_entry" ? (
  <PrepaidAddMember rfid_tag={rfid_tag} />  
) : (
  <SubscriptionAddMember rfid_tag={rfid_tag} />
)}
      </div>
    </div>
  );
};

export default AddMember;
