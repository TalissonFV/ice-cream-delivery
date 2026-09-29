import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Delivery, DeliveryStatus, DeliveryLog } from '../models/delivery';

export interface TrackingClientConnection {
  orderId: string;
  ws: WebSocket;
}

export class TrackingServer {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, Set<WebSocket>> = new Map();
  private trackingData: Map<string, Delivery> = new Map();

  public init(server: HTTPServer): void {
    this.wss = new WebSocketServer({ server, path: '/tracking' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url || '', 'http://localhost');
      const orderId = url.searchParams.get('orderId');

      if (!orderId) {
        ws.close(1008, 'Order ID required');
        return;
      }

      if (!this.connections.has(orderId)) {
        this.connections.set(orderId, new Set());
      }
      this.connections.get(orderId)!.add(ws);

      // Send initial tracking state if available
      const currentTracking = this.getTracking(orderId);
      if (currentTracking) {
        ws.send(JSON.stringify(currentTracking));
      }

      ws.on('close', () => {
        const clientSet = this.connections.get(orderId);
        if (clientSet) {
          clientSet.delete(ws);
          if (clientSet.size === 0) {
            this.connections.delete(orderId);
          }
        }
      });

      ws.on('error', (err) => {
        console.error(`WebSocket error for order ${orderId}:`, err);
      });
    });
  }

  public setInitialTracking(delivery: Delivery): void {
    this.trackingData.set(delivery.orderId, delivery);
  }

  public getTracking(orderId: string): Delivery | null {
    return this.trackingData.get(orderId) || null;
  }

  public updateDeliveryStatus(orderId: string, status: DeliveryStatus, location: string | null = null, message: string | null = null): Delivery {
    let tracking = this.trackingData.get(orderId);
    const timestamp = new Date().toISOString();
    const newLog: DeliveryLog = { status, location, message, timestamp };

    if (!tracking) {
      tracking = {
        orderId,
        orderNumber: `ORD-${orderId}`,
        customerId: 0,
        status,
        location,
        message,
        createdAt: timestamp,
        logs: [newLog]
      };
    } else {
      tracking = {
        ...tracking,
        status,
        location,
        message,
        logs: [...tracking.logs, newLog]
      };
    }

    this.trackingData.set(orderId, tracking);
    this.broadcastUpdate(orderId, tracking);

    return tracking;
  }

  private broadcastUpdate(orderId: string, delivery: Delivery): void {
    const clients = this.connections.get(orderId);
    if (!clients) return;

    const payload = JSON.stringify(delivery);
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

export const trackingServer = new TrackingServer();
