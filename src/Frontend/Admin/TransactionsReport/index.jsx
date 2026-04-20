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
        if (!data.authenticated || !data.user) throw new Error("Not authenticated");
        const sysType = data.user.systemType || data.user.system_type || "";
        setSystemType(sysType);
      } catch (err) {
        setError(err.message || "Failed to load user");
        if (err.response?.status === 401) window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };
    fetchUserInfo();
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
        <div className="flex-1 min-w-0 p-6 flex items-center justify-center">
          <p className="text-xs text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />
      <div className="flex-1 min-w-0 p-6">
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