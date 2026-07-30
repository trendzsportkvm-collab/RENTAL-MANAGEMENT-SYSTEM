import { useMemo, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { useTrendz } from "@/lib/trendz/store";
import type { Product } from "@/lib/trendz/types";
import { inr } from "@/lib/trendz/utils";
import { BranchPill, StatusBadge, inputClass } from "../primitives";

export function AllProducts({ onOpen }: { onOpen: (p: Product) => void }) {
  const { products, branches } = useTrendz();
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      const total =
        branch === "all"
          ? Object.values(p.stock).reduce((a, b) => a + b, 0)
          : (p.stock[branch] ?? 0);
      if (branch !== "all" && !(branch in p.stock)) return false;
      if (stockFilter === "in" && total <= 0) return false;
      if (stockFilter === "out" && total > 0) return false;
      return true;
    });
  }, [products, query, branch, stockFilter]);

  const totalOf = (p: Product) =>
    branch === "all" ? Object.values(p.stock).reduce((a, b) => a + b, 0) : (p.stock[branch] ?? 0);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">All Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} item{filtered.length === 1 ? "" : "s"} in the catalog
          </p>
        </div>
      </header>

      <div className="glass mt-6 flex flex-wrap items-center gap-3 p-3">
        <input
          className={inputClass + " max-w-64 flex-1"}
          placeholder="Search name or SKU…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={inputClass + " w-40"} value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option value="all">All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          className={inputClass + " w-40"}
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
        >
          <option value="all">All stock</option>
          <option value="in">In stock</option>
          <option value="out">Out of stock</option>
        </select>
        <div className="ml-auto flex gap-1 rounded-md border border-border p-1">
          {(["grid", "list"] as const).map((v) => {
            const Icon = v === "grid" ? LayoutGrid : List;
            return (
              <button
                key={v}
                aria-label={`${v} view`}
                onClick={() => setView(v)}
                className={
                  "rounded-sm p-1.5 transition-colors duration-200 " +
                  (view === v ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-foreground")
                }
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>

      {view === "grid" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => onOpen(p)}
              className="glass group overflow-hidden p-0 text-left transition-all duration-300 hover:border-gold/30 hover:shadow-glow-soft"
            >
              <img
                src={p.image}
                alt={p.name}
                width={1024}
                height={768}
                loading="lazy"
                className="aspect-4/3 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg leading-tight font-medium">{p.name}</h3>
                  <StatusBadge tone={totalOf(p) > 0 ? "emerald" : "rust"}>
                    {totalOf(p) > 0 ? "In Stock" : "Out of Stock"}
                  </StatusBadge>
                </div>
                <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                <p className="font-mono text-sm text-gold">{inr(p.dailyRate)}/day</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(p.stock).map(([b, q]) => (
                    <BranchPill key={b} branch={b} qty={q} />
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="glass mt-6 divide-y divide-border overflow-hidden">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => onOpen(p)}
              className="flex w-full flex-wrap items-center gap-4 px-4 py-3 text-left transition-colors duration-200 hover:bg-white/[0.05]"
            >
              <img
                src={p.image}
                alt={p.name}
                width={64}
                height={48}
                loading="lazy"
                className="h-12 w-16 rounded-md border border-border object-cover"
              />
              <div className="min-w-40 flex-1">
                <h3 className="font-display text-base font-medium">{p.name}</h3>
                <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
              </div>
              <p className="font-mono text-sm text-gold">{inr(p.dailyRate)}/day</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(p.stock).map(([b, q]) => (
                  <BranchPill key={b} branch={b} qty={q} />
                ))}
              </div>
              <StatusBadge tone={totalOf(p) > 0 ? "emerald" : "rust"}>
                {totalOf(p) > 0 ? "In Stock" : "Out of Stock"}
              </StatusBadge>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          No products match these filters.
        </p>
      ) : null}
    </div>
  );
}
