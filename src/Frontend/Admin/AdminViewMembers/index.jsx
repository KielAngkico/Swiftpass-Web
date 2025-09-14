import React, { useEffect, useState } from "react";
import OwnerSidebar from "../../../components/OwnerSidebar";
import PrepaidView from "./PrepaidView";
import SubscriptionView from "./SubscriptionView";
import api from "../../../api";

const AdminViewMember = () => {
  const [systemType, setSystemType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await api.get("/api/me");
        console.log("📥 Admin info response:", data);

        if (!data.authenticated || !data.user) {
          throw new Error("Not authenticated");
        }

        const type = data.user.systemType || data.user.system_type || "";
        console.log("🔍 Admin system type:", type);

        setSystemType(type);
      } catch (err) {
        console.error("❌ Failed to fetch admin info:", err);
        setError(err.message || "Failed to fetch admin info");

        if (err.response?.status === 401) {
          window.location.href = "/login";
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAdminInfo();
  }, []);

  if (loading)
    return <div className="p-4 text-gray-600">Loading user data...</div>;
  if (error)
    return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="flex">
      <OwnerSidebar />
      <div className="flex-1 p-4">
        {systemType === "prepaid_entry" ? (
          <PrepaidView />
        ) : systemType === "subscription" ? (
          <SubscriptionView />
        ) : (
          <div className="text-gray-600">
            Unknown system type. Please contact support.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminViewMember;
