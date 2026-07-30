import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTrendz } from "@/lib/trendz/store";
import type { Product, Rental } from "@/lib/trendz/types";
import { balanceOf, fmtDate, inr, isOverdue } from "@/lib/trendz/utils";
import {
  PaymentBadge,
  StatusBadge,
  TokenBadge,
  ghostButtonClass,
  goldButtonClass,
} from "./primitives";
import { ReturnConfirm } from "./ReturnConfirm";

export function RentalStatusModal({
  product,
  onClose,
  onPutOut,
  onEdit,
}: {
  product: Product | null;
  onClose: () => void;
  onPutOut: (product: Product) => void;
  onEdit: (rental: Rental) => void;
}) {
  const { rentals, markReturned } = useTrendz();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (!product) return null;
  const active = rentals.filter((r) => r.productId === product.id && r.status === "out");

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold">
            {product.name}
          </DialogTitle>
          <p className="font-mono text-xs text-muted-foreground">
            {product.sku} · {inr(product.dailyRate)}/day
          </p>
        </DialogHeader>

        <div className="flex justify-end">
          <button
            className={goldButtonClass}
            onClick={() => {
              onClose();
              onPutOut(product);
            }}
          >
            Put Out Rental
          </button>
        </div>

        <div className="mt-2 space-y-2">
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            Active rentals ({active.length})
          </p>
          {active.length === 0 ? (
            <p className="rounded-lg border border-border bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
              Nothing is out on rental for this item right now.
            </p>
          ) : (
            active.map((r) => (
              <div
                key={r.id}
                className="relative flex flex-wrap items-center gap-3 rounded-lg border border-border bg-white/[0.03] px-3 py-3 transition-colors duration-200 hover:bg-white/[0.06]"
              >
                <TokenBadge token={r.token} />
                <div className="min-w-32">
                  <p className="text-sm font-medium">{r.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.branch} · Qty {r.qty}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Due <span className="font-mono text-foreground">{fmtDate(r.dueDate)}</span>
                </div>
                {isOverdue(r) ? <StatusBadge tone="rust">OVERDUE</StatusBadge> : null}
                <PaymentBadge status={r.paymentStatus} />
                <span className="font-mono text-xs text-muted-foreground">
                  bal {inr(balanceOf(r))}
                </span>
                <div className="relative ml-auto flex gap-2">
                  <button
                    className={ghostButtonClass + " border-indigo/40 text-indigo"}
                    onClick={() => {
                      onClose();
                      onEdit(r);
                    }}
                  >
                    Edit
                  </button>
                  <button className={ghostButtonClass} onClick={() => setConfirmId(r.id)}>
                    Mark Returned
                  </button>
                  {confirmId === r.id ? (
                    <ReturnConfirm
                      onCancel={() => setConfirmId(null)}
                      onConfirm={(condition) => {
                        markReturned(r.id, condition);
                        setConfirmId(null);
                        toast.success(`${r.token} returned`, { description: `Condition: ${condition}` });
                      }}
                    />
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
