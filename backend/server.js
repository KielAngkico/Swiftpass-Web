const http = require("http");
const app = require("./app");
require("./backup/cron"); 
const { setupWebSocket } = require("./webSocket/websocket");

// Ensure environment variables are loaded
const HOST = process.env.HOST || "0.0.0.0"; // '0.0.0.0' is often better for production/containers
const PORT = process.env.PORT || 5000;

// 1. Create the HTTP server using the Express app
const server = http.createServer(app);

// 2. Attach WebSocket logic to the SAME server instance
// This allows HTTP and WS to share the same port
setupWebSocket(server);

// 3. Start the server
server.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});