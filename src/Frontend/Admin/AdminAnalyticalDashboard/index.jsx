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

        if (!data.authenticated || !data.user) {
          throw new Error("Not authenticated");
        }

        if (data.user.role !== "admin" && data.user.role !== "owner") {
          throw new Error("Only admin/owner can access Analytical Dashboard");
        }

        setAdminUser(data.user);
        setSystemType(data.user.systemType || data.user.system_type || "");
      } catch (err) {
        setError(err.message || "Failed to fetch admin info");

        if (err?.response?.status === 401) {
          window.location.href = "/login";
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAdmin();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">
            Loading Analytical Dashboard...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-sm font-medium text-red-600 mb-2">Error</h2>
          <p className="text-xs text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (!systemType) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">
            Unknown system type. Please contact support.
          </p>
        </div>
      );
    }

    if (systemType === "prepaid_entry") {
      return <PrepaidAnalytical adminUser={adminUser} />;
    }

    if (systemType === "subscription") {
      return <SubscriptionAnalytical adminUser={adminUser} />;
    }

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-500">
          Unknown system type: "{systemType}"
        </p>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />

      <main className="flex-1 min-w-0 p-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900">
            Analytical Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Summary of your activity and trends
          </p>
        </div>

        {renderContent()}
      </main>
    </div>
  );
};

export default AdminAnalyticalDashboard;