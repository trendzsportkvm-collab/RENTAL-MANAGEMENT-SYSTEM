import { useMemo, useState } from "react";
import { Star, Image as ImageIcon, Trash2 } from "lucide-react";
import { useTrendz } from "@/lib/trendz/store";
import type { Product } from "@/lib/trendz/types";
import { inr } from "@/lib/trendz/utils";
import { StatusBadge, inputClass, goldButtonClass } from "../primitives";
import { TableSkeleton } from "../Skeleton";
export function AllProducts({ 
  onOpen, 
  onEdit 
}: { 
  onOpen: (p: Product) => void;
  onEdit: (id: string | null) => void;
}) {
  const { products, branches, isLoading, deleteProduct } = useTrendz();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const totalOf = (p: Product) => {
    return (p.variations || []).reduce((sum, v) => {
      if (!v.enabled) return sum;
      return sum + Object.values(v.stock).reduce((a, b) => a + b, 0);
    }, 0);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      
      const total = totalOf(p);
      if (stockFilter === "in" && total <= 0) return false;
      if (stockFilter === "out" && total > 0) return false;
      
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      
      return true;
    });
  }, [products, query, categoryFilter, stockFilter]);

  // Unique categories for the dropdown
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  }, [products]);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">All Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} item{filtered.length === 1 ? "" : "s"} in the catalog
          </p>
        </div>
        <button
          onClick={() => onEdit(null)}
          className={goldButtonClass}
        >
          New Product
        </button>
      </header>

      {/* Toolbar */}
      <div className="glass mt-6 flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <select className={inputClass + " w-40"} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">Select a category</option>
            {uniqueCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          
          <select className={inputClass + " w-40"} value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
            <option value="all">Filter by stock status</option>
            <option value="in">In stock</option>
            <option value="out">Out of stock</option>
          </select>
          <button className="h-9 px-4 rounded border border-border text-xs font-medium hover:bg-white/[0.05] transition-colors">Filter</button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input
            className={inputClass + " w-48"}
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="h-9 px-4 rounded border border-border text-xs font-medium hover:bg-white/[0.05] transition-colors">Search products</button>
        </div>
      </div>

      {/* Table */}
      <div className="glass mt-4 overflow-x-auto rounded-lg">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-white/[0.02]">
              <th className="w-12 px-4 py-3 text-center"><input type="checkbox" className="rounded border-border bg-transparent focus:ring-gold" /></th>
              <th className="w-16 px-4 py-3"><ImageIcon className="h-4 w-4 text-muted-foreground" /></th>
              <th className="px-4 py-3 font-medium text-gold hover:text-gold/80 cursor-pointer">Name</th>
              <th className="px-4 py-3 font-medium text-gold hover:text-gold/80 cursor-pointer">SKU</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium text-gold hover:text-gold/80 cursor-pointer">Price</th>
              <th className="px-4 py-3 font-medium">Categories</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="w-12 px-4 py-3 text-center"><Star className="mx-auto h-4 w-4" /></th>
              <th className="px-4 py-3 font-medium">Brands</th>
              <th className="px-4 py-3 font-medium text-gold hover:text-gold/80 cursor-pointer">Date</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          {isLoading ? (
            <tbody>
              <tr>
                <td colSpan={13} className="p-4">
                  <TableSkeleton rows={10} columns={10} />
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
              const stockNum = totalOf(p);
              const inStock = stockNum > 0;
              return (
                <tr key={p.id} className="group transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-center">
                    <input type="checkbox" className="rounded border-border bg-transparent focus:ring-gold" />
                  </td>
                  <td className="px-4 py-3">
                    <img src={p.image} alt="" className="h-10 w-10 rounded border border-border object-cover" />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onOpen(p)} className="font-medium text-gold hover:underline">
                      {p.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.sku || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={inStock ? "text-emerald-500 font-medium" : "text-rust font-medium"}>
                      {inStock ? `In stock (${stockNum})` : "Out of stock"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col text-xs font-mono text-muted-foreground">
                      {p.variations && p.variations.length > 0 ? (
                        <>
                          <span>{inr(Math.min(...p.variations.map(v => v.dailyRate)))}</span>
                          <span>—</span>
                          <span>{inr(Math.max(...p.variations.map(v => v.dailyRate)))}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gold hover:underline cursor-pointer">
                    {p.category || "Uncategorized"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                  <td className="px-4 py-3 text-center">
                    <Star className="mx-auto h-4 w-4 text-muted-foreground opacity-30 hover:opacity-100 hover:text-gold cursor-pointer transition-all" />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <div>Published</div>
                    <div>2026/07/08 at 5:21 pm</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gold">
                    {branches.map(b => {
                      const qty = (p.variations || []).reduce((sum, v) => sum + (v.stock[b] || 0), 0);
                      if (qty && qty > 0) return <div key={b} className="hover:underline cursor-pointer">{b}</div>;
                      return null;
                    })}
                    {stockNum === 0 && <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button 
                        onClick={() => onEdit(p.id)}
                        className="rounded border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${p.name}?`)) {
                            deleteProduct(p.id);
                          }
                        }}
                        className="rounded border border-red-500/30 bg-red-500/10 p-1.5 text-red-500 hover:bg-red-500/20 transition-colors"
                        title="Delete product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          )}
        </table>
        {!isLoading && filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No products found matching your search.
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end text-sm text-muted-foreground">
        <div>
          {filtered.length} items
        </div>
      </div>
    </div>
  );
}
