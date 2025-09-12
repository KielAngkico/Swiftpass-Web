
const WebSocket = require("ws");
const dbSuperAdmin = require("./db");

let connectedClients = [];

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("🔗 WebSocket client connected");
    connectedClients.push(ws);

    ws.on("message", async (message) => {
      console.log("📥 Received:", message.toString());

      try {
        const parsed = JSON.parse(message);
        // ⚡ Put your RFID/member/day-pass handling logic here
        // (you can extract it from your original app.js)
      } catch (err) {
        console.error("❌ WS error:", err.message);
        ws.send(JSON.stringify({ type: "error", message: err.message }));
      }
    });

    ws.on("close", () => {
      console.log("🔌 WebSocket client disconnected");
      connectedClients = connectedClients.filter((c) => c !== ws);
    });
  });

  function broadcastToClients(data) {
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  return { wss, broadcastToClients };
}

module.exports = setupWebSocket;
