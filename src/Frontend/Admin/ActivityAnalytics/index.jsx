import React, { useState, useEffect } from "react";
import OwnerSidebar from "../../../components/OwnerSidebar";
import PrepaidActAnalytics from "./PrepaidActAnalytics";
import SubscriptionActAnalytics from "./SubscriptionActAnalytics";
import api from "../../../api";

const ActivityAnalytics = () => {
  const [adminUser, setAdminUser] = useState(null);
  const [systemType, setSystemType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user) throw new Error("Not authenticated");
        if (data.user.role !== "admin" && data.user.role !== "owner")
          throw new Error("Only admin/owner can access Activity Analytics");
        setAdminUser(data.user);
        setSystemType(data.user.systemType || data.user.system_type || "");
      } catch (err) {
        setError(err.message || "Failed to fetch admin info");
        if (err.response?.status === 401) window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };
    fetchAdmin();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <OwnerSidebar />
        <div className="flex-1 min-w-0 p-6 flex items-center justify-center">
          <p className="text-xs text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <OwnerSidebar />
        <div className="flex-1 min-w-0 p-6 flex flex-col items-center justify-center gap-3">
          <p className="text-xs text-red-500">{error}</p>
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />
      <div className="flex-1 min-w-0 p-6">
        {systemType === "prepaid_entry" ? (
          <PrepaidActAnalytics adminUser={adminUser} />
        ) : systemType === "subscription" ? (
          <SubscriptionActAnalytics adminUser={adminUser} />
        ) : (
          <p className="text-xs text-gray-500">Unknown system type. Please contact support.</p>
        )}
      </div>
    </div>
  );
};

export default ActivityAnalytics;