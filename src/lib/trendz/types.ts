export type PaymentStatus = "unpaid" | "partial" | "paid";
export type RentalStatus = "out" | "returned";
export type ReturnCondition = "good" | "damaged" | "missing";

export interface Product {
  id: string;
  name: string;
  sku: string;
  dailyRate: number;
  image: string;
  /** branch name -> quantity in stock */
  stock: Record<string, number>;
}

export interface Rental {
  id: string;
  token: string;
  productId: string;
  productName: string;
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
}

export const BRANCHES = ["Kalpetta", "Bathery"] as const;
