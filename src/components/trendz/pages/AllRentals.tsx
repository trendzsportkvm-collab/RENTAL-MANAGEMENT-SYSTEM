import { useMemo, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { useTrendz } from "@/lib/trendz/store";
import type { Product } from "@/lib/trendz/types";
import { inr } from "@/lib/trendz/utils";
import { BranchPill, StatusBadge, inputClass } from "../primitives";
import { GridSkeleton, TableSkeleton } from "../Skeleton";

export function AllRentals({ onOpen }: { onOpen?: (p: Product) => void }) {
  const { products, branches, isLoading } = useTrendz();
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const totalOf = (p: Product) => {
    let sum = 0;
    for (const v of p.variations || []) {
      if (!v.enabled) continue;
      if (branch === "all") {
        sum += Object.values(v.stock).reduce((a, b) => a + b, 0);
      } else {
        sum += v.stock[branch] ?? 0;
      }
    }
    return sum;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      const total = totalOf(p);
      
      const hasBranch = branch === "all" || (p.variations || []).some(v => v.enabled && branch in v.stock);

      if (branch !== "all" && !hasBranch) return false;
      if (stockFilter === "in" && total <= 0) return false;
      if (stockFilter === "out" && total > 0) return false;
      return true;
    });
  }, [products, query, branch, stockFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 rounded-md bg-white/[0.02] animate-pulse" />
        <div className="flex gap-4">
          <div className="h-10 flex-1 rounded-md bg-white/[0.02] animate-pulse" />
          <div className="h-10 w-32 rounded-md bg-white/[0.02] animate-pulse" />
          <div className="h-10 w-32 rounded-md bg-white/[0.02] animate-pulse" />
        </div>
        {view === "grid" ? <GridSkeleton count={8} /> : <TableSkeleton rows={5} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold">All Rentals</h1>
        <p className="text-sm text-muted-foreground">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""} found
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-white/[0.02] p-3">
        <div className="w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            className={inputClass + " w-full"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className={inputClass + " w-36"} value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="all">All Branches</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className={inputClass + " w-40"} value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
            <option value="all">All Stock Status</option>
            <option value="in">In Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <div className="flex items-center rounded-md border border-border bg-white/[0.02] p-1 ml-auto sm:ml-0">
            <button
              onClick={() => setView("grid")}
              className={`rounded p-1.5 transition-colors ${view === "grid" ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded p-1.5 transition-colors ${view === "list" ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-border border-dashed">
          <p className="text-sm text-muted-foreground">No products match your filters.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const total = totalOf(p);
            const activeVariations = (p.variations || []).filter(v => v.enabled);
            return (
              <div
                key={p.id}
                onClick={() => onOpen?.(p)}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-white/[0.02] transition-all duration-300 hover:border-gold/30 hover:bg-white/[0.04] hover:shadow-glow-gold"
              >
                <div className="relative aspect-square overflow-hidden bg-black/20">
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute right-3 top-3">
                    <StatusBadge tone={total > 0 ? "emerald" : "rust"}>
                      {total > 0 ? "In Stock" : "Out"}
                    </StatusBadge>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-display text-lg font-semibold line-clamp-1">{p.name}</h3>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="font-mono text-xs text-muted-foreground">{p.sku || "—"}</p>
                    <span className="text-[10px] text-muted-foreground">{activeVariations.length} variants</span>
                  </div>
                  
                  <div className="mt-auto pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-mono text-sm text-gold">{inr(p.dailyRate)}/day</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {branch === "all" ? (
                        branches.map((b) => {
                          const bQty = activeVariations.reduce((sum, v) => sum + (v.stock[b] ?? 0), 0);
                          return <BranchPill key={b} branch={b} qty={bQty} />;
                        })
                      ) : (
                        <BranchPill branch={branch} qty={total} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-white/[0.02]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                <th className="w-16 px-4 py-3"></th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const total = totalOf(p);
                const activeVariations = (p.variations || []).filter(v => v.enabled);
                return (
                  <tr
                    key={p.id}
                    onClick={() => onOpen?.(p)}
                    className="group cursor-pointer transition-colors hover:bg-white/[0.04]"
                  >
                    <td className="px-4 py-3">
                      <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground group-hover:text-gold transition-colors">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                        <span className="text-[10px] text-muted-foreground">{activeVariations.length} variants</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <p className="font-mono text-sm text-gold">{inr(p.dailyRate)}/day</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {branch === "all" ? (
                          branches.map((b) => {
                            const bQty = activeVariations.reduce((sum, v) => sum + (v.stock[b] ?? 0), 0);
                            return <BranchPill key={b} branch={b} qty={bQty} />;
                          })
                        ) : (
                          <BranchPill branch={branch} qty={total} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
