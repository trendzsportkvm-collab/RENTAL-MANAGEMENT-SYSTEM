export type PaymentStatus = "unpaid" | "partial" | "paid";
export type RentalStatus = "out" | "returned";
export type ReturnCondition = "good" | "damaged" | "missing";

export interface ProductVariation {
  id: string;
  name: string;
  sku: string;
  dailyRate: number;
  stock: Record<string, number>;
  attributes: Record<string, string>;
  enabled: boolean;
  physicalItems?: InventoryItem[];
}

export interface InventoryItem {
  id: string;
  productId: string;
  variationId: string;
  branchId: string;
  itemSku: string;
  status: "available" | "rented" | "maintenance";
  qrToken?: string;
}

export interface ProductAttribute {
  name: string;
  values: string[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  dailyRate: number;
  image: string;
  description?: string;
  category: string;
  purchasePrice?: number;
  replacementValue?: number;
  attributes?: ProductAttribute[];
  variations?: ProductVariation[];
}

export interface Rental {
  id: string;
  token: string;
  productId: string;
  productName: string;
  variationId?: string;
  variationName?: string;
  sku: string;
  image: string;
  branch: string;
  customerName: string;
  customerPhone: string;
  qty: number;
  rentDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  dailyRate: number;
  total: number;
  advance: number;
  paymentStatus: PaymentStatus;
  status: RentalStatus;
  notes: string;
  returnedOn?: string;
  condition?: ReturnCondition;
  bufferDays?: number;
  extra_fees?: number;
  extra_fees_reason?: string;
}

export interface StockLocation {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email: string;
  enabled: boolean;
}

export interface Category {
  id: string;
  name: string;
  base_sku?: string;
}

