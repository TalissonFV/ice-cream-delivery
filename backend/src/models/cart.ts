export interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Cart {
  customerId: number;
  items: CartItem[];
  totalAmount: number;
}
