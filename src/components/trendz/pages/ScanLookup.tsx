import { useState } from "react";
import { Barcode, Search } from "lucide-react";
import { toast } from "sonner";
import { useTrendz } from "@/lib/trendz/store";
import { useAuth } from "@/lib/trendz/AuthContext";
import { ReturnRentalModal } from "../ReturnRentalModal";
import type { Product } from "@/lib/trendz/types";
import { inr, fmtDate } from "@/lib/trendz/utils";
import { StockBadge, goldButtonClass } from "../primitives";
import { Skeleton, TableSkeleton } from "../Skeleton";
import dynamic from "next/dynamic";

const CameraScanner = dynamic(
  () => import("../CameraScanner").then((mod) => mod.CameraScanner),
  { ssr: false }
);

export function ScanLookup({ onPutOut }: { onPutOut: (p: Product, branch?: string, variationId?: string) => void }) {
  const { products, rentals, markReturned, isLoading } = useTrendz();
  const { profile } = useAuth();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Product | null>(null);
  const [searched, setSearched] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [returnRentalId, setReturnRentalId] = useState<string | null>(null);

  const exactSearchQ = query.trim().toLowerCase();
  const matchedVariationIds = result?.type === "variable" && result.variations?.some(v => v.sku.toLowerCase() === exactSearchQ)
    ? result.variations.filter(v => v.sku.toLowerCase() === exactSearchQ).map(v => v.id)
    : null;

  const activeRentals = result 
    ? rentals.filter((r) => {
        if (r.status !== "out") return false;
        if (matchedVariationIds && r.variationId) {
          return matchedVariationIds.includes(r.variationId);
        }
        if (r.productId === result.id) return true;
        if (result.type === "variable" && result.variations && r.variationId) {
          return result.variations.some(v => v.id === r.variationId);
        }
        return false;
      })
    : [];

  const searchProduct = (q: string) => {
    q = q.trim().toLowerCase();
    return products.find((p) => p.sku.toLowerCase() === q || (p.variations && p.variations.some(v => v.sku.toLowerCase() === q))) ??
      products.find((p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || (p.variations && p.variations.some(v => v.sku.toLowerCase().includes(q)))) ??
      null;
  };

  const search = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const found = searchProduct(q);
    setResult(found);
    setSearched(true);
    if (!found) toast.error("No product found", { description: `Nothing matches “${q}”` });
  };

  const handleScan = (decodedText: string) => {
    setQuery(decodedText);
    setShowScanner(false);
    toast.success("Scanned successfully", { description: decodedText });
    const found = searchProduct(decodedText);
    setResult(found);
    setSearched(true);
    if (!found) toast.error("No product found", { description: `Nothing matches “${decodedText}”` });
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
              onClick={() => setShowScanner(true)}
              aria-label="Scan barcode with camera"
              className="rounded-md border border-gold/35 bg-gold/10 p-2.5 text-gold transition-all duration-200 hover:bg-gold/20 hover:shadow-glow-gold"
            >
              <Barcode className="h-4 w-4" />
            </button>
          </div>

          {showScanner && (
            <CameraScanner
              onScan={handleScan}
              onClose={() => setShowScanner(false)}
              onError={(err) => {
                console.error(err);
                // toast.error("Camera error", { description: "Could not start camera." });
              }}
            />
          )}

          {result ? (() => {
            const isVariable = result.type === "variable";
            const totalStock = isVariable
              ? (result.variations || []).reduce((sum, v) => {
                  if (!v.enabled) return sum;
                  return sum + Object.values(v.stock).reduce((a, b) => a + b, 0);
                }, 0)
              : Object.values(result.stock).reduce((a, b) => a + b, 0);
            const hasStock = totalStock > 0;

            return (
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
                <div className="min-w-[14rem] flex-1">
                  <h2 className="font-display text-3xl font-semibold">{result.name}</h2>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{result.sku}</p>
                  <p className="mt-3 font-mono text-lg text-gold">{inr(result.dailyRate)}/day</p>
                  {isVariable && (
                    <span className="mt-2 inline-block rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold">
                      Variable · {(result.variations || []).filter(v => v.enabled).length} variants
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-lg border border-border">
                {isVariable ? (() => {
                  let displayVariations = (result.variations || []).filter(v => v.enabled);
                  const exactQ = query.trim().toLowerCase();
                  if (displayVariations.some(v => v.sku.toLowerCase() === exactQ)) {
                    displayVariations = displayVariations.filter(v => v.sku.toLowerCase() === exactQ);
                  }
                  
                  return (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/[0.04] text-left text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                        <th className="px-4 py-2.5 font-medium">Variation</th>
                        <th className="px-4 py-2.5 font-medium">{profile?.role === "super_admin" ? "Stock by Branch" : "Available Stock"}</th>
                        <th className="px-4 py-2.5 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayVariations.map((v) => {
                        const totalQty = Object.values(v.stock).reduce((sum, q) => sum + q, 0);
                        return (
                          <tr key={v.id} className="row-zebra transition-colors duration-200">
                            <td className="px-4 py-3 font-medium">{v.name}</td>
                            <td className="px-4 py-3">
                              {profile?.role === "super_admin" ? (
                                <div className="flex flex-wrap gap-x-5 gap-y-2">
                                  {Object.entries(v.stock).map(([b, q]) => (
                                    <div key={b} className="flex flex-col">
                                      <span className="text-[10px] text-muted-foreground uppercase mb-0.5">{b}</span>
                                      <StockBadge qty={q} />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <StockBadge qty={totalQty} />
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right align-middle">
                              <button
                                onClick={() => onPutOut(result, undefined, v.id)}
                                disabled={totalQty <= 0}
                                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                                  totalQty > 0 
                                    ? "bg-gold text-white hover:bg-gold/90 shadow-sm" 
                                    : "bg-white/[0.05] text-muted-foreground cursor-not-allowed"
                                }`}
                              >
                                {totalQty > 0 ? "Rent" : "Out"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {displayVariations.length === 0 && (
                        <tr><td colSpan={3} className="px-4 py-4 text-center text-sm text-muted-foreground">No matching variations</td></tr>
                      )}
                    </tbody>
                  </table>
                  );
                })() : (
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white/[0.01]">
                    <div>
                      <h3 className="text-[10px] font-medium tracking-[0.15em] text-muted-foreground uppercase mb-3">
                        {profile?.role === "super_admin" ? "Stock by Branch" : "Available Stock"}
                      </h3>
                      {profile?.role === "super_admin" ? (
                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                          {Object.entries(result.stock).map(([b, q]) => (
                            <div key={b} className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase mb-1">{b}</span>
                              <StockBadge qty={q} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <StockBadge qty={totalStock} />
                      )}
                    </div>
                    <button
                      onClick={() => onPutOut(result)}
                      disabled={!hasStock}
                      className={`rounded px-5 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                        hasStock
                          ? "bg-gold text-white hover:bg-gold/90 shadow-sm" 
                          : "bg-white/[0.05] text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {hasStock ? "Rent Item" : "Out of Stock"}
                    </button>
                  </div>
                )}
              </div>

              {activeRentals.length > 0 && (
                <div className="mt-6 border-t border-border pt-4">
                  <h3 className="mb-3 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Active Rentals</h3>
                  <div className="space-y-2">
                    {activeRentals.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-md border border-border bg-white/[0.02] p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{r.customerName} <span className="font-normal text-[11px] text-muted-foreground ml-1">({r.branch})</span></p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {r.variationName && <span className="text-foreground mr-1.5">{r.variationName}</span>}
                            Due {fmtDate(r.dueDate)}
                          </p>
                        </div>
                        <button
                          className="rounded bg-emerald/10 border border-emerald/30 px-3 py-1.5 text-xs font-medium text-emerald transition-colors hover:bg-emerald/20"
                          onClick={() => setReturnRentalId(r.id)}
                        >
                          Return
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
            );
          })() : searched ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No product matched that search.
        </p>
          ) : null}
        </>
      )}

      <ReturnRentalModal
        open={!!returnRentalId}
        rental={rentals.find((r) => r.id === returnRentalId) || null}
        onClose={() => setReturnRentalId(null)}
      />
    </div>
  );
}
