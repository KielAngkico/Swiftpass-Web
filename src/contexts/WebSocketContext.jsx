import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../tokenMemory";
import api from "../api"; 
import { useToast } from "../components/ToastManager";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children, navigate: customNavigate }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const ws = useRef(null);
  const [rfidData, setRfidData] = useState(null);
  const [globalEntryLogs, setGlobalEntryLogs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); // ✅ Store current user
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
  
const socketBaseUrl = import.meta.env.VITE_WS_URL || "ws://localhost:5000";
  const socketUrl = socketBaseUrl.endsWith('/') 
  ? `${socketBaseUrl}ws` 
  : `${socketBaseUrl}/ws`;
  // ✅ Fetch current user from /api/me
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data } = await api.get('/api/me');
        if (data?.authenticated && data?.user) {
          setCurrentUser(data.user);
          console.log("✅ Current user loaded in WebSocket context:", data.user);
        }
      } catch (err) {
        console.error("❌ Failed to fetch current user in WebSocket context:", err);
      }
    };

    fetchCurrentUser();

    // ✅ Re-fetch user when auth changes
    const handleAuthChange = () => {
      console.log("🔄 Auth changed, re-fetching current user");
      fetchCurrentUser();
    };

    window.addEventListener("auth-changed", handleAuthChange);

    return () => {
      window.removeEventListener("auth-changed", handleAuthChange);
    };
  }, []);

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
          const { rfid_tag, is_registered, error } = msg.data;

          console.log(`📡 RFID Check Result: ${rfid_tag}`);
          console.log(`   Is Registered: ${is_registered}`);

          const currentPath = window.location.pathname;
          const isSuperAdminPage = currentPath.startsWith("/SuperAdmin");

          if (!isSuperAdminPage) {
            console.log("Not on SuperAdmin page - ignoring RFID");
            return;
          }
if (error) {
  showToast({ message: error, type: "error" });
  return;
}

          // ✅ NEW: Check if on AddClient page for slot selection
          const isOnAddClientPage = currentPath === "/SuperAdmin/AddClient";

          if (isOnAddClientPage) {
            console.log("🔄 On AddClient page - storing RFID for slot selection");
            sessionStorage.setItem('pendingSlotRfid', rfid_tag);
            sessionStorage.setItem('rfidScannedAt', Date.now().toString());
            
            window.dispatchEvent(new Event('rfid-slot-scanned'));
            return;
          }

          // ✅ RFID EXISTS → Go to AddPartner (open modal)
if (msg.data.next_action === "in_stock_error") {
  showToast({ message: msg.data.message, type: "error" });
  return;
}

          if (is_registered) {
            customNavigate("/SuperAdmin/AddClient", {
              state: { 
                openModal: true, 
                timestamp: Date.now() 
              },
            }, "superadmin");
          } 
          else {
            customNavigate("/SuperAdmin/ItemsInventory", {
              state: { rfid_tag, is_registered: false },
            }, "superadmin");
          }
        }
        return;

case "rfid-replacement-scanned":
  if (msg.data) {             // ← was: msg.data?.rfid_tag
    setReplacementScannedRfid(msg.data);
  }
  return;

      case "replacement-scan-mode-updated":
        setReplacementScanModeEnabled(msg.data?.enabled || false);
        console.log("🔄 Replacement scan mode:", msg.data?.enabled ? "ENABLED" : "DISABLED");
        return;


case "partner-slot-scan-result":
  if (!msg.data) return;
  console.log("📡 Partner slot scan result:", msg.data);

  if (msg.data.status === "error") {
    window.dispatchEvent(new CustomEvent('partner-slot-error', { 
      detail: { reason: msg.data.reason } 
    }));
    return;
  }

  if (msg.data.status === "success") {
    setScannedRfidForPartner({ 
      rfid_tag: msg.data.rfid_tag, 
      slot: msg.data.slot 
    });
  }
  return;
case "rfid-scanned-for-staff":
        if (msg.data) {
          console.log("📡 RFID Scanned for Staff Registration:", msg.data);

          if (msg.data.status === "error") {
            showToast({ 
              message: msg.data.reason || "Invalid RFID card. Please use a Partner card.", 
              type: "error" 
            });
            setScannedRfidForStaff(null);
            return;
          }

          if (msg.data.status === "success") {
            console.log("✅ RFID is valid for staff registration");
            showToast({ 
              message: `RFID scanned successfully!`, 
              type: "success" 
            });
            setScannedRfidForStaff(msg.data);
          }
        }
        return;

      case "scan-mode-updated":
        setScanModeEnabled(msg.data?.enabled || false);
        console.log("🔄 Staff registration scan mode:", msg.data?.enabled ? "ENABLED" : "DISABLED");
        return;
        case "dashboard-alert":
        if (!msg.data) return;
        window.dispatchEvent(new CustomEvent("dashboard-alert", {
          detail: {
            reason: msg.data.reason,
            full_name: msg.data.full_name,
            admin_id: msg.data.admin_id,
            timestamp: msg.data.timestamp
          }
        }));
        return;

case "member-update":
 
        if (!msg.data || msg.data.status === "unregistered") return;

// Guard: ENTRY gate - skip tailgate (already inside) scans only
        if (
          msg.data.location?.toUpperCase() === "ENTRY" &&
          msg.data.status === "denied" &&
          msg.data.reason === "Already inside"
        ) {
          console.log("⏭️ Skipping ENTRY tailgate - person already inside");
          return;
        }
        
        console.log("📥 Received member-update:", msg.data);
        
        // ✅ Skip Staff and Admin entries (they shouldn't show in member logs)
        const visitorType = msg.data.visitor_type || msg.data.role;
        if (visitorType === "Staff" || visitorType === "Admin" || visitorType === "Partner") {
          console.log(`⏭️ Skipping ${visitorType} entry - not displaying in member logs`);
          return;
        }
        
        // ✅ Use currentUser from state (fetched from /api/me)
        const currentUserAdminId = currentUser?.adminId;
        const messageAdminId = msg.data.admin_id;
        
        console.log(`🔍 Admin ID Check:`, {
          currentUserAdminId,
          messageAdminId,
          matches: currentUserAdminId === messageAdminId,
          currentUser: currentUser,
          visitorType: visitorType // Debug log
        });
        
        // ✅ Skip if admin_id doesn't match (different gym)
        if (messageAdminId && currentUserAdminId && messageAdminId !== currentUserAdminId) {
          console.log(`⏭️ Skipping - message for admin ${messageAdminId}, current user is admin ${currentUserAdminId}`);
          return;
        }
        
addOrUpdateStatusLog({
          id: msg.data.id, 
          rfid_tag: msg.data.rfid_tag,
          full_name: msg.data.full_name || "Unknown",
          profile_image_url: msg.data.profile_image_url,
          customer_number_display: msg.data.customer_number_display || null,
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
          admin_id: msg.data.admin_id,
          action: msg.data.exit_time ? "exit" : "entry",
          last_activity: msg.data.exit_time || msg.data.entry_time || new Date().toISOString(),
        });
        
        console.log(`✅ Added to globalEntryLogs for admin ${messageAdminId}`);
        return;
case "staff-scan":
  if (!msg.data) return;

  const { rfid_tag, status, location, full_name, reason, rfid_type, role, guest_data } = msg.data;

  console.log("📥 Received staff-scan message:", msg.data);

  if (!rfid_tag || location !== "STAFF") {
    console.log("⚠️ Invalid staff-scan data");
    return;
  }

  // Partner scan mode check
if (partnerScanModeEnabled) {
    if (role !== "Partner") {
      window.dispatchEvent(new CustomEvent("dashboard-alert", {
        detail: { full_name: "RFID Error", reason: "This RFID is not assigned to a partner role. Please use a partner RFID card." }
      }));
      return;
    }
    if (reason && (reason.includes("not registered with SwiftPass") || 
                   reason.includes("Duplicate") || 
                   reason.includes("already assigned"))) {
      window.dispatchEvent(new CustomEvent("dashboard-alert", {
        detail: { full_name: "RFID Error", reason: reason }
      }));
      return;
    }
    console.log("✅ Valid partner RFID scanned:", rfid_tag);
    setScannedRfidForPartner({ rfid_tag, slot: pendingPartnerSlot });
    return;
  }

// Block non-Partner cards when scan mode is active
if (scanModeEnabled) {
  if (role !== "Partner") {
    showToast({ 
      message: "Invalid card — please use a Partner RFID card", 
      type: "error" 
    });
  }
  return;
}

  // Duplicate check
  if (rfid_tag === lastProcessedRfid.current) {
    console.log("⏭️ Skipping duplicate RFID scan");
    return;
  }
  lastProcessedRfid.current = rfid_tag;
  setTimeout(() => (lastProcessedRfid.current = null), 2000);

  sessionStorage.setItem("rfid_tag", rfid_tag);

  const currentPath = window.location.pathname;
  if (!currentPath.startsWith("/Staff")) {
    console.log("Not on Staff page - no navigation");
    return;
  }

  // Handle errors
if (reason && (reason.includes("not registered with SwiftPass") || 
                 reason.includes("Duplicate") || 
                 reason.includes("already assigned"))) {
    window.dispatchEvent(new CustomEvent("dashboard-alert", {
      detail: { full_name: "RFID Error", reason: reason }
    }));
    return;
  }

  console.log(`🔍 Navigation - Role: ${role}, Status: ${status}`);

  // Partner card - block
// Partner card - block
if (role === "Partner") {
  showToast({ 
    message: "This is a Partner card — for admin use only", 
    type: "error" 
  });
  return;
}
// DayPass renewal (existing guest)
  if (status === "daypass_renewal") {
    console.log("🔄 Existing Day Pass - navigating to DayPassRenewal");
    customNavigate("/Staff/DayPassRenewal", {
      state: { rfid_tag, full_name, guest_data, rfid_type, role, customer_number_display: msg.data.customer_number_display || null }
    }, "staff");
    return;
  }

// DayPass new registration
  if (role === "DayPass") {
    console.log("🎟️ New Day Pass - navigating to DayPass");
    customNavigate("/Staff/DayPass", {
      state: { rfid_tag, rfid_type, role, customer_number_display: msg.data.customer_number_display || null }
    }, "staff");
    return;
  }

// Member found (existing)
  if (status === "member_found") {
    console.log("💳 Registered Member - navigating to MembershipTransactions");
    customNavigate("/Staff/MembershipTransactions", {
      state: { rfid_tag, full_name, customer_number_display: msg.data.customer_number_display || null, ...msg.data }
    }, "staff");
    return;
  }

// Member new registration
  if (role === "Member") {
    console.log("🆕 New Member - navigating to AddMember");
    customNavigate("/Staff/AddMember", {
      state: { rfid_tag, rfid_type, role, customer_number_display: msg.data.customer_number_display || null }
    }, "staff");
    return;
  }

  console.log("⚠️ Unknown RFID configuration:", { role, status, rfid_type });
  return;
	default:
        console.log("Unknown WebSocket message type:", msg.type);
        break;
    }
  };

useEffect(() => {
    let isMounted = true;
    let retryTimeout = null;

    const connectWebSocket = () => {
      if (!isMounted) return;

      // ✅ Stop if already open or connecting
      if (
        ws.current?.readyState === WebSocket.OPEN ||
        ws.current?.readyState === WebSocket.CONNECTING
      ) return;

      // ✅ Hard stop after max retries
      if (retryAttempts.current > 5) {
        console.error("❌ Max reconnection attempts reached");
        return;
      }

      const token = getAccessToken();
      if (!token) {
        console.log("No access token — skipping WebSocket connection");
        return;
      }

      console.log("🔌 Connecting to WebSocket:", socketUrl);
      ws.current = new WebSocket(socketUrl);

      ws.current.onopen = () => {
        if (!isMounted) return;
        console.log("✅ WebSocket connected, sending authentication");
        ws.current.send(JSON.stringify({ type: "auth-dashboard", token }));
        retryAttempts.current = 0; // reset on success
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
        if (!isMounted) return;
        console.log("🔌 WebSocket disconnected");
        setIsAuthenticated(false);
        setScanModeEnabled(false);
        setReplacementScanModeEnabled(false);
        setPartnerScanModeEnabled(false);

        retryAttempts.current++;

        if (retryAttempts.current <= 5) {
          const delay = retryAttempts.current * 2000;
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${retryAttempts.current}/5)`);
          retryTimeout = setTimeout(connectWebSocket, delay);
        } else {
          console.error("❌ Max reconnection attempts reached — giving up");
          // ✅ No more retries, period
        }
      };

 ws.current.onerror = (error) => {
  // If the socket is already closing or closed, 
  // the error is likely just from the page refreshing.
  if (ws.current && (ws.current.readyState === WebSocket.CLOSING || ws.current.readyState === WebSocket.CLOSED)) {
    return; 
  }

  console.error("❌ WebSocket error:", error);
  setIsAuthenticated(false);
};
    };

    connectWebSocket();

    const handleAuthChange = () => {
      console.log("🔄 Auth changed, reconnecting WebSocket");
      retryAttempts.current = 0; // reset retries on fresh login
      setIsAuthenticated(false);
      ws.current?.close();
      connectWebSocket();
    };

    window.addEventListener("auth-changed", handleAuthChange);

    return () => {
      isMounted = false;
      clearTimeout(retryTimeout);     // ✅ Cancel any pending retry
      ws.current?.close();
      window.removeEventListener("auth-changed", handleAuthChange);
    };
  }, [navigate]); // ✅ Removed currentUser — was causing reconnects on every user fetch
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
const enablePartnerScanMode = (slot, adminId) => {
  console.log(`🔄 Enabling partner scan mode for slot ${slot}`);
  setPartnerScanModeEnabled(true);
  setPendingPartnerSlot(slot);
  if (ws.current?.readyState === WebSocket.OPEN) {
    ws.current.send(JSON.stringify({
      type: "toggle-partner-slot-mode",
      enabled: true,
      admin_id: adminId,
      slot: slot
    }));
  }
};

const disablePartnerScanMode = () => {
  console.log("🔄 Disabling partner scan mode");
  setPartnerScanModeEnabled(false);
  setPendingPartnerSlot(null);
  if (ws.current?.readyState === WebSocket.OPEN) {
    ws.current.send(JSON.stringify({
      type: "toggle-partner-slot-mode",
      enabled: false
    }));
  }
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
        currentUser, // ✅ Expose currentUser if needed
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
