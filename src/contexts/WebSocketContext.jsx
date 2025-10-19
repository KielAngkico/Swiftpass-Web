import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../tokenMemory";

const WebSocketContext = createContext(null);
export const WebSocketProvider = ({ children, navigate: customNavigate }) => {
	const navigate = useNavigate();
  const ws = useRef(null);
  const [rfidData, setRfidData] = useState(null);
  const [globalEntryLogs, setGlobalEntryLogs] = useState([]);
  const lastProcessedRfid = useRef(null);
  const retryAttempts = useRef(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scanModeEnabled, setScanModeEnabled] = useState(false);
  const [scannedRfidForStaff, setScannedRfidForStaff] = useState(null);
  const socketUrl = import.meta.env.VITE_WS_URL || "ws://localhost:5000";

  const addOrUpdateStatusLog = (newLog) => {
    setGlobalEntryLogs((prev) => {
      const index = prev.findIndex((log) => log.rfid_tag === newLog.rfid_tag);
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...newLog };
        return updated;
      }
      return [newLog, ...prev];
    });
  };

  const handleWebSocketMessage = (msg) => {
    if (!msg?.type) return;

    switch (msg.type) {
      case "auth-success":
        setIsAuthenticated(true);
        return;
      case "auth-failed":
        setIsAuthenticated(false);
        return;
      case "error":
        return;

      // ✅ NEW: Handle RFID registration check for SUPERADMIN
      case "rfid-registration-check":
        if (msg.data?.rfid_tag) {
          const { rfid_tag, is_registered } = msg.data;
          
          console.log(`📡 RFID Check Result: ${rfid_tag}`);
          console.log(`   Is Registered: ${is_registered}`);

          // Store RFID for the page to use
          sessionStorage.setItem("scanned_rfid_superadmin", rfid_tag);

          const currentPath = window.location.pathname;
          const isSuperAdminPage = currentPath.startsWith("/SuperAdmin");
if (!isSuperAdminPage) {
  console.log("Not on SuperAdmin page - no navigation");
  return;
}
if (is_registered) {
  // ✅ RFID is registered - Go to AddClient page
  console.log("✅ Navigating to AddClient");
  customNavigate("/SuperAdmin/AddClient", {
    state: { rfid_tag, is_registered: true }
  }, "superadmin");
} else {
  // ❌ RFID is NOT registered - Go to ItemsInventory page
  console.log("❌ Navigating to ItemsInventory for registration");
  customNavigate("/SuperAdmin/ItemsInventory", {
    state: { rfid_tag, is_registered: false }
  }, "superadmin");
}
}
        return;

      // ✅ NEW: Handle RFID scanned for staff registration
// ✅ NEW: Handle RFID scanned for staff registration
case "rfid-scanned-for-staff":
  if (msg.data?.rfid_tag) {
    console.log("📡 RFID Scanned for Staff:", msg.data.rfid_tag);
    
    // ✅ Check if there's an error status
    if (msg.data.status === "error") {
      console.log("❌ RFID Validation Error:", msg.data.reason);
      alert(`Cannot use this RFID: ${msg.data.reason}`);
      setScannedRfidForStaff(null); // Clear any previous RFID
      return;
    }
    
    // ✅ Success - RFID is valid
    if (msg.data.status === "success") {
      console.log("✅ RFID is valid for staff registration");
      setScannedRfidForStaff(msg.data.rfid_tag);
    }
  }
  return;
      // ✅ NEW: Handle scan mode status updates
      case "scan-mode-updated":
        setScanModeEnabled(msg.data?.enabled || false);
        console.log("🔄 Scan mode:", msg.data?.enabled ? "ENABLED" : "DISABLED");
        return;

      case "member-update":
        if (!msg.data || msg.data.status === "unregistered") return;
        addOrUpdateStatusLog({
          rfid_tag: msg.data.rfid_tag,
          full_name: msg.data.full_name || "Unknown",
          profile_image_url: msg.data.profile_image_url,
          entry_time: msg.data.entry_time || null,
          exit_time: msg.data.exit_time || null,
          member_status: msg.data.status || msg.data.member_status || "outside",
          visitor_type: msg.data.visitor_type || "Member",
          system_type: msg.data.system_type || "gate",
          action: msg.data.exit_time ? "exit" : "entry",
          last_activity: msg.data.exit_time || msg.data.entry_time || new Date().toISOString(),
        });
        return;
case "staff-scan":
        if (!msg.data) return;
        const { rfid_tag, status, location, full_name, system_type, reason } = msg.data;
        if (!rfid_tag || location !== "STAFF") return;

        if (rfid_tag === lastProcessedRfid.current) return;
        lastProcessedRfid.current = rfid_tag;
        setTimeout(() => (lastProcessedRfid.current = null), 2000);

        setRfidData({ ...msg.data, timestamp: new Date().toLocaleString() });
        sessionStorage.setItem("rfid_tag", rfid_tag);
        sessionStorage.setItem("system_type", system_type || "");

        const currentPath = window.location.pathname;
        const isStaffPage = currentPath.startsWith("/Staff");
        if (!isStaffPage) {
          console.log("Admin viewing - RFID data stored but no navigation");
          return;
        }

        // ✅ NEW: Check if RFID is NOT registered with SwiftPass company
        if (reason && reason.includes("not registered with SwiftPass")) {
          console.log("❌ Unauthorized RFID - not registered with SwiftPass");
          alert("This RFID is not registered with SwiftPass company. Please use an authorized RFID.");
          return; // Don't navigate
        }

        // ✅ Check for duplicate RFID (Staff, Admin, or different admin member)
        if (reason && (reason.includes("Duplicate") || reason.includes("already assigned"))) {
          console.log("❌ Duplicate RFID - already in use");
          alert(`Cannot use this RFID: ${reason}`);
          return; // Don't navigate
        }

        // ✅ Navigate based on status for valid RFIDs
        if (status === "member_found") {
          customNavigate("/Staff/MembershipTransactions", {
            state: { rfid_tag, full_name, ...msg.data, system_type },
          }, "staff");
        } else if (status === "unregistered") {
          // Only navigate to AddMember if it's a valid, empty RFID (registered but not used)
          const lastUnregistered = sessionStorage.getItem("lastUnregisteredRfid");
          if (lastUnregistered === rfid_tag) {
            sessionStorage.removeItem("lastUnregisteredRfid");
            customNavigate("/Staff/DayPass", { state: { rfid_tag, system_type } }, "staff");
          } else {
            sessionStorage.setItem("lastUnregisteredRfid", rfid_tag);
            customNavigate("/Staff/AddMember", { state: { rfid_tag, system_type } }, "staff");
          }
        }
        return;
      default:
        break;
    }
  };

  useEffect(() => {
    const connectWebSocket = () => {
      const token = getAccessToken();
      if (!token) return;

      if (ws.current?.readyState === WebSocket.OPEN) return;

      ws.current = new WebSocket(socketUrl);

      ws.current.onopen = () => {
        ws.current.send(JSON.stringify({ type: "auth-dashboard", token }));
        retryAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleWebSocketMessage(msg);
        } catch {}
      };

      ws.current.onclose = () => {
        setIsAuthenticated(false);
        setScanModeEnabled(false);
        retryAttempts.current++;
        if (retryAttempts.current <= 5) {
          setTimeout(connectWebSocket, retryAttempts.current * 2000);
        }
      };

      ws.current.onerror = () => setIsAuthenticated(false);
    };

    connectWebSocket();

    const handleAuthChange = () => {
      setIsAuthenticated(false);
      connectWebSocket();
    };

    window.addEventListener("auth-changed", handleAuthChange);

    return () => {
      ws.current?.close();
      window.removeEventListener("auth-changed", handleAuthChange);
    };
  }, [navigate]);

  // ✅ NEW: Function to toggle RFID scan mode
  const toggleScanMode = (enabled) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: "toggle-scan-mode",
        enabled: enabled
      }));
      console.log(`🔄 Requesting scan mode: ${enabled ? "ENABLE" : "DISABLE"}`);
    } else {
      console.error("❌ WebSocket not connected");
    }
  };

  // ✅ NEW: Clear scanned RFID (after it's been used)
  const clearScannedRfid = () => {
    setScannedRfidForStaff(null);
  };

  const clearProcessedLogs = () => setGlobalEntryLogs([]);

  return (
    <WebSocketContext.Provider
      value={{
        rfidData,
        globalEntryLogs,
        addOrUpdateStatusLog,
        isAuthenticated,
        clearProcessedLogs,
        scanModeEnabled,
        scannedRfidForStaff,
        toggleScanMode,
        clearScannedRfid,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error("useWebSocket must be used inside WebSocketProvider");
  return context;
};
