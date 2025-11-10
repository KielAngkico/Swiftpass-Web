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
  const [replacementScannedRfid, setReplacementScannedRfid] = useState(null);
  const [replacementScanModeEnabled, setReplacementScanModeEnabled] = useState(false);
  
  // ✅ ADD THESE THREE NEW STATE VARIABLES FOR PARTNER SCANNING
  const [partnerScanModeEnabled, setPartnerScanModeEnabled] = useState(false);
  const [scannedRfidForPartner, setScannedRfidForPartner] = useState(null);
  const [pendingPartnerSlot, setPendingPartnerSlot] = useState(null);
  
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
        console.log("✅ WebSocket authenticated successfully");
        setIsAuthenticated(true);
        return;

      case "auth-failed":
        console.error("❌ WebSocket authentication failed");
        setIsAuthenticated(false);
        return;

      case "error":
        console.error("❌ WebSocket error:", msg.message);
        return;

      case "rfid-registration-check":
        if (msg.data?.rfid_tag) {
          const { rfid_tag, is_registered } = msg.data;

          console.log(`📡 RFID Check Result: ${rfid_tag}`);
          console.log(`   Is Registered: ${is_registered}`);

          const currentPath = window.location.pathname;
          const isSuperAdminPage = currentPath.startsWith("/SuperAdmin");

          if (!isSuperAdminPage) {
            console.log("Not on SuperAdmin page - no navigation");
            return;
          }

          const isOnAddClientPage = currentPath === "/SuperAdmin/AddClient";

          if (isOnAddClientPage) {
            console.log("🔄 On AddClient page - storing RFID for slot selection");
            sessionStorage.setItem('pendingSlotRfid', rfid_tag);
            sessionStorage.setItem('rfidScannedAt', Date.now().toString());
            
            window.dispatchEvent(new Event('rfid-slot-scanned'));
            return;
          }

          if (is_registered) {
            console.log("✅ Navigating to AddClient - modal will open");
            customNavigate("/SuperAdmin/AddClient", {
              state: { 
                openModal: true, 
                timestamp: Date.now() 
              }
            }, "superadmin");
          } else {
            console.log("❌ Navigating to ItemsInventory for registration");
            customNavigate("/SuperAdmin/ItemsInventory", {
              state: { rfid_tag, is_registered: false }
            }, "superadmin");
          }
        }
        return;

      case "rfid-replacement-scanned":
        if (msg.data?.rfid_tag) {
          console.log("📡 Replacement RFID Scanned:", msg.data.rfid_tag);
          setReplacementScannedRfid(msg.data.rfid_tag);
        }
        return;

      case "replacement-scan-mode-updated":
        setReplacementScanModeEnabled(msg.data?.enabled || false);
        console.log("🔄 Replacement scan mode:", msg.data?.enabled ? "ENABLED" : "DISABLED");
        return;

      case "rfid-scanned-for-staff":
        if (msg.data?.rfid_tag) {
          console.log("📡 RFID Scanned for Staff Registration:", msg.data.rfid_tag);

          if (msg.data.status === "error") {
            console.log("❌ RFID Validation Error:", msg.data.reason);
            alert(`Cannot use this RFID: ${msg.data.reason}`);
            setScannedRfidForStaff(null);
            return;
          }

          if (msg.data.status === "success") {
            console.log("✅ RFID is valid for staff registration");
            setScannedRfidForStaff(msg.data.rfid_tag);
          }
        }
        return;

      case "scan-mode-updated":
        setScanModeEnabled(msg.data?.enabled || false);
        console.log("🔄 Staff registration scan mode:", msg.data?.enabled ? "ENABLED" : "DISABLED");
        return;
 
      case "member-update":
        if (!msg.data || msg.data.status === "unregistered") return;
        
        console.log("📥 Received member-update:", msg.data);
        
        addOrUpdateStatusLog({
          id: msg.data.id, 
          rfid_tag: msg.data.rfid_tag,
          full_name: msg.data.full_name || "Unknown",
          profile_image_url: msg.data.profile_image_url,
          entry_time: msg.data.entry_time || null,
          exit_time: msg.data.exit_time || null,
          member_status: msg.data.status || msg.data.member_status || "outside",
          status: msg.data.status || msg.data.member_status || "outside",
          visitor_type: msg.data.visitor_type || "Member",
          system_type: msg.data.system_type || "gate",
          deducted_amount: msg.data.deducted_amount, 
          current_balance: msg.data.current_balance, 
          remaining_balance: msg.data.remaining_balance || msg.data.current_balance,
          subscription_expiry: msg.data.subscription_expiry,
          staff_name: msg.data.staff_name,
          action: msg.data.exit_time ? "exit" : "entry",
          last_activity: msg.data.exit_time || msg.data.entry_time || new Date().toISOString(),
        });
        return;

      case "staff-scan":
        if (!msg.data) return;

        // ✅ MODIFIED: Extract role from msg.data
        const { rfid_tag, status, location, full_name, system_type, reason, role } = msg.data;
        
        console.log("📥 Received staff-scan message:", {
          rfid_tag,
          status,
          location,
          role,
          partnerScanModeEnabled,
          replacementScanModeEnabled
        });

        if (!rfid_tag || location !== "STAFF") {
          console.log("⚠️ Invalid staff-scan data - missing rfid_tag or location");
          return;
        }

        // ✅ ADD THIS: Check if we're in partner scan mode FIRST
        if (partnerScanModeEnabled) {
          console.log("🔍 Partner scan mode active - checking RFID role");
          
          if (role !== "partner") {
            console.log("❌ RFID is not a partner card");
            alert("This RFID is not assigned to a partner role. Please use a partner RFID card.");
            return;
          }

          if (reason && reason.includes("not registered with SwiftPass")) {
            console.log("❌ Unauthorized RFID - not registered with SwiftPass");
            alert("This RFID is not registered with SwiftPass company. Please use an authorized RFID.");
            return;
          }

          if (reason && (reason.includes("Duplicate") || reason.includes("already assigned"))) {
            console.log("❌ Duplicate RFID - already in use");
            alert(`Cannot use this RFID: ${reason}`);
            return;
          }

          // Valid partner RFID scanned
          console.log("✅ Valid partner RFID scanned:", rfid_tag);
          setScannedRfidForPartner({
            rfid_tag: rfid_tag,
            slot: pendingPartnerSlot
          });
          return; // ✅ IMPORTANT: Return here to prevent normal staff-scan logic
        }

        // ✅ EXISTING STAFF-SCAN LOGIC CONTINUES BELOW (unchanged)
        if (rfid_tag === lastProcessedRfid.current) {
          console.log("⏭️ Skipping duplicate RFID scan");
          return;
        }
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

        if (reason && reason.includes("not registered with SwiftPass")) {
          console.log("❌ Unauthorized RFID - not registered with SwiftPass");
          alert("This RFID is not registered with SwiftPass company. Please use an authorized RFID.");
          return;
        }

        if (reason && (reason.includes("Duplicate") || reason.includes("already assigned"))) {
          console.log("❌ Duplicate RFID - already in use");
          alert(`Cannot use this RFID: ${reason}`);
          return;
        }

        if (status === "member_found") {
          console.log("✅ Member found - navigating to MembershipTransactions");
          customNavigate("/Staff/MembershipTransactions", {
            state: { rfid_tag, full_name, ...msg.data, system_type },
          }, "staff");
        } else if (status === "unregistered") {
          const lastUnregistered = sessionStorage.getItem("lastUnregisteredRfid");
          if (lastUnregistered === rfid_tag) {
            console.log("✅ Second scan detected - navigating to DayPass");
            sessionStorage.removeItem("lastUnregisteredRfid");
            customNavigate("/Staff/DayPass", { state: { rfid_tag, system_type } }, "staff");
          } else {
            console.log("✅ First scan - navigating to AddMember");
            sessionStorage.setItem("lastUnregisteredRfid", rfid_tag);
            customNavigate("/Staff/AddMember", { state: { rfid_tag, system_type } }, "staff");
          }
        }
        return;

      default:
        console.log("Unknown WebSocket message type:", msg.type);
        break;
    }
  };

  useEffect(() => {
    const connectWebSocket = () => {
      const token = getAccessToken();
      if (!token) {
        console.log("No access token available for WebSocket connection");
        return;
      }

      if (ws.current?.readyState === WebSocket.OPEN) {
        console.log("✅ WebSocket already connected");
        return;
      }

      console.log("🔌 Connecting to WebSocket:", socketUrl);
      ws.current = new WebSocket(socketUrl);

      ws.current.onopen = () => {
        console.log("✅ WebSocket connected, sending authentication");
        ws.current.send(JSON.stringify({ type: "auth-dashboard", token }));
        retryAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleWebSocketMessage(msg);
        } catch (err) {
          console.error("❌ Failed to parse WebSocket message:", err);
        }
      };

      ws.current.onclose = () => {
        console.log("🔌 WebSocket disconnected");
        setIsAuthenticated(false);
        setScanModeEnabled(false);
        setReplacementScanModeEnabled(false);
        setPartnerScanModeEnabled(false); // ✅ ADD THIS
        
        retryAttempts.current++;
        if (retryAttempts.current <= 5) {
          const delay = retryAttempts.current * 2000;
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${retryAttempts.current}/5)`);
          setTimeout(connectWebSocket, delay);
        } else {
          console.error("❌ Max reconnection attempts reached");
        }
      };

      ws.current.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setIsAuthenticated(false);
      };
    };

    connectWebSocket();

    const handleAuthChange = () => {
      console.log("🔄 Auth changed, reconnecting WebSocket");
      setIsAuthenticated(false);
      connectWebSocket();
    };

    window.addEventListener("auth-changed", handleAuthChange);

    return () => {
      console.log("🧹 Cleaning up WebSocket connection");
      ws.current?.close();
      window.removeEventListener("auth-changed", handleAuthChange);
    };
  }, [navigate]);

  const toggleScanMode = (enabled) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: "toggle-scan-mode",
        enabled: enabled
      }));
      console.log(`🔄 Requesting staff registration scan mode: ${enabled ? "ENABLE" : "DISABLE"}`);
    } else {
      console.error("❌ WebSocket not connected - cannot toggle scan mode");
    }
  };

  const toggleReplacementScanMode = (enabled) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: "toggle-replacement-scan-mode",
        enabled: enabled
      }));
      console.log(`🔄 Requesting replacement scan mode: ${enabled ? "ENABLE" : "DISABLE"}`);
    } else {
      console.error("❌ WebSocket not connected - cannot toggle replacement scan mode");
    }
  };

  // ✅ ADD THESE THREE NEW FUNCTIONS FOR PARTNER SCANNING
  const enablePartnerScanMode = (slot) => {
    console.log(`🔄 Enabling partner scan mode for slot ${slot}`);
    setPartnerScanModeEnabled(true);
    setPendingPartnerSlot(slot);
  };

  const disablePartnerScanMode = () => {
    console.log("🔄 Disabling partner scan mode");
    setPartnerScanModeEnabled(false);
    setPendingPartnerSlot(null);
  };

  const clearScannedPartnerRfid = () => {
    console.log("🧹 Clearing scanned partner RFID");
    setScannedRfidForPartner(null);
  };

  const clearScannedRfid = () => {
    console.log("🧹 Clearing scanned staff registration RFID");
    setScannedRfidForStaff(null);
  };

  const clearReplacementScannedRfid = () => {
    console.log("🧹 Clearing replacement scanned RFID");
    setReplacementScannedRfid(null);
  };

  const clearProcessedLogs = () => {
    console.log("🧹 Clearing processed entry logs");
    setGlobalEntryLogs([]);
  };

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
        replacementScannedRfid,
        replacementScanModeEnabled,
        toggleReplacementScanMode,
        clearReplacementScannedRfid,
        // ✅ ADD THESE THREE NEW VALUES TO THE PROVIDER
        partnerScanModeEnabled,
        scannedRfidForPartner,
        enablePartnerScanMode,
        disablePartnerScanMode,
        clearScannedPartnerRfid,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used inside WebSocketProvider");
  }
  return context;
};