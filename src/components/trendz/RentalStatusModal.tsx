import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTrendz } from "@/lib/trendz/store";
import { useAuth } from "@/lib/trendz/AuthContext";
import type { Product, Rental } from "@/lib/trendz/types";
import { fmtDate, inr } from "@/lib/trendz/utils";
import { StockBadge } from "./primitives";

export function RentalStatusModal({
  product,
  onClose,
  onPutOut,
  onEdit,
}: {
  product: Product | null;
  onClose: () => void;
  onPutOut: (product: Product, branch?: string, variationId?: string) => void;
  onEdit: (rental: Rental) => void;
}) {
  const { rentals, branches } = useTrendz();
  const { profile } = useAuth();

  if (!product) return null;

  const displayVariations = (product.variations || []).filter(v => v.enabled);
  const activeRentals = rentals.filter((r) => r.status === "out" && r.productId === product.id);

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name} Status</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-5 mt-2">
          <img
            src={product.image || undefined}
            alt={product.name}
            width={120}
            height={120}
            loading="lazy"
            className="h-30 w-30 shrink-0 rounded-lg border border-border object-cover"
          />
          <div className="min-w-[14rem] flex-1">
            <h2 className="font-display text-3xl font-semibold">{product.name}</h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{product.sku}</p>
            <p className="mt-3 font-mono text-lg text-gold">{inr(product.dailyRate || 0)}/day</p>
            <span className="mt-2 inline-block rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold">
              Variable · {displayVariations.length} variants
            </span>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
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
                          {branches.map((b) => (
                            <div key={b} className="flex flex-col">
                              <span className="text-[10px] text-muted-foreground uppercase mb-0.5">{b}</span>
                              <StockBadge qty={v.stock[b] || 0} />
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
                        onClick={() => {
                          onClose();
                          onPutOut(product, undefined, v.id);
                        }}
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
                </div>
              ))}
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}