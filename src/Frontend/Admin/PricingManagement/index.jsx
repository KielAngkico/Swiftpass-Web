import React, { useEffect, useState } from "react";
import OwnerSidebar from "../../../components/OwnerSidebar";
import PrepaidPricing from "./PrepaidPricing";
import SubscriptionPricing from "./SubscriptionPricing";
import api from "../../../api";

const PricingManagement = () => {
  const [systemType, setSystemType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await api.get("/api/me");
        if (!data.authenticated || !data.user) throw new Error("Not authenticated");
        const sysType = data.user.systemType || data.user.system_type || "";
        setSystemType(sysType);
      } catch (err) {
        console.error("Failed to fetch pricing user:", err);
        setError(err.message || "Failed to fetch pricing user");
        if (err.response?.status === 401) window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <OwnerSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading pricing info...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <OwnerSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white border border-red-100 rounded-xl px-6 py-4 text-sm text-red-500 shadow-sm">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />
      <div className="flex-1 p-6">
        {systemType === "prepaid_entry" ? (
          <PrepaidPricing />
        ) : systemType === "subscription" ? (
          <SubscriptionPricing />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 text-sm text-gray-500 shadow-sm">
              Unknown system type. Please contact support.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingManagement;