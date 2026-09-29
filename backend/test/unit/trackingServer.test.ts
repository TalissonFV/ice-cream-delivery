import http from 'http';
import { WebSocket } from 'ws';
import { TrackingServer } from '../../src/websocket/trackingServer';

describe('TrackingServer', () => {
  let server: http.Server;
  let trackingServer: TrackingServer;
  let port: number;

  beforeAll((done) => {
    server = http.createServer();
    trackingServer = new TrackingServer();
    trackingServer.init(server);
    server.listen(0, () => {
      const address = server.address() as any;
      port = address.port;
      done();
    });
  });

  afterAll(async () => {
    await trackingServer.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('sends initial delivery state on connection', (done) => {
    const orderId = 'ORD-TEST-1';
    trackingServer.setInitialTracking({
      orderId,
      orderNumber: 'IC-123456',
      customerId: 1,
      status: 'in_transit',
      location: 'Store Downtown',
      message: 'Order picked up',
      createdAt: new Date().toISOString(),
      logs: []
    });

    const ws = new WebSocket(`ws://localhost:${port}/tracking?orderId=${orderId}`);

    ws.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      expect(parsed.orderId).toBe(orderId);
      expect(parsed.status).toBe('in_transit');
      ws.close();
      done();
    });
  });

  test('broadcasts status updates to connected client', (done) => {
    const orderId = 'ORD-TEST-2';
    const ws = new WebSocket(`ws://localhost:${port}/tracking?orderId=${orderId}`);

    ws.on('open', () => {
      trackingServer.updateDeliveryStatus(orderId, 'delivering', 'En route - Main St', 'Courier 5 mins away');
    });

    ws.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.status === 'delivering') {
        expect(parsed.location).toBe('En route - Main St');
        ws.close();
        done();
      }
    });
  });
});
