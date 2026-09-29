import http from 'http';
import { createApp } from './app';
import { trackingServer } from './websocket/trackingServer';

const app = createApp();
const server = http.createServer(app);

// Initialize WebSocket server for live delivery tracking
trackingServer.init(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`WebSocket tracking endpoint running on ws://localhost:${PORT}/tracking`);
});
