import React from "react";
import { useWebSocket } from "../../../contexts/WebSocketContext";

const ScanRFID = () => {
    const { ws } = useWebSocket(); 

    return (
        <div className="p-6 text-gray-700 text-lg">
            Scanning RFID, please wait...
        </div>
    );
};

export default ScanRFID;
