import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import bridal from "@/assets/bridal-suit.jpg";
import linen from "@/assets/linen-shirt.jpg";
import denim from "@/assets/denim-jacket.jpg";
import saree from "@/assets/silk-saree.jpg";
import type { PaymentStatus, Product, Rental, ReturnCondition } from "./types";
import { nextToken, shiftISO, todayISO } from "./utils";

const initialProducts: Product[] = [
  {
    id: "p1",
    name: "Bridal Suit",
    sku: "SU-001",
    dailyRate: 999,
    image: bridal,
    stock: { Kalpetta: 3, Bathery: 2 },
  },
  {
    id: "p2",
    name: "Linen Shirt",
    sku: "WLS-001",
    dailyRate: 199,
    image: linen,
    stock: { Kalpetta: 5, Bathery: 0 },
  },
  {
    id: "p3",
    name: "Denim Jacket",
    sku: "DJ-001",
    dailyRate: 299,
    image: denim,
    stock: { Kalpetta: 0, Bathery: 4 },
  },
  {
    id: "p4",
    name: "Silk Saree",
    sku: "SS-001",
    dailyRate: 799,
    image: saree,
    stock: { Kalpetta: 2, Bathery: 1 },
  },
];

const initialRentals: Rental[] = [
  {
    id: "r1",
    token: "TRZ-2024-0001",
    productId: "p1",
    productName: "Bridal Suit",
    sku: "SU-001",
    image: bridal,
    branch: "Kalpetta",
    customerName: "Arjun Kumar",
    customerPhone: "9847012345",
    qty: 1,
    rentDate: shiftISO(-4),
    dueDate: shiftISO(-1),
    dailyRate: 999,
    total: 999,
    advance: 500,
    paymentStatus: "partial",
    status: "out",
    notes: "Wedding function at Sultan Bathery.",
  },
  {
    id: "r2",
    token: "TRZ-2024-0002",
    productId: "p2",
    productName: "Linen Shirt",
    sku: "WLS-001",
    image: linen,
    branch: "Bathery",
    customerName: "Meera Nair",
    customerPhone: "9995512345",
    qty: 1,
    rentDate: todayISO(),
    dueDate: shiftISO(1),
    dailyRate: 199,
    total: 199,
    advance: 0,
    paymentStatus: "unpaid",
    status: "out",
    notes: "",
  },
  {
    id: "r3",
    token: "TRZ-2024-0003",
    productId: "p4",
    productName: "Silk Saree",
    sku: "SS-001",
    image: saree,
    branch: "Kalpetta",
    customerName: "Priya Menon",
    customerPhone: "9846098460",
    qty: 1,
    rentDate: shiftISO(-1),
    dueDate: shiftISO(7),
    dailyRate: 799,
    total: 5593,
    advance: 5593,
    paymentStatus: "paid",
    status: "out",
    notes: "Onam celebration.",
  },
];

export interface ImportRow {
  name: string;
  sku: string;
  daily_rate: string;
  branch_name: string;
  quantity: string;
}

interface StoreValue {
  products: Product[];
  rentals: Rental[];
  branches: string[];
  createRental: (r: Omit<Rental, "id" | "token" | "status">) => Rental;
  updateRental: (id: string, patch: Partial<Rental>) => void;
  setPaymentStatus: (id: string, p: PaymentStatus) => void;
  markReturned: (id: string, condition: ReturnCondition) => void;
  importProducts: (rows: ImportRow[]) => { created: number; updated: number; errors: string[] };
}

const StoreContext = createContext<StoreValue | null>(null);

export function TrendzProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [rentals, setRentals] = useState<Rental[]>(initialRentals);

  const branches = useMemo(() => {
    const set = new Set<string>(["Kalpetta", "Bathery"]);
    products.forEach((p) => Object.keys(p.stock).forEach((b) => set.add(b)));
    return [...set];
  }, [products]);

  const adjustStock = useCallback((productId: string, branch: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, stock: { ...p.stock, [branch]: Math.max(0, (p.stock[branch] ?? 0) + delta) } }
          : p,
      ),
    );
  }, []);

  const createRental: StoreValue["createRental"] = useCallback(
    (draft) => {
      const rental: Rental = {
        ...draft,
        id: `r${Date.now()}`,
        token: nextToken(rentals),
        status: "out",
      };
      setRentals((prev) => [rental, ...prev]);
      adjustStock(rental.productId, rental.branch, -rental.qty);
      return rental;
    },
    [rentals, adjustStock],
  );

  const updateRental: StoreValue["updateRental"] = useCallback((id, patch) => {
    setRentals((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const setPaymentStatus: StoreValue["setPaymentStatus"] = useCallback((id, paymentStatus) => {
    setRentals((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              paymentStatus,
              advance: paymentStatus === "paid" ? r.total : r.advance,
            }
          : r,
      ),
    );
  }, []);

  const markReturned: StoreValue["markReturned"] = useCallback(
    (id, condition) => {
      setRentals((prev) => {
        const target = prev.find((r) => r.id === id);
        if (target && condition !== "missing") {
          adjustStock(target.productId, target.branch, target.qty);
        }
        return prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "returned" as const,
                paymentStatus: "paid" as const,
                advance: r.total,
                condition,
                returnedOn: todayISO(),
              }
            : r,
        );
      });
    },
    [adjustStock],
  );

  const importProducts: StoreValue["importProducts"] = useCallback((rows) => {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    setProducts((prev) => {
      const next = prev.map((p) => ({ ...p, stock: { ...p.stock } }));
      rows.forEach((row, i) => {
        const line = i + 2;
        const name = row.name?.trim();
        const sku = row.sku?.trim();
        const rate = Number(row.daily_rate);
        const branch = row.branch_name?.trim();
        const qty = Number(row.quantity);
        if (!name || !sku || !branch) {
          errors.push(`Row ${line}: missing name, sku or branch_name`);
          return;
        }
        if (!Number.isFinite(rate) || rate <= 0) {
          errors.push(`Row ${line}: invalid daily_rate "${row.daily_rate}"`);
          return;
        }
        if (!Number.isFinite(qty) || qty < 0) {
          errors.push(`Row ${line}: invalid quantity "${row.quantity}"`);
          return;
        }
        const existing = next.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
        if (existing) {
          existing.name = name;
          existing.dailyRate = rate;
          existing.stock[branch] = qty;
          updated += 1;
        } else {
          next.push({
            id: `p${Date.now()}-${i}`,
            name,
            sku,
            dailyRate: rate,
            image: bridal,
            stock: { [branch]: qty },
          });
          created += 1;
        }
      });
      return next;
    });

    return { created, updated, errors };
  }, []);

  const value = useMemo(
    () => ({
      products,
      rentals,
      branches,
      createRental,
      updateRental,
      setPaymentStatus,
      markReturned,
      importProducts,
    }),
    [products, rentals, branches, createRental, updateRental, setPaymentStatus, markReturned, importProducts],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useTrendz() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useTrendz must be used inside TrendzProvider");
  return ctx;
}
