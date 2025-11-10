import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../tokenMemory";
import api from "../api"; // your API instance

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children, navigate: customNavigate }) => {
  const navigate = useNavigate();
  const ws = useRef(null);
  const [rfidData, setRfidData] = useState(null);
  const [globalEntryLogs, setGlobalEntryLogs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); // store current user
  const lastProcessedRfid = useRef(null);
  const retryAttempts = useRef(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scanModeEnabled, setScanModeEnabled] = useState(false);
  const [scannedRfidForStaff, setScannedRfidForStaff] = useState(null);
  const [replacementScannedRfid, setReplacementScannedRfid] = useState(null);
  const [replacementScanModeEnabled, setReplacementScanModeEnabled] = useState(false);
  const socketUrl = import.meta.env.VITE_WS_URL || "ws://localhost:5000";

  // Fetch current user separately
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data } = await api.get("/api/me");
        if (data?.authenticated && data?.user) {
          setCurrentUser(data.user);
          console.log("✅ Current user loaded:", data.user);
        }
      } catch (err) {
        console.error("❌ Failed to fetch current user:", err);
      }
    };

    fetchCurrentUser();

    const handleAuthChange = () => {
      console.log("🔄 Auth changed, re-fetching current user");
      fetchCurrentUser();
    };

    window.addEventListener("auth-changed", handleAuthChange);

    return () => window.removeEventListener("auth-changed", handleAuthChange);
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
        setIsAuthenticated(true);
        console.log("✅ WebSocket authenticated");
        return;

      case "auth-failed":
        setIsAuthenticated(false);
        console.error("❌ WebSocket authentication failed");
        return;

      case "error":
        console.error("❌ WebSocket error:", msg.message);
        return;

      case "rfid-registration-check":
        if (msg.data?.rfid_tag) {
          const { rfid_tag, is_registered, error } = msg.data;
          const currentPath = window.location.pathname;

          if (!currentPath.startsWith("/SuperAdmin")) return;

          if (error) return alert(error);

          if (is_registered) {
            customNavigate("/SuperAdmin/AddClient", {
              state: { rfid_tag, is_registered: true },
            }, "superadmin");
          } else {
            customNavigate("/SuperAdmin/ItemsInventory", {
              state: { rfid_tag, is_registered: false },
            }, "superadmin");
          }
        }
        return;

      case "staff-scan":
        if (!msg.data) return;

        const { rfid_tag, status, system_type, role, rfid_type, guest_data } = msg.data;

        if (!rfid_tag || role === "Admin" || role === "Partner") return;

        if (rfid_tag === lastProcessedRfid.current) return;
        lastProcessedRfid.current = rfid_tag;
        setTimeout(() => (lastProcessedRfid.current = null), 2000);

        sessionStorage.setItem("rfid_tag", rfid_tag);
        sessionStorage.setItem("system_type", system_type || "");

        // DayPassRenewal requires currentUser
        if (status === "daypass_renewal") {
          customNavigate("/Staff/DayPassRenewal", {
            state: { 
              rfid_tag, 
              system_type, 
              guest_data, 
              currentUser, // pass currentUser here
            },
          }, "staff");
          return;
        }

        if (status === "member_found") {
          customNavigate("/Staff/MembershipTransactions", {
            state: { rfid_tag, ...msg.data, system_type },
          }, "staff");
          return;
        }

        // New day pass
        if (role === "DayPass" || (rfid_type === "key_fob" && status !== "member_found")) {
          customNavigate("/Staff/DayPass", { 
            state: { rfid_tag, system_type, rfid_type, role } 
          }, "staff");
          return;
        }

        // New member wristband
        if (role === "Member" || rfid_type === "wristband") {
          customNavigate("/Staff/AddMember", { 
            state: { rfid_tag, system_type, rfid_type, role } 
          }, "staff");
          return;
        }

        return;

      case "member-update":
        if (!msg.data || msg.data.status === "unregistered") return;

        const visitorType = msg.data.visitor_type || msg.data.role;
        if (visitorType === "Staff" || visitorType === "Admin" || visitorType === "Partner") return;

        const messageAdminId = msg.data.admin_id;
        if (currentUser?.adminId && messageAdminId && currentUser.adminId !== messageAdminId) return;

        addOrUpdateStatusLog({
          id: msg.data.id, 
          rfid_tag: msg.data.rfid_tag,
          full_name: msg.data.full_name || "Unknown",
          profile_image_url: msg.data.profile_image_url,
          entry_time: msg.data.entry_time || null,
          exit_time: msg.data.exit_time || null,
          status: msg.data.status || msg.data.member_status || "outside",
          visitor_type: visitorType,
          system_type: msg.data.system_type || "gate",
          admin_id: msg.data.admin_id,
          action: msg.data.exit_time ? "exit" : "entry",
          last_activity: msg.data.exit_time || msg.data.entry_time || new Date().toISOString(),
        });
        return;

      default:
        console.log("Unknown WebSocket message type:", msg.type);
        break;
    }
  };

  useEffect(() => {
    const connectWebSocket = () => {
      const token = getAccessToken();
      if (!token) return console.log("No access token for WebSocket");

      if (ws.current?.readyState === WebSocket.OPEN) return;

      ws.current = new WebSocket(socketUrl);

      ws.current.onopen = () => {
        ws.current.send(JSON.stringify({ type: "auth-dashboard", token }));
        retryAttempts.current = 0;
        console.log("🔌 WebSocket connected");
      };

      ws.current.onmessage = (event) => {
        try { handleWebSocketMessage(JSON.parse(event.data)); }
        catch (err) { console.error(err); }
      };

      ws.current.onclose = () => {
        setIsAuthenticated(false);
        setScanModeEnabled(false);
        setReplacementScanModeEnabled(false);

        retryAttempts.current++;
        if (retryAttempts.current <= 5) {
          const delay = retryAttempts.current * 2000;
          setTimeout(connectWebSocket, delay);
        }
      };

      ws.current.onerror = (err) => {
        console.error("WebSocket error:", err);
        setIsAuthenticated(false);
      };
    };

    connectWebSocket();
  }, [navigate]); // ✅ Do not depend on currentUser

  const toggleScanMode = (enabled) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "toggle-scan-mode", enabled }));
    }
  };

  const toggleReplacementScanMode = (enabled) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "toggle-replacement-scan-mode", enabled }));
    }
  };

  const clearScannedRfid = () => setScannedRfidForStaff(null);
  const clearReplacementScannedRfid = () => setReplacementScannedRfid(null);
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
        replacementScannedRfid,
        replacementScanModeEnabled,
        toggleReplacementScanMode,
        clearReplacementScannedRfid,
        currentUser, // ✅ expose currentUser
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
