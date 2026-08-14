import { createContext, useCallback, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import type { PaymentStatus, Product, Rental, ReturnCondition, StockLocation } from "./types";
import { nextToken, shiftISO, todayISO } from "./utils";
import { createClient } from "../supabase/client";

export interface ImportRow {
  name: string;
  sku: string;
  category?: string;
  "daily rate"?: string;
  description?: string;
  "image url"?: string;
}

interface StoreValue {
  isLoading: boolean;
  products: Product[];
  rentals: Rental[];
  branches: string[];
  locations: StockLocation[];
  categories: string[];
  createRental: (r: Omit<Rental, "id" | "token" | "status">) => Promise<Rental>;
  createProduct: (p: Omit<Product, "id">) => Product;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  updateRental: (id: string, patch: Partial<Rental>) => void;
  setPaymentStatus: (id: string, p: PaymentStatus) => void;
  markReturned: (id: string, payload: { condition: ReturnCondition; returned_on: string; total: number; advance: number; payment_status: "paid" | "partial" | "unpaid"; notes: string }) => void;
  importProducts: (rows: ImportRow[]) => Promise<{ created: number; updated: number; errors: string[] }>;
  createLocation: (loc: Omit<StockLocation, "id">) => void;
}

export const StoreContext = createContext<StoreValue | null>(null);

export function TrendzProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const supabase = createClient();

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [branchesRes, catRes, productsRes, rentalsRes] = await Promise.all([
        supabase.from('branches').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('products').select(`
          *,
          categories(name),
          product_variations(
            id, name, sku, daily_rate, is_enabled, attributes,
            product_stock(quantity, branches(name))
          )
        `),
        supabase.from('rentals').select(`
          id, token, rent_date, due_date, total, advance, payment_status, status, returned_on, condition, notes,
          customers(full_name, phone),
          branches(name),
          rental_items(
            variation_id, product_name, sku, image_url, qty, daily_rate,
            product_variations(name, product_id)
          )
        `).order('created_at', { ascending: false })
      ]);

      if (branchesRes.data) {
        setLocations(branchesRes.data
          .map(b => ({
            id: b.id, name: b.name, slug: b.slug,
            email: b.email || "", phone: b.phone || "", address: b.address || "", enabled: b.is_active
        })));
      }

      if (catRes.data) {
        setCategories(catRes.data.map(c => c.name));
      }

      if (productsRes.data) {
        setProducts(productsRes.data.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku || "",
          dailyRate: p.daily_rate || (p.product_variations?.find((v: any) => v.daily_rate > 0)?.daily_rate) || 0,
          image: p.image_url || "https://placehold.co/600x600/eeeeee/999999?text=No+Image",
          description: p.description,
          category: p.categories?.name || "Uncategorized",
          purchasePrice: p.purchase_price || 0,
          replacementValue: p.replacement_value || 0,
          attributes: p.attributes || [],
          variations: (p.product_variations || []).map((v: any) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            dailyRate: v.daily_rate || 0,
            enabled: v.is_enabled ?? true,
            attributes: v.attributes || {},
            stock: (v.product_stock || []).reduce((acc: any, s: any) => {
              if (s.branches?.name) acc[s.branches.name] = s.quantity;
              return acc;
            }, {}),
          })),
        })));
      }

      if (rentalsRes.data) {
        setRentals(rentalsRes.data.map(r => {
          const item = r.rental_items?.[0] || {};
          return {
            id: r.id,
            token: r.token,
            productId: (item.product_variations as any)?.product_id || (item.product_variations as any)?.[0]?.product_id || "",
            productName: item.product_name || "Unknown Item",
            variationId: item.variation_id || undefined,
            variationName: (item.product_variations as any)?.name || (item.product_variations as any)?.[0]?.name || undefined,
            sku: item.sku || "",
            image: item.image_url || "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80",
            branch: (r.branches as any)?.name || (r.branches as any)?.[0]?.name || "",
            customerName: (r.customers as any)?.full_name || (r.customers as any)?.[0]?.full_name || "",
            customerPhone: (r.customers as any)?.phone || (r.customers as any)?.[0]?.phone || "",
            qty: item.qty || 1,
            rentDate: r.rent_date,
            dueDate: r.due_date,
            dailyRate: item.daily_rate || 0,
            total: r.total || 0,
            advance: r.advance || 0,
            paymentStatus: r.payment_status as any,
            status: r.status as any,
            notes: r.notes || "",
            returnedOn: r.returned_on || undefined,
            condition: r.condition || undefined,
          };
        }));
      }
      
    } catch(e) {
      console.error(e);
    }
    setIsLoading(false);
  }, [supabase]);


  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const branches = useMemo(() => locations.map(l => l.name), [locations]);

  const createProduct: StoreValue["createProduct"] = useCallback((draft) => {
    const product: Product = { ...draft, id: `p${Date.now()}` };
    setProducts((prev) => [product, ...prev]);

    // Background sync — save product to Supabase and then save stock rows
    (async () => {
      try {
        // 1. Resolve category_id
        let categoryId: string | null = null;
        if (draft.category) {
          const { data: catData } = await supabase
            .from("categories")
            .select("id")
            .ilike("name", draft.category)
            .maybeSingle();
          if (catData) {
            categoryId = catData.id;
          } else {
            const { data: newCat } = await supabase
              .from("categories")
              .insert({ name: draft.category })
              .select("id")
              .single();
            if (newCat) categoryId = newCat.id;
          }
        }

        // 2. Insert the product
        const { data: inserted, error: insertErr } = await supabase
          .from("products")
          .insert({
            name: draft.name,
            sku: draft.sku,
            image_url: draft.image,
            description: draft.description,
            category_id: categoryId,
            purchase_price: draft.purchasePrice || 0,
            replacement_value: draft.replacementValue || 0,
            attributes: draft.attributes || [],
          })
          .select("id")
          .single();

        if (insertErr || !inserted) {
          console.error("Failed to save product:", insertErr);
          return;
        }

        const realId = inserted.id;
        // Update local state with the real Supabase UUID so future updates work
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, id: realId } : p))
        );

        // 3. Save variations + their stock
        if (draft.variations?.length) {
          const { data: branches } = await supabase
            .from("branches")
            .select("id, name");
          for (const variation of draft.variations) {
            if (!variation.enabled) continue;
            const { data: insertedVar } = await supabase
              .from("product_variations")
              .insert({
                product_id: realId,
                name: variation.name,
                sku: variation.sku,
                daily_rate: variation.dailyRate,
                is_enabled: variation.enabled,
                attributes: variation.attributes || {},
              })
              .select("id")
              .single();

            if (insertedVar && branches) {
              const varStockRows = Object.entries(variation.stock)
                .filter(([, qty]) => qty > 0)
                .map(([branchName, qty]) => {
                  const branch = branches.find((b) => b.name === branchName);
                  return branch
                    ? { product_id: realId, variation_id: insertedVar.id, branch_id: branch.id, quantity: qty }
                    : null;
                })
                .filter(Boolean);
              if (varStockRows.length > 0) {
                await supabase.from("product_stock").insert(varStockRows as any[]);
              }
              
              let skuCounter = 1;
              const inventoryItems = [];
              for (const [branchName, qty] of Object.entries(variation.stock)) {
                if (qty <= 0) continue;
                const branch = branches.find((b) => b.name === branchName);
                if (!branch) continue;
                for (let i = 0; i < qty; i++) {
                  const itemSku = `${variation.sku}-${String(skuCounter).padStart(3, '0')}`;
                  inventoryItems.push({
                    product_id: realId,
                    variation_id: insertedVar.id,
                    branch_id: branch.id,
                    item_sku: itemSku,
                    status: 'available'
                  });
                  skuCounter++;
                }
              }
              if (inventoryItems.length > 0) {
                await supabase.from("inventory_items").insert(inventoryItems);
              }
            }
          }
        }
      } catch (e) {
        console.error("createProduct sync error:", e);
      }
    })();

    return product;
  }, [supabase]);

  const updateProduct: StoreValue["updateProduct"] = useCallback((id, patch) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    if (id.startsWith('p')) return;
    
    (async () => {
      try {
        const dbPatch: any = {};
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.sku !== undefined) dbPatch.sku = patch.sku;
        if (patch.image !== undefined) dbPatch.image_url = patch.image;
        if (patch.description !== undefined) dbPatch.description = patch.description;
        if (patch.purchasePrice !== undefined) dbPatch.purchase_price = patch.purchasePrice;
        if (patch.replacementValue !== undefined) dbPatch.replacement_value = patch.replacementValue;
        if (patch.attributes !== undefined) dbPatch.attributes = patch.attributes;
        if (patch.category !== undefined) {
          const { data: catData } = await supabase.from("categories").select("id").ilike("name", patch.category).maybeSingle();
          if (catData) {
            dbPatch.category_id = catData.id;
          } else if (patch.category) {
            const { data: newCat } = await supabase.from("categories").insert({ name: patch.category }).select("id").single();
            if (newCat) dbPatch.category_id = newCat.id;
          } else {
            dbPatch.category_id = null;
          }
        }

        if (Object.keys(dbPatch).length > 0) {
          await supabase.from('products').update(dbPatch).eq('id', id);
        }

        const { data: branches } = await supabase.from("branches").select("id, name");
        if (!branches) return;

        if (patch.variations) {
          for (const v of patch.variations) {
            try {
              const isNew = v.id.startsWith('v');
              let realVarId = v.id;
              
              if (isNew) {
                const { data: upserted, error: varErr } = await supabase.from("product_variations")
                  .upsert({
                    product_id: id,
                    name: v.name,
                    sku: v.sku,
                    daily_rate: v.dailyRate,
                    is_enabled: v.enabled,
                    attributes: v.attributes || {}
                  }, { onConflict: 'sku' })
                  .select("id")
                  .single();
                  
                if (varErr || !upserted) {
                  console.error("Variation upsert error for", v.sku, varErr);
                  continue;
                }
                realVarId = upserted.id;
              } else {
                const { error: updateErr } = await supabase.from("product_variations")
                  .update({
                    name: v.name,
                    sku: v.sku,
                    daily_rate: v.dailyRate,
                    is_enabled: v.enabled,
                    attributes: v.attributes || {}
                  })
                  .eq("id", realVarId);
                  
                if (updateErr) {
                  console.error("Variation update error for", v.sku, updateErr);
                  continue;
                }
              }
              
              // Now safely update stock
              await supabase.from("product_stock").delete().eq("variation_id", realVarId);
              const varStockRows = Object.entries(v.stock)
                .filter(([, qty]) => qty > 0)
                .map(([branchName, qty]) => {
                  const branch = branches.find((b) => b.name === branchName);
                  return branch ? { product_id: product.id, variation_id: realVarId, branch_id: branch.id, quantity: qty } : null;
                }).filter(Boolean);
                
              if (varStockRows.length > 0) {
                const { error: stockErr } = await supabase.from("product_stock").insert(varStockRows as any[]);
                if (stockErr) console.error("Stock insert error for", v.sku, stockErr);
              }

              // Update inventory items (only adding new ones if stock increased)
              const { data: existingItems } = await supabase.from("inventory_items")
                .select("item_sku, branch_id")
                .eq("variation_id", realVarId)
                .order("item_sku", { ascending: false });
                
              let nextSkuNumber = 1;
              if (existingItems && existingItems.length > 0) {
                const lastSku = existingItems[0].item_sku;
                const parts = lastSku.split('-');
                const num = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(num)) nextSkuNumber = num + 1;
              }

              const branchCounts: Record<string, number> = {};
              existingItems?.forEach(item => {
                branchCounts[item.branch_id] = (branchCounts[item.branch_id] || 0) + 1;
              });

              const newInventoryItems = [];
              for (const [branchName, qty] of Object.entries(v.stock)) {
                if (qty <= 0) continue;
                const branch = branches.find((b) => b.name === branchName);
                if (!branch) continue;
                
                const existingCount = branchCounts[branch.id] || 0;
                const toCreate = qty - existingCount;
                
                for (let i = 0; i < toCreate; i++) {
                  const itemSku = `${v.sku}-${String(nextSkuNumber).padStart(3, '0')}`;
                  newInventoryItems.push({
                    product_id: id,
                    variation_id: realVarId,
                    branch_id: branch.id,
                    item_sku: itemSku,
                    status: 'available'
                  });
                  nextSkuNumber++;
                }
              }

              if (newInventoryItems.length > 0) {
                await supabase.from("inventory_items").insert(newInventoryItems);
              }
            } catch (innerErr) {
              console.error("Error processing variation", v.sku, innerErr);
            }
          }
        }
      } catch (e) {
        console.error("updateProduct sync error", e);
      }
    })();
  }, [supabase]);

  const createRental: StoreValue["createRental"] = useCallback(async (draft) => {
    const tempId = `r${Date.now()}`;
    const rental: Rental = { ...draft, id: tempId, token: `TRZ-Pending`, status: "out" };
    setRentals((prev) => [rental, ...prev]);
    
    setProducts((prev) => prev.map(p => {
      if (p.id === draft.productId && draft.variationId && p.variations) {
        return {
          ...p,
          variations: p.variations.map(v => {
            if (v.id === draft.variationId) {
              return {
                ...v,
                stock: {
                  ...v.stock,
                  [draft.branch]: Math.max(0, (v.stock[draft.branch] || 0) - draft.qty)
                }
              };
            }
            return v;
          })
        };
      }
      return p;
    }));

    try {
      // 1. Resolve branch_id
      const { data: branch } = await supabase.from('branches').select('id').ilike('name', draft.branch).maybeSingle();
      if (!branch) throw new Error("Branch not found");

      // 2. Resolve or create customer_id
      let customerId: string;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', draft.customerPhone)
        .ilike('full_name', draft.customerName)
        .maybeSingle();
        
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error: custErr } = await supabase.from('customers').insert({
          full_name: draft.customerName,
          phone: draft.customerPhone
        }).select('id').single();
        if (custErr || !newCustomer) throw new Error("Failed to create customer");
        customerId = newCustomer.id;
      }

      // 3. Insert Rental
      const { data: insertedRental, error: rentalErr } = await supabase.from('rentals').insert({
        customer_id: customerId,
        branch_id: branch.id,
        rent_date: draft.rentDate,
        due_date: draft.dueDate,
        total: draft.total,
        advance: draft.advance,
        payment_status: draft.paymentStatus,
        status: "out",
        notes: draft.notes,
        buffer_days: draft.bufferDays || 0
      }).select('id, token').single();

      if (rentalErr || !insertedRental) throw new Error("Failed to insert rental: " + rentalErr?.message);

      // 4. Insert Rental Item (which triggers stock deduction)
      const days = Math.max(1, Math.ceil((new Date(draft.dueDate).getTime() - new Date(draft.rentDate).getTime()) / (1000 * 3600 * 24)));
      const { error: itemErr } = await supabase.from('rental_items').insert({
        rental_id: insertedRental.id,
        product_id: draft.productId,
        variation_id: draft.variationId || null,
        product_name: draft.productName,
        sku: draft.sku,
        image_url: draft.image,
        qty: draft.qty,
        daily_rate: draft.dailyRate,
        days,
        subtotal: draft.total
      });

      if (itemErr) {
        console.error("Failed to insert rental item:", itemErr);
        throw new Error("Failed to insert rental item: " + itemErr.message);
      }

      // 5. Deduct stock manually
      if (draft.variationId && branch) {
        const { data: currentStock } = await supabase.from('product_stock')
          .select('id, quantity')
          .eq('variation_id', draft.variationId)
          .eq('branch_id', branch.id)
          .maybeSingle();
          
        if (currentStock) {
          await supabase.from('product_stock')
            .update({ quantity: Math.max(0, currentStock.quantity - draft.qty) })
            .eq('id', currentStock.id);
        }
        
        const { data: availItems } = await supabase.from('inventory_items')
          .select('id')
          .eq('variation_id', draft.variationId)
          .eq('branch_id', branch.id)
          .eq('status', 'available')
          .limit(draft.qty);
          
        if (availItems && availItems.length > 0) {
          const ids = availItems.map((i: any) => i.id);
          await supabase.from('inventory_items')
            .update({ status: 'rented' })
            .in('id', ids);
        }
      }

      const finalRental: Rental = { ...draft, id: insertedRental.id, token: insertedRental.token, status: "out" };
      // Update local state with real IDs
      setRentals(prev => prev.map(r => r.id === tempId ? finalRental : r));
      return finalRental;
    } catch (err) {
      console.error("createRental sync error:", err);
      setRentals(prev => prev.filter(r => r.id !== tempId));
      setProducts((prev) => prev.map(p => {
        if (p.id === draft.productId && draft.variationId && p.variations) {
          return {
            ...p,
            variations: p.variations.map(v => {
              if (v.id === draft.variationId) {
                return {
                  ...v,
                  stock: {
                    ...v.stock,
                    [draft.branch]: (v.stock[draft.branch] || 0) + draft.qty
                  }
                };
              }
              return v;
            })
          };
        }
        return p;
      }));
      throw err;
    }
  }, [supabase]);

  const updateRental: StoreValue["updateRental"] = useCallback((id, patch) => {
    setRentals((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    if (!id.startsWith('r')) {
      const dbPatch: any = {};
      if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes;
      if (patch.total !== undefined) dbPatch.total = patch.total;
      if (patch.advance !== undefined) dbPatch.advance = patch.advance;
      if (patch.paymentStatus !== undefined) dbPatch.payment_status = patch.paymentStatus;
      
      if (Object.keys(dbPatch).length > 0) {
        supabase.from('rentals').update(dbPatch).eq('id', id).then();
      }
    }
  }, [supabase]);

  const setPaymentStatus: StoreValue["setPaymentStatus"] = useCallback((id, paymentStatus) => {
    setRentals((prev) => prev.map((r) => r.id === id ? { ...r, paymentStatus } : r));
    if (!id.startsWith('r')) {
      supabase.from('rentals').update({ payment_status: paymentStatus }).eq('id', id).then();
    }
  }, [supabase]);

  const markReturned: StoreValue["markReturned"] = useCallback((id, payload) => {
    setRentals((prev) => {
      const targetRental = prev.find(r => r.id === id);
      if (targetRental && targetRental.status !== "returned") {
        setProducts((pPrev) => pPrev.map(p => {
          if (p.id === targetRental.productId && targetRental.variationId && p.variations) {
            return {
              ...p,
              variations: p.variations.map(v => {
                if (v.id === targetRental.variationId) {
                  return {
                    ...v,
                    stock: {
                      ...v.stock,
                      [targetRental.branch]: (v.stock[targetRental.branch] || 0) + targetRental.qty
                    }
                  };
                }
                return v;
              })
            };
          }
          return p;
        }));
      }

      return prev.map((r) => r.id === id ? { 
        ...r, 
        status: "returned" as const, 
        paymentStatus: payload.payment_status, 
        condition: payload.condition, 
        returnedOn: payload.returned_on,
        total: payload.total,
        advance: payload.advance,
        notes: payload.notes
      } : r);
    });
    
    if (!id.startsWith('r')) {
      (async () => {
        try {
          await supabase.from('rentals').update({ 
            status: 'returned', 
            payment_status: payload.payment_status, 
            condition: payload.condition,
            returned_on: payload.returned_on,
            total: payload.total,
            advance: payload.advance,
            notes: payload.notes
          }).eq('id', id);

          // Get the rental to restore stock
          const { data: rental } = await supabase.from('rentals').select('branch_id').eq('id', id).single();
          const { data: items } = await supabase.from('rental_items').select('variation_id, qty').eq('rental_id', id);
          
          if (rental && items) {
            for (const item of items) {
              if (!item.variation_id) continue;
              
              // 1. Restore product_stock
              const { data: currentStock } = await supabase.from('product_stock')
                .select('id, quantity')
                .eq('variation_id', item.variation_id)
                .eq('branch_id', rental.branch_id)
                .maybeSingle();
                
              if (currentStock) {
                await supabase.from('product_stock')
                  .update({ quantity: currentStock.quantity + item.qty })
                  .eq('id', currentStock.id);
              }
              
              // 2. Restore inventory_items status
              const { data: rentedItems } = await supabase.from('inventory_items')
                .select('id')
                .eq('variation_id', item.variation_id)
                .eq('branch_id', rental.branch_id)
                .eq('status', 'rented')
                .limit(item.qty);
                
              if (rentedItems && rentedItems.length > 0) {
                const ids = rentedItems.map((i: any) => i.id);
                await supabase.from('inventory_items')
                  .update({ status: 'available' })
                  .in('id', ids);
              }
            }
          }
        } catch (err) {
          console.error("Failed to mark returned in DB:", err);
        }
      })();
    }
  }, [supabase]);

  const importProducts: StoreValue["importProducts"] = useCallback(async (rows) => {
    let created = 0; let updated = 0; const errors: string[] = [];
    
    const [
      { data: categories },
      { data: dbBranches },
      { data: existingProducts },
      { data: existingVariations },
      { data: existingStock }
    ] = await Promise.all([
      supabase.from('categories').select('id, name'),
      supabase.from('branches').select('id, name'),
      supabase.from('products').select('id, sku'),
      supabase.from('product_variations').select('id, sku'),
      supabase.from('product_stock').select('id, product_id, variation_id, branch_id')
    ]);
    
    const branchMap = new Map((dbBranches || []).map(b => [b.name.toLowerCase(), b.id]));
    const categoryMap = new Map((categories || []).map(c => [c.name.toLowerCase(), c.id]));
    
    const groups: Record<string, any[]> = {};
    rows.forEach((row, i) => {
      const sku = row.sku?.trim().toUpperCase();
      if (!sku) { errors.push(`Row ${i + 2}: missing Base SKU`); return; }
      if (!/^[A-Z]{3,4}-\d{3,4}$/.test(sku)) { errors.push(`Row ${i + 2}: Invalid SKU format (${sku})`); return; }
      if (!groups[sku]) groups[sku] = [];
      groups[sku].push(row);
    });

    const productsToUpsert: any[] = [];
    const variationsToUpsert: any[] = [];
    const stockToUpsert: any[] = [];
    const newLocalProducts: Product[] = [];
    
    for (const [baseSku, groupRows] of Object.entries(groups)) {
      const firstRow = groupRows[0];
      const name = firstRow.name?.trim();
      const categoryName = firstRow.category?.trim() || "Uncategorized";
      const catId = categoryMap.get(categoryName.toLowerCase()) || null;
      const imageUrl = firstRow["image url"]?.trim() || "https://placehold.co/600x600/eeeeee/999999?text=No+Image";
      const rate = Number(firstRow["daily rate"]) || 0;
      const desc = firstRow.description?.trim();
      
      let productId = existingProducts?.find(p => p.sku === baseSku)?.id;
      if (!productId) {
        productId = crypto.randomUUID();
        created++;
      } else {
        updated++;
      }
      
      productsToUpsert.push({
        id: productId,
        sku: baseSku,
        name,
        category_id: catId,
        image_url: imageUrl,
        daily_rate: rate,
        description: desc
      });
      
      const localProduct: Product = {
        id: productId,
        sku: baseSku,
        name,
        category: categoryName,
        image: imageUrl,
        dailyRate: rate,
        description: desc,
        variations: []
      };
      
        groupRows.forEach(row => {
          const vName = row["variation name"]?.trim();
          const vSku = row["variation sku"]?.trim().toUpperCase();
          if (!vName || !vSku) return;
          
          let vId = existingVariations?.find(v => v.sku === vSku)?.id;
          if (!vId) vId = crypto.randomUUID();
          
          const vRate = Number(row["daily rate"]) || rate;
          
          variationsToUpsert.push({
            id: vId,
            product_id: productId,
            name: vName,
            sku: vSku,
            daily_rate: vRate,
            is_enabled: true
          });
          
          const vStock: Record<string, number> = {};
          Object.entries(row).forEach(([key, val]) => {
            if (key.startsWith("stock:") && val) {
              const branchName = key.split(":")[1].trim();
              const branchId = branchMap.get(branchName.toLowerCase());
              const qty = Number(val);
              if (branchId && qty >= 0) {
                const stockId = existingStock?.find(s => s.variation_id === vId && s.branch_id === branchId)?.id || crypto.randomUUID();
                stockToUpsert.push({ id: stockId, product_id: productId, variation_id: vId, branch_id: branchId, quantity: qty });
                vStock[branchName] = qty;
              }
            }
          });
          
          localProduct.variations!.push({
            id: vId,
            name: vName,
            sku: vSku,
            dailyRate: vRate,
            stock: vStock,
            enabled: true,
            attributes: {}
          });
        });
      
      newLocalProducts.push(localProduct);
    }
    
    setProducts(prev => {
      const next = [...prev];
      newLocalProducts.forEach(np => {
        const idx = next.findIndex(p => p.sku === np.sku);
        if (idx !== -1) next[idx] = np;
        else next.push(np);
      });
      return next;
    });
    
    if (productsToUpsert.length > 0) await supabase.from('products').upsert(productsToUpsert);
    if (variationsToUpsert.length > 0) await supabase.from('product_variations').upsert(variationsToUpsert);
    if (stockToUpsert.length > 0) await supabase.from('product_stock').upsert(stockToUpsert);
    
    return { created, updated, errors };
  }, [supabase]);

  const createLocation: StoreValue["createLocation"] = useCallback((draft) => {
    const tempId = `l${Date.now()}`;
    setLocations((prev) => [...prev, { ...draft, id: tempId }]);
    
    supabase.from('branches').insert({
      name: draft.name,
      slug: draft.slug,
      email: draft.email || null,
      phone: draft.phone || null,
      address: draft.address || null,
      is_active: draft.enabled !== false
    }).select('id').single().then(({ data, error }) => {
      if (data && !error) {
        setLocations(prev => prev.map(l => l.id === tempId ? { ...l, id: data.id } : l));
      } else {
        console.error("Failed to insert branch:", error);
      }
    });
  }, [supabase]);

  const deleteProduct: StoreValue["deleteProduct"] = useCallback((id) => {
    const productToDelete = products.find(p => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (!id.startsWith('p')) {
      supabase.from('products').delete().eq('id', id).then(async ({ error }) => {
        if (error) {
          console.error("Failed to delete product:", error);
        } else if (productToDelete?.image && productToDelete.image.includes('product_images/')) {
          // Attempt to delete image from bucket
          const parts = productToDelete.image.split('/');
          const filename = parts[parts.length - 1];
          if (filename) {
            await supabase.storage.from("product_images").remove([filename]);
          }
        }
      });
    }
  }, [supabase, products]);

  const value = useMemo(() => ({
    isLoading, products, rentals, branches, locations, categories,
    createProduct, updateProduct, deleteProduct, createRental, updateRental, setPaymentStatus, markReturned, importProducts, createLocation,
  }), [isLoading, products, rentals, branches, locations, categories, createProduct, updateProduct, deleteProduct, createRental, updateRental, setPaymentStatus, markReturned, importProducts, createLocation]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useTrendz() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useTrendz must be used inside TrendzProvider");
  return ctx;
}


