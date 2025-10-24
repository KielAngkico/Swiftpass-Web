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
      <div className="flex">
        <StaffSidebar />
        <div className="flex-1 p-6 text-center py-12">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading RFID Replacement system...</p>
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
            Error Loading System
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

  if (!systemType) {
    return (
      <div className="flex">
        <StaffSidebar />
        <div className="flex-1 p-6 text-center py-12 text-gray-600">
          Unknown system type. Please contact admin.
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <StaffSidebar />
      <div className="flex-1 p-4">
        {systemType === "prepaid_entry" ? (
          <PrepaidReplacement staffUser={staffUser} />
        ) : systemType === "subscription" ? (
          <SubscriptionReplacement staffUser={staffUser} />
        ) : (
          <div className="text-gray-600">
            Unknown system type: "{systemType}". Please contact admin.
          </div>
        )}
      </div>
    </div>
  );
};

export default RfidReplacement;
