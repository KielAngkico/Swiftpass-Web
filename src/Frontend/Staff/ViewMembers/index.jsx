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

        const { data } = await api.get("/api/me");
        console.log("📥 Staff info response:", data);

        if (!data.authenticated || !data.user) {
          throw new Error("Not authenticated");
        }

        if (data.user.role !== "staff" && data.user.role !== "admin") {
          throw new Error("Only staff/admin can access this page");
        }

        const stype = (data.user.systemType || data.user.system_type || "").toLowerCase().trim();
        console.log("🔍 System type:", stype);

        setSystemType(stype);

      } catch (err) {
        console.error("❌ Failed to fetch staff info:", err);
        setError(err.message || "Failed to fetch staff info");

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
          <p className="text-gray-600">Loading staff system...</p>
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
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
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
        {systemType === "prepaid_entry" ? <PrepaidView /> : <SubscriptionView />}
      </div>
    </div>
  );
};

export default StaffViewMember;
