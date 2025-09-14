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
        console.log("📥 Pricing user info:", data);

        if (!data.authenticated || !data.user) {
          throw new Error("Not authenticated");
        }

        const sysType = data.user.systemType || data.user.system_type || "";
        setSystemType(sysType);
      } catch (err) {
        console.error("❌ Failed to fetch pricing user:", err);
        setError(err.message || "Failed to fetch pricing user");

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
    return <div className="p-4 text-gray-600">Loading user info...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="flex">
      <OwnerSidebar />
      <div className="flex-1 p-4">
        {systemType === "prepaid_entry" ? (
          <PrepaidPricing />
        ) : systemType === "subscription" ? (
          <SubscriptionPricing />
        ) : (
          <div className="text-gray-600">
            Unknown system type. Please contact support.
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingManagement;
