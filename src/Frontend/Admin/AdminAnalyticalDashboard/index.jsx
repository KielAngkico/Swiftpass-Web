import React, { useState, useEffect } from "react";
import OwnerSidebar from "../../../components/OwnerSidebar";
import PrepaidAnalytical from "./PrepaidAnalytical"; 
import SubscriptionAnalytical from "./SubscriptionAnalytical";
import api from "../../../api"; 

const AdminAnalyticalDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await api.get("/api/auth-status", { withCredentials: true });
        if (!data.isAuthenticated || !data.user) throw new Error("Not authenticated");

        setUser(data.user);
      } catch (err) {
        console.error("❌ Failed to fetch user info:", err);
        setError("Failed to load user data. Please log in again.");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) return <div className="p-4 text-gray-600">Loading dashboard...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!user) return null;

  const systemType = (user.system_type || "").toLowerCase();

  return (
    <div className="flex">
      <OwnerSidebar />
      <div className="flex-1 p-4">
        {systemType === "prepaid_entry" ? <PrepaidAnalytical /> : <SubscriptionAnalytical />}
      </div>
    </div>
  );
};

export default AdminAnalyticalDashboard;
