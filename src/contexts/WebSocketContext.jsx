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

    if (msg.type === "member-update" && msg.data) {
      const update = {
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
      };
      addOrUpdateStatusLog(update);
      return;
    }


    const { rfid_tag, status, location, full_name, system_type } = msg;
    if (!rfid_tag) return;


    if (rfid_tag === lastProcessedRfid.current) return;
    lastProcessedRfid.current = rfid_tag;
    setTimeout(() => (lastProcessedRfid.current = null), 2000);

    setRfidData({ ...msg, timestamp: new Date().toLocaleString() });
    sessionStorage.setItem("rfid_tag", rfid_tag);
    sessionStorage.setItem("system_type", system_type || "");

    if (location === "ENTRY") {
      addOrUpdateStatusLog({
        rfid_tag,
        full_name: full_name || "Unknown",
        profile_image_url: msg.profile_image_url,
        entry_time: msg.timestamp || new Date().toISOString(),
        exit_time: null,
        member_status: "inside",
        visitor_type: msg.visitor_type || "Member",
        system_type,
        action: "entry",
      });
      return;
    }

    if (location === "EXIT") {
      addOrUpdateStatusLog({
        rfid_tag,
        full_name: full_name || "Unknown",
        profile_image_url: msg.profile_image_url,
        entry_time: null,
        exit_time: msg.timestamp || new Date().toISOString(),
        member_status: "outside",
        visitor_type: msg.visitor_type || "Member",
        system_type,
        action: "exit",
      });
      return;
    }

    if (location === "STAFF") {
      switch (status) {
        case "staff_granted":
          navigate("/Staff/dashboard", { state: { rfid_tag, email: msg.email, staff_name: msg.staff_name } });
          break;
        case "member_found":
          navigate("/Staff/MembershipTransactions", {
            state: {
              rfid_tag,
              full_name: msg.full_name,
              current_balance: msg.current_balance,
              subscription_expiry: msg.subscription_expiry,
              system_type,
            },
          });
          break;
        case "day_pass_active":
          navigate("/Staff/DayPassTransactions", {
            state: { rfid_tag, guest_name: msg.guest_name, system_type, admin_name: msg.admin_name },
          });
          break;
        case "unregistered":
          const lastUnregistered = sessionStorage.getItem("lastUnregisteredRfid");
          if (lastUnregistered === rfid_tag) {
            sessionStorage.removeItem("lastUnregisteredRfid");
            navigate("/Staff/DayPass", { state: { rfid_tag } });
          } else {
            sessionStorage.setItem("lastUnregisteredRfid", rfid_tag);
            navigate("/Staff/AddMember", { state: { rfid_tag, system_type } });
          }
          break;
        default:
          console.warn("⚠ Unexpected STAFF status:", status);
      }
    }
  };

  useEffect(() => {
    const connectWebSocket = () => {
      const token = getAccessToken();
      if (!token) {
        console.warn("⚠ Cannot connect WS: no token in memory");
        return;
      }

      if (ws.current?.readyState === WebSocket.OPEN) return;

      console.log("🔌 Connecting to WebSocket:", socketUrl);
      ws.current = new WebSocket(`${socketUrl}?token=${token}`);

      ws.current.onopen = () => {
        console.log("✅ WebSocket connected.");
        retryAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleWebSocketMessage(msg);
        } catch (err) {
          console.error("❌ Failed to parse WebSocket data:", err);
        }
      };

      ws.current.onclose = () => {
        console.warn("⚠ WebSocket closed. Retrying...");
        retryAttempts.current++;
        if (retryAttempts.current <= 5) {
          setTimeout(connectWebSocket, retryAttempts.current * 2000);
        }
      };

      ws.current.onerror = (err) => {
        console.error("❌ WebSocket error:", err);
      };
    };

    connectWebSocket();

    return () => ws.current?.close();
  }, [navigate, socketUrl]);

  return (
    <WebSocketContext.Provider value={{ rfidData, globalEntryLogs, addOrUpdateStatusLog }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error("useWebSocket must be used inside WebSocketProvider");
  return context;
};
