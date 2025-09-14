import React, { useState, useEffect } from "react";
import OwnerSidebar from "../../../components/OwnerSidebar";
import PrepaidAnalytical from "./PrepaidAnalytical"; 
import SubscriptionAnalytical from "./SubscriptionAnalytical";
import api from "../../../api"; 

const AdminAnalyticalDashboard = () => {
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
        console.log("📥 Admin info response (Dashboard):", data);

        if (!data.authenticated || !data.user) {
          throw new Error("Not authenticated");
        }

        if (data.user.role !== "admin" && data.user.role !== "owner") {
          throw new Error("Only admin/owner can access Analytical Dashboard");
        }

        setAdminUser(data.user);

        const stype = data.user.systemType || data.user.system_type || "";
        setSystemType(stype);
        console.log("🔍 System type:", stype);
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

    fetchAdmin();
  }, []);

  if (loading) {
    return (
      <div className="flex">
        <OwnerSidebar />
        <div className="flex-1 p-6 text-center py-12">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading Analytical Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex">
        <OwnerSidebar />
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

  if (!systemType) {
    return (
      <div className="flex">
        <OwnerSidebar />
        <div className="flex-1 p-6 text-center py-12 text-gray-600">
          Unknown system type. Please contact support.
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <OwnerSidebar />
      <div className="flex-1 p-4">
        {systemType === "prepaid_entry" ? (
          <PrepaidAnalytical adminUser={adminUser} />
        ) : systemType === "subscription" ? (
          <SubscriptionAnalytical adminUser={adminUser} />
        ) : (
          <div className="text-gray-600">
            Unknown system type: "{systemType}". Please contact support.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalyticalDashboard;
