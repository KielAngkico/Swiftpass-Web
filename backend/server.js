const http = require("http");
const app = require("./app");
const { setupWebSocket } = require("./websocket");

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

setupWebSocket(server);

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});
