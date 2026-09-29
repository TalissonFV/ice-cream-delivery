export type DeliveryStatus = 'in_transit' | 'delivering' | 'delivered' | 'failed';

export interface DeliveryLog {
  status: DeliveryStatus;
  location: string | null;
  message: string | null;
  timestamp: string;
}

export interface Delivery {
  orderId: string;
  orderNumber: string;
  customerId: number;
  status: DeliveryStatus;
  location: string | null;
  message: string | null;
  createdAt: string;
  logs: DeliveryLog[];
}
