import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTrendz } from "@/lib/trendz/store";
import type { Product, Rental } from "@/lib/trendz/types";
import { balanceOf, fmtDate, inr, isOverdue } from "@/lib/trendz/utils";
import { ghostButtonClass, goldButtonClass } from "./primitives";

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

  if (!product) return null;

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

      </DialogContent>
    </Dialog>
  );
}
