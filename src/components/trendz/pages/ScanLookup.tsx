import { useState } from "react";
import { Barcode, Search } from "lucide-react";
import { toast } from "sonner";
import { useTrendz } from "@/lib/trendz/store";
import type { Product } from "@/lib/trendz/types";
import { inr } from "@/lib/trendz/utils";
import { StockBadge, goldButtonClass } from "../primitives";
import { Skeleton, TableSkeleton } from "../Skeleton";

export function ScanLookup({ onPutOut }: { onPutOut: (p: Product, branch?: string) => void }) {
  const { products, rentals, markReturned, isLoading } = useTrendz();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Product | null>(null);
  const [searched, setSearched] = useState(false);

  const activeRentals = result ? rentals.filter((r) => r.productId === result.id && r.status === "out") : [];

  const search = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const found =
      products.find((p) => p.sku.toLowerCase() === q) ??
      products.find((p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) ??
      null;
    setResult(found);
    setSearched(true);
    if (!found) toast.error("No product found", { description: `Nothing matches “${query}”` });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="text-center">
        <h1 className="font-display text-4xl font-semibold">Inventory Search</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Scan a barcode or type a SKU to check live stock across every branch.
        </p>
      </header>

      {isLoading ? (
        <>
          <div className="glass mt-8 p-3 shadow-glow-soft">
            <Skeleton className="h-10 w-full rounded" />
          </div>
          <div className="glass mt-6 p-5">
            <div className="flex gap-5">
              <Skeleton className="h-30 w-30 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-1/4" />
              </div>
            </div>
            <div className="mt-8">
              <TableSkeleton rows={2} columns={2} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="glass mt-8 flex items-center gap-2 p-2 shadow-glow-soft">
            <Search className="ml-2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              className="flex-1 bg-transparent px-1 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground/60"
              placeholder="SU-001"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <button
              onClick={search}
              aria-label="Scan barcode"
              className="rounded-md border border-gold/35 bg-gold/10 p-2.5 text-gold transition-all duration-200 hover:bg-gold/20 hover:shadow-glow-gold"
            >
              <Barcode className="h-4 w-4" />
            </button>
          </div>

          {result ? (
            <article className="glass mt-6 p-5">
          <div className="flex flex-wrap gap-5">
            <img
              src={result.image}
              alt={result.name}
              width={120}
              height={120}
              loading="lazy"
              className="h-30 w-30 shrink-0 rounded-lg border border-border object-cover"
            />
            <div className="min-w-56 flex-1">
              <h2 className="font-display text-3xl font-semibold">{result.name}</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{result.sku}</p>
              <p className="mt-3 font-mono text-lg text-gold">{inr(result.dailyRate)}/day</p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.04] text-left text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium">Branch</th>
                  <th className="px-4 py-2.5 text-right font-medium">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.stock).map(([branch, qty]) => (
                  <tr key={branch} className="row-zebra transition-colors duration-200">
                    <td className="px-4 py-2.5">{branch}</td>
                    <td className="px-4 py-2.5 text-right">
                      <StockBadge qty={qty} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Active Rentals for Return */}
          {activeRentals.length > 0 && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="mb-3 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Active Rentals
              </h3>
              <div className="space-y-2">
                {activeRentals.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-md border border-border bg-white/[0.02] p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.customerName}</p>
                      <p className="text-xs text-muted-foreground">Due: {r.dueDate}</p>
                    </div>
                    <button
                      className="rounded bg-emerald/10 border border-emerald/30 px-3 py-1.5 text-xs font-medium text-emerald transition-colors hover:bg-emerald/20"
                      onClick={() => {
                        markReturned(r.id, "good");
                        toast.success("Marked as returned");
                      }}
                    >
                      Mark as Returned
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            className={goldButtonClass + " mt-5 w-full"}
            onClick={() => onPutOut(result)}
            disabled={!Object.values(result.stock).some((q) => q > 0)}
          >
            Put Out Rental
          </button>
        </article>
      ) : searched ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No product matched that search.
        </p>
          ) : null}
        </>
      )}
    </div>
  );
}
