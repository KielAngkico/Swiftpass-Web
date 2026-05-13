import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import StaffSidebar from "../../../components/StaffSidebar";
import PrepaidDayPass from "./PrepaidDayPass";
import SubscriptionDayPass from "./SubscriptionDayPass";
import api from "../../../api";

const DayPass = () => {
  const location = useLocation();
  const [staffUser, setStaffUser] = useState(null);
  const [systemType, setSystemType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const rfid_tag = location.state?.rfid_tag || "";
  const customerNumberDisplay = location.state?.customer_number_display || null;

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await api.get("/api/me");
        console.log("📥 Staff info response:", data);

        if (!data.authenticated || !data.user) {
          throw new Error("Not authenticated");
        }

        if (data.user.role !== "staff" && data.user.role !== "admin") {
          throw new Error("Only staff/admin can access DayPass");
        }

        setStaffUser(data.user);
        const stype = data.user.systemType || data.user.system_type || "";
        setSystemType(stype);
        console.log("🔍 System type:", stype);
      } catch (err) {
        console.error("❌ Failed to fetch staff info:", err);
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
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-500">Loading Day Pass system...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <StaffSidebar />
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-sm w-full mx-6">
            <p className="text-sm font-medium text-red-500 mb-1">Something went wrong</p>
            <p className="text-xs text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!systemType) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <StaffSidebar />
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-sm w-full mx-6">
            <p className="text-xs text-gray-500">Unknown system type. Please contact your administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StaffSidebar />
      <div className="flex-1 min-w-0 p-6">
{systemType === "prepaid_entry" ? (
          <PrepaidDayPass rfid_tag={rfid_tag} staffUser={staffUser} customerNumberDisplay={customerNumberDisplay} />
        ) : (
          <SubscriptionDayPass rfid_tag={rfid_tag} staffUser={staffUser} customerNumberDisplay={customerNumberDisplay} />
        )}
      </div>
    </div>
  );
};

export default DayPass;