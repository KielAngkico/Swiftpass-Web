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
      <div className="flex">
        <StaffSidebar />
        <div className="flex-1 p-6 text-center py-12">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading DayPass system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex">
        <StaffSidebar />
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
        <StaffSidebar />
        <div className="flex-1 p-6 text-center py-12 text-gray-600">
          Unknown system type. Please contact admin.
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <StaffSidebar />
      <div className="flex-1 p-4">
        {systemType === "prepaid_entry" ? (
          <PrepaidDayPass rfid_tag={rfid_tag} staffUser={staffUser} />
        ) : (
          <SubscriptionDayPass rfid_tag={rfid_tag} staffUser={staffUser} />
        )}
      </div>
    </div>
  );
};

export default DayPass;
