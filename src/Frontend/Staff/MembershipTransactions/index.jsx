import React, { useEffect, useState } from "react";
import StaffSidebar from "../../../components/StaffSidebar";
import PrepaidTapUp from "./PrepaidTapUp";
import SubscriptionRenewal from "./SubscriptionRenewal";
import api from "../../../api";
import { useLocation } from "react-router-dom";

const MembershipTransactions = () => {
  const location = useLocation();
  const { rfid_tag, full_name, current_balance, subscription_expiry } = location.state || {};

  const [staffUser, setStaffUser] = useState(null);
  const [systemType, setSystemType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await api.get("/api/me");

        if (!data.authenticated || !data.user) {
          throw new Error("Not authenticated");
        }

        if (data.user.role !== "staff" && data.user.role !== "admin") {
          throw new Error("Only staff/admin can access Membership Transactions");
        }

        setStaffUser(data.user);
        const stype = (data.user.systemType || data.user.system_type || "").toLowerCase().trim();
        setSystemType(stype);
      } catch (err) {
        console.error("Failed to fetch staff info:", err);
        setError(err.message || "Failed to fetch staff info");

        if (err.response?.status === 401) {
          window.location.href = "/login";
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <StaffSidebar />
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <p className="text-xs text-gray-500">Loading transaction system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <StaffSidebar />
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-3">
          <p className="text-sm font-medium text-gray-900">Error loading transaction system</p>
          <p className="text-xs text-gray-500">{error}</p>
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

  if (!systemType) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <StaffSidebar />
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <p className="text-xs text-gray-500">Unknown system type. Please contact admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StaffSidebar />
      <div className="flex-1 min-w-0 p-6">
        {systemType === "prepaid_entry" ? (
          <PrepaidTapUp
            rfid_tag={rfid_tag}
            full_name={full_name}
            current_balance={current_balance}
            staffUser={staffUser}
          />
        ) : systemType === "subscription" ? (
          <SubscriptionRenewal
            rfid_tag={rfid_tag}
            full_name={full_name}
            subscription_expiry={subscription_expiry}
            staffUser={staffUser}
          />
        ) : (
          <p className="text-xs text-gray-500">Unknown system type: "{systemType}". Please contact admin.</p>
        )}
      </div>
    </div>
  );
};

export default MembershipTransactions;