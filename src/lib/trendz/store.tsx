import { createContext, useCallback, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import type { PaymentStatus, Product, Rental, ReturnCondition, StockLocation } from "./types";
import { nextToken, shiftISO, todayISO } from "./utils";

const initialLocations: StockLocation[] = [
  {
    id: "l1",
    name: "Branch 1 - Kalpetta",
    slug: "branch-1-kalpetta",
    isDefault: false,
    backorderLocation: false,
    autoAllocate: false,
    priority: 0,
    email: "",
    enabled: true,
  },
  {
    id: "l2",
    name: "Branch 2 - Sulthan Bathery",
    slug: "branch-2-sulthan-bathery",
    isDefault: false,
    backorderLocation: false,
    autoAllocate: false,
    priority: 0,
    email: "",
    enabled: true,
  }
];

const initialProducts: Product[] = [
  {
    id: "p1",
    name: "Designer Bridal Lehenga",
    sku: "LEH-001",
    dailyRate: 2499,
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80",
    type: "simple",
    category: "Lehenga",
    stock: { "Branch 1 - Kalpetta": 3, "Branch 2 - Sulthan Bathery": 2 },
  },
  {
    id: "p2",
    name: "Groom Sherwani",
    sku: "SHR-001",
    dailyRate: 1899,
    image: "https://images.unsplash.com/photo-1605908502724-906062957813?w=800&q=80",
    type: "simple",
    category: "Sherwani",
    stock: { "Branch 1 - Kalpetta": 5, "Branch 2 - Sulthan Bathery": 0 },
  },
  {
    id: "p3",
    name: "Bridal Gown",
    sku: "GWN-001",
    dailyRate: 2999,
    image: "https://images.unsplash.com/photo-1596455607563-ad6193f76b17?w=800&q=80",
    type: "simple",
    category: "Gown",
    stock: { "Branch 1 - Kalpetta": 0, "Branch 2 - Sulthan Bathery": 4 },
  },
  {
    id: "p4",
    name: "Kanchipuram Silk Saree",
    sku: "SS-001",
    dailyRate: 1299,
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80",
    type: "simple",
    category: "Saree",
    stock: { "Branch 1 - Kalpetta": 2, "Branch 2 - Sulthan Bathery": 1 },
  },
  {
    id: "p5",
    name: "Premium Tuxedo",
    sku: "TUX",
    dailyRate: 1599,
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
    type: "variable",
    category: "Suit",
    stock: {},
    attributes: [
      { name: "Color", values: ["Black", "Navy"] },
      { name: "Size", values: ["38", "40"] },
    ],
    variations: [
      {
        id: "v1",
        name: "Color: Black, Size: 38",
        sku: "TUX-BLK-38",
        dailyRate: 1599,
        stock: { "Branch 1 - Kalpetta": 2, "Branch 2 - Sulthan Bathery": 1 },
        attributes: { Color: "Black", Size: "38" },
        enabled: true,
      },
      {
        id: "v2",
        name: "Color: Black, Size: 40",
        sku: "TUX-BLK-40",
        dailyRate: 1599,
        stock: { "Branch 1 - Kalpetta": 0, "Branch 2 - Sulthan Bathery": 1 },
        attributes: { Color: "Black", Size: "40" },
        enabled: true,
      },
      {
        id: "v3",
        name: "Color: Navy, Size: 38",
        sku: "TUX-NVY-38",
        dailyRate: 1599,
        stock: { "Branch 1 - Kalpetta": 1, "Branch 2 - Sulthan Bathery": 0 },
        attributes: { Color: "Navy", Size: "38" },
        enabled: true,
      },
      {
        id: "v4",
        name: "Color: Navy, Size: 40",
        sku: "TUX-NVY-40",
        dailyRate: 1599,
        stock: { "Branch 1 - Kalpetta": 1, "Branch 2 - Sulthan Bathery": 1 },
        attributes: { Color: "Navy", Size: "40" },
        enabled: true,
      },
    ],
  },
];

const initialRentals: Rental[] = [
  {
    id: "r1",
    token: "TRZ-2024-0001",
    productId: "p1",
    productName: "Designer Bridal Lehenga",
    sku: "LEH-001",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80",
    branch: "Branch 1 - Kalpetta",
    customerName: "Arjun Kumar",
    customerPhone: "9847012345",
    qty: 1,
    rentDate: shiftISO(-4),
    dueDate: shiftISO(-1),
    dailyRate: 2499,
    total: 9996,
    advance: 5000,
    paymentStatus: "partial",
    status: "out",
    notes: "Wedding function at Sultan Bathery.",
  },
  {
    id: "r2",
    token: "TRZ-2024-0002",
    productId: "p2",
    productName: "Groom Sherwani",
    sku: "SHR-001",
    image: "https://images.unsplash.com/photo-1605908502724-906062957813?w=800&q=80",
    branch: "Branch 2 - Sulthan Bathery",
    customerName: "Meera Nair",
    customerPhone: "9995512345",
    qty: 1,
    rentDate: todayISO(),
    dueDate: shiftISO(1),
    dailyRate: 1899,
    total: 1899,
    advance: 0,
    paymentStatus: "unpaid",
    status: "out",
    notes: "",
  },
  {
    id: "r4",
    token: "TRZ-2024-0004",
    productId: "p1",
    productName: "Designer Bridal Lehenga",
    sku: "LEH-001",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80",
    branch: "Branch 1 - Kalpetta",
    customerName: "Rahul Sharma",
    customerPhone: "9123456780",
    qty: 1,
    rentDate: shiftISO(-10),
    dueDate: shiftISO(-5),
    dailyRate: 2499,
    total: 12495,
    advance: 12495,
    paymentStatus: "paid",
    status: "returned",
    condition: "good",
    returnedOn: shiftISO(-4),
    notes: "Returned on time.",
  },
  {
    id: "r3",
    token: "TRZ-2024-0003",
    productId: "p4",
    productName: "Kanchipuram Silk Saree",
    sku: "SS-001",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80",
    branch: "Branch 1 - Kalpetta",
    customerName: "Priya Menon",
    customerPhone: "9846098460",
    qty: 1,
    rentDate: shiftISO(-1),
    dueDate: shiftISO(7),
    dailyRate: 1299,
    total: 10392,
    advance: 10392,
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
  isLoading: boolean;
  products: Product[];
  rentals: Rental[];
  branches: string[];
  locations: StockLocation[];
  categories: string[];
  createRental: (r: Omit<Rental, "id" | "token" | "status">) => Rental;
  createProduct: (p: Omit<Product, "id">) => Product;
  updateProduct: (id: string, p: Partial<Product>) => void;
  updateRental: (id: string, patch: Partial<Rental>) => void;
  setPaymentStatus: (id: string, p: PaymentStatus) => void;
  markReturned: (id: string, condition: ReturnCondition) => void;
  importProducts: (rows: ImportRow[]) => { created: number; updated: number; errors: string[] };
  createLocation: (loc: Omit<StockLocation, "id">) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const initialCategories = ["Suit", "Shirt", "Jacket", "Saree", "Jeans", "Tuxedo"];

export function TrendzProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [rentals, setRentals] = useState<Rental[]>(initialRentals);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [locations, setLocations] = useState<StockLocation[]>(initialLocations);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const branches = useMemo(() => {
    return locations.map(l => l.name);
  }, [locations]);

  const adjustStock = useCallback((productId: string, branch: string, delta: number, variationId?: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        if (p.type === "simple" || !variationId) {
          return { ...p, stock: { ...p.stock, [branch]: Math.max(0, (p.stock[branch] ?? 0) + delta) } };
        }
        return {
          ...p,
          variations: p.variations?.map((v) =>
            v.id === variationId
              ? { ...v, stock: { ...v.stock, [branch]: Math.max(0, (v.stock[branch] ?? 0) + delta) } }
              : v
          ),
        };
      })
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
      adjustStock(rental.productId, rental.branch, -rental.qty, rental.variationId);
      return rental;
    },
    [rentals, adjustStock],
  );

  const createProduct: StoreValue["createProduct"] = useCallback((draft) => {
    const product: Product = { ...draft, id: `p${Date.now()}` };
    setProducts((prev) => [product, ...prev]);
    return product;
  }, []);

  const updateProduct: StoreValue["updateProduct"] = useCallback((id, patch) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

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
          adjustStock(target.productId, target.branch, target.qty, target.variationId);
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
            image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80",
            type: "simple",
            category: "Uncategorized",
            stock: { [branch]: qty },
          });
          created += 1;
        }
      });
      return next;
    });

    return { created, updated, errors };
  }, []);

  const createLocation: StoreValue["createLocation"] = useCallback((draft) => {
    setLocations((prev) => [...prev, { ...draft, id: `l${Date.now()}` }]);
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      products,
      rentals,
      branches,
      locations,
      categories,
      createProduct,
      updateProduct,
      createRental,
      updateRental,
      setPaymentStatus,
      markReturned,
      importProducts,
      createLocation,
    }),
    [isLoading, products, rentals, branches, locations, categories, createProduct, updateProduct, createRental, updateRental, setPaymentStatus, markReturned, importProducts, createLocation],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useTrendz() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useTrendz must be used inside TrendzProvider");
  return ctx;
}
