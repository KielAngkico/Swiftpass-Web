import React, { useState, useEffect } from "react";
import OwnerSidebar from "../../../components/OwnerSidebar";
import PrepaidTransactions from "./PrepaidTransactions";
import SubscriptionTransactions from "./SubscriptionTransactions";
import api from "../../../api";  

const TransactionsReport = () => {
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
    return <div className="p-6 text-gray-600">Loading user...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="flex">
      <OwnerSidebar />
      <div className="flex-1 p-4">
        {systemType === "prepaid_entry" ? (
          <PrepaidTransactions />
        ) : (
          <SubscriptionTransactions />
        )}
      </div>
    </div>
  );
};

export default TransactionsReport;
