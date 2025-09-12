import React, { useState, useEffect } from "react";
import OwnerSidebar from "../../../components/OwnerSidebar";
import PrepaidActAnalytics from "./PrepaidActAnalytics"; 
import SubscriptionActAnalytics from "./SubscriptionActAnalytics";
import { API_URL } from "../../../config"; 

const ActivityAnalytics = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_URL}/api/auth-status`, { credentials: "include" });
        if (!res.ok) throw new Error("Not authenticated");

        const data = await res.json();
        if (!data.isAuthenticated || !data.user) {
          throw new Error("Authentication required");
        }

        setUser(data.user);
      } catch (err) {
        console.error("❌ Failed to fetch user info:", err);
        setError(err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) return <div className="p-6 text-gray-600">Loading activity analytics...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!user) return <div className="p-6 text-gray-600">No user found.</div>;

  return (
    <div className="flex">
      <OwnerSidebar />
      <div className="flex-1 p-4">
        {user.system_type === "prepaid_entry" ? (
          <PrepaidActAnalytics />
        ) : (
          <SubscriptionActAnalytics />
        )}
      </div>
    </div>
  );
};

export default ActivityAnalytics;
