export interface Product {
  id: number;
  name: string;
  type: string; // e.g., 'ice_cream', 'sorbet', etc.
  flavor: string | null;
  price: number;
  supplierId: number | null;
  description: string | null;
}
