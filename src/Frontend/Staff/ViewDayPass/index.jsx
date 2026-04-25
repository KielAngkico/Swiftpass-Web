import React, { useState, useEffect } from "react";
import StaffSidebar from "../../../components/StaffSidebar";
import PrepaidViewDayPass from "./PrepaidViewDayPass";
import SubscriptionViewDayPass from "./SubscriptionViewDayPass";
import api from "../../../api";

const ViewDayPass = () => {
  const [systemType, setSystemType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStaffInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user) throw new Error("Not authenticated");
        if (data.user.role !== "staff" && data.user.role !== "admin")
          throw new Error("Only staff/admin can access this page");
        const stype = (data.user.systemType || data.user.system_type || "").toLowerCase().trim();
        setSystemType(stype);
      } catch (err) {
        setError(err.message || "Failed to fetch staff info");
        if (err.response?.status === 401) window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };
    fetchStaffInfo();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <StaffSidebar />
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <p className="text-xs text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <StaffSidebar />
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center max-w-sm">
            <p className="text-sm font-medium text-gray-900 mb-1">Something went wrong</p>
            <p className="text-xs text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StaffSidebar />
      <div className="flex-1 min-w-0 p-6">
        {systemType === "prepaid_entry" ? <PrepaidViewDayPass /> : <SubscriptionViewDayPass />}
      </div>
    </div>
  );
};

export default ViewDayPass;