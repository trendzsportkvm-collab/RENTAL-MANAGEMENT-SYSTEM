import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTrendz } from "@/lib/trendz/store";
import type { Rental, ReturnCondition } from "@/lib/trendz/types";
import { daysBetween, inr, todayISO } from "@/lib/trendz/utils";
import { Field, goldButtonClass, ghostButtonClass, inputClass, monoInputClass } from "./primitives";
import { toast } from "sonner";

export function ReturnRentalModal({
  open,
  rental,
  onClose,
}: {
  open: boolean;
  rental: Rental | null;
  onClose: () => void;
}) {
  const { markReturned } = useTrendz();

  const [returnDate, setReturnDate] = useState(todayISO());
  const [condition, setCondition] = useState<ReturnCondition>("good");
  const [extraFees, setExtraFees] = useState(0);
  const [amountCollected, setAmountCollected] = useState(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !rental) return;
    setReturnDate(todayISO());
    setCondition("good");
    setExtraFees(0);
    setAmountCollected(0);
    setNotes("");
  }, [open, rental]);

  const lateDays = rental && returnDate && returnDate > rental.dueDate ? daysBetween(rental.dueDate, returnDate) : 0;
  const finalTotal = (rental?.total || 0) + extraFees;
  const balanceDueBeforeCollection = finalTotal - (rental?.advance || 0);

  const newAdvance = (rental?.advance || 0) + amountCollected;
  const finalBalance = finalTotal - newAdvance;

  if (!rental) return null;

  const submit = async () => {
    if (finalBalance > 0) {
      toast.error(`Please collect the pending balance of ${inr(finalBalance)} to settle this rental.`);
      return;
    }
    setIsSubmitting(true);
    try {
      let finalNotes = rental.notes || "";
      if (notes.trim()) {
        finalNotes = finalNotes ? `${finalNotes}\nReturn Note: ${notes.trim()}` : `Return Note: ${notes.trim()}`;
      }

      markReturned(rental.id, {
        condition,
        returned_on: returnDate,
        total: rental.total || 0, // Keep original total
        advance: newAdvance,
        payment_status: finalBalance <= 0 ? "paid" : newAdvance > 0 ? "partial" : "unpaid",
        notes: finalNotes,
        extra_fees: extraFees,
        extra_fees_reason: extraFees > 0 ? "Damage/Late fees assessed on return" : undefined,
      });
      
      toast.success("Rental successfully returned & ledger updated!");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Failed to mark as returned");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold">
            Return & Settle Rental
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="col-span-2 rounded-md bg-white/[0.03] p-3 border border-border">
            <p className="text-sm font-medium text-foreground">{rental.productName}</p>
            <p className="text-xs text-muted-foreground mt-1">Customer: {rental.customerName} ({rental.customerPhone})</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Original Due Date:</span>
              <span className="font-mono text-emerald">{rental.dueDate}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Base Total:</span>
              <span className="font-mono">{inr(rental.total)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Advance Already Paid:</span>
              <span className="font-mono">{inr(rental.advance)}</span>
            </div>
          </div>

          <Field label="Return Date">
            <input
              type="date"
              min={todayISO()}
              className={monoInputClass}
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
            {lateDays > 0 && (
              <p className="mt-1 text-xs text-red-400">⚠️ {lateDays} days late!</p>
            )}
          </Field>

          <Field label="Condition">
            <select
              className={inputClass}
              value={condition}
              onChange={(e) => setCondition(e.target.value as ReturnCondition)}
            >
              <option value="good">Good</option>
              <option value="damaged">Damaged</option>
              <option value="missing">Missing</option>
            </select>
          </Field>

          <Field 
            label="Extra Fees (₹)" 
            hint={lateDays > 0 ? `Suggested late fee: ${inr(lateDays * rental.dailyRate)}` : "Damages, Late fines, etc."}
          >
            <input
              type="number"
              min={0}
              className={monoInputClass}
              value={extraFees === 0 ? "" : extraFees}
              onChange={(e) => setExtraFees(Number(e.target.value))}
            />
          </Field>

          <Field 
            label="Amount Collected Now (₹)" 
            hint={`Total pending before this: ${inr(balanceDueBeforeCollection)}`}
          >
            <input
              type="number"
              min={0}
              className={monoInputClass + (amountCollected > 0 ? " text-gold" : "")}
              value={amountCollected === 0 ? "" : amountCollected}
              onChange={(e) => setAmountCollected(Number(e.target.value))}
            />
          </Field>

          <Field label="Return Notes" className="sm:col-span-2">
            <textarea
              rows={2}
              className={inputClass}
              placeholder="Record any damage details or reasons for extra fees..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-white/[0.03] px-4 py-3">
          <span className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Final Ledger Balance
          </span>
          <span className={`font-mono text-xl font-semibold ${finalBalance === 0 ? "text-emerald" : finalBalance > 0 ? "text-rust" : "text-foreground"}`}>
            {finalBalance === 0 ? "SETTLED" : `${inr(finalBalance)} DUE`}
          </span>
        </div>
        {finalBalance > 0 && (
          <div className="mt-2 text-xs text-rust font-medium">
            Full balance must be collected before confirming return. Please collect {inr(finalBalance)}.
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button
            className={goldButtonClass + " flex-1 disabled:opacity-50"}
            onClick={submit}
            disabled={isSubmitting || finalBalance > 0}
          >
            {isSubmitting ? "Saving..." : "Confirm Return & Settle"}
          </button>
          <button
            className={ghostButtonClass + " flex-1"}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
