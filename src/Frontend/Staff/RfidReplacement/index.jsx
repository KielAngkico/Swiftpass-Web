import React, { useState, useEffect } from "react";
import StaffSidebar from "../../../components/StaffSidebar";
import PrepaidReplacement from "./PrepaidReplacement";
import SubscriptionReplacement from "./SubscriptionReplacement";
import api from "../../../api";

const RfidReplacement = () => {
  const [staffUser, setStaffUser] = useState(null);
  const [systemType, setSystemType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await api.get("/api/me");
        console.log("📥 User info response:", data);

        if (!data.authenticated || !data.user) {
          throw new Error("Not authenticated");
        }

        if (data.user.role !== "staff" && data.user.role !== "admin") {
          throw new Error("Only staff/admin can access RFID Replacement");
        }

        setStaffUser(data.user);
        const sysType = data.user.systemType || data.user.system_type || "";
        console.log("🔍 System type:", sysType);

        setSystemType(sysType);
      } catch (err) {
        console.error("❌ Failed to fetch user info:", err);
        setError(err.message || "Failed to load user");

        if (err.response?.status === 401) {
          window.location.href = "/login";
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <StaffSidebar />
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <p className="text-xs text-gray-500">Loading RFID Replacement system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <StaffSidebar />
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-3">
          <p className="text-sm font-medium text-gray-900">Error loading RFID Replacement</p>
          <p className="text-xs text-gray-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!systemType) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <StaffSidebar />
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <p className="text-xs text-gray-500">Unknown system type. Please contact admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StaffSidebar />
      <div className="flex-1 min-w-0 p-6">
        {systemType === "prepaid_entry" ? (
          <PrepaidReplacement staffUser={staffUser} />
        ) : systemType === "subscription" ? (
          <SubscriptionReplacement staffUser={staffUser} />
        ) : (
          <p className="text-xs text-gray-500">Unknown system type: "{systemType}". Please contact admin.</p>
        )}
      </div>
    </div>
  );
};

export default RfidReplacement;