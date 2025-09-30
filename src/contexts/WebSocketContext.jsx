import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../tokenMemory"; 

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const ws = useRef(null);
  const navigate = useNavigate();
  const [rfidData, setRfidData] = useState(null);
  const [globalEntryLogs, setGlobalEntryLogs] = useState([]);
  const lastProcessedRfid = useRef(null);
  const retryAttempts = useRef(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
        const { rfid_tag, status, location, full_name, system_type } = msg.data;
        if (!rfid_tag || location !== "STAFF") return;

        if (rfid_tag === lastProcessedRfid.current) return;
        lastProcessedRfid.current = rfid_tag;
        setTimeout(() => (lastProcessedRfid.current = null), 2000);

        setRfidData({ ...msg.data, timestamp: new Date().toLocaleString() });
        sessionStorage.setItem("rfid_tag", rfid_tag);
        sessionStorage.setItem("system_type", system_type || "");

        // Navigation based on status
        if (status === "member_found") {
          navigate("/Staff/MembershipTransactions", {
            state: { rfid_tag, full_name, ...msg.data, system_type },
          });
        } else if (status === "unregistered") {
          const lastUnregistered = sessionStorage.getItem("lastUnregisteredRfid");
          if (lastUnregistered === rfid_tag) {
            sessionStorage.removeItem("lastUnregisteredRfid");
            navigate("/Staff/DayPass", { state: { rfid_tag, system_type } });
          } else {
            sessionStorage.setItem("lastUnregisteredRfid", rfid_tag);
            navigate("/Staff/AddMember", { state: { rfid_tag, system_type } });
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

  const clearProcessedLogs = () => setGlobalEntryLogs([]);

  return (
    <WebSocketContext.Provider
      value={{
        rfidData,
        globalEntryLogs,
        addOrUpdateStatusLog,
        isAuthenticated,
        clearProcessedLogs,
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

