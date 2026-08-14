import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTrendz } from "@/lib/trendz/store";
import type { PaymentStatus, Rental } from "@/lib/trendz/types";
import { inr, todayISO } from "@/lib/trendz/utils";
import { Field, goldButtonClass, inputClass, monoInputClass } from "./primitives";

export function EditRentalModal({
  rental,
  onClose,
}: {
  rental: Rental | null;
  onClose: () => void;
}) {
  const { updateRental } = useTrendz();
  const [form, setForm] = useState<Rental | null>(rental);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(rental);
    setError("");
  }, [rental]);

  if (!rental || !form) return null;

  const set = <K extends keyof Rental>(key: K, value: Rental[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const balance = Math.max(0, form.total - form.advance);
  const dynamicPaymentStatus: PaymentStatus =
    form.advance >= form.total ? "paid" : form.advance > 0 ? "partial" : "unpaid";

  const save = () => {
    if (!form.customerName.trim()) return setError("Customer name is required");
    if (form.dueDate <= form.rentDate) return setError("Due date must be after the rent date");
    if (form.advance > form.total) return setError("Advance cannot exceed the total");
    updateRental(rental.id, {
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.replace(/[\s-]/g, ""),
      rentDate: form.rentDate,
      dueDate: form.dueDate,
      dailyRate: form.dailyRate,
      total: form.total,
      advance: form.advance,
      paymentStatus: dynamicPaymentStatus,
      notes: form.notes,
    });
    onClose();
  };

  return (
    <Dialog open={!!rental} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold">
            Edit Rental{" "}
            <span className="font-mono text-base font-medium text-gold">{rental.token}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer Name">
            <input
              className={inputClass}
              value={form.customerName}
              onChange={(e) => set("customerName", e.target.value)}
            />
          </Field>
          <Field label="Customer Phone">
            <input
              className={monoInputClass}
              value={form.customerPhone}
              onChange={(e) => set("customerPhone", e.target.value)}
            />
          </Field>
          <Field label="Rent Date">
            <input
              type="date"
              min={todayISO()}
              className={monoInputClass}
              value={form.rentDate}
              onChange={(e) => set("rentDate", e.target.value)}
            />
          </Field>
          <Field label="Due Date">
            <input
              type="date"
              min={form.rentDate}
              className={monoInputClass}
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
            />
          </Field>
          <Field label="Daily Rate (₹)">
            <input
              type="number"
              className={monoInputClass}
              value={form.dailyRate === 0 ? "" : form.dailyRate}
              onChange={(e) => set("dailyRate", Number(e.target.value))}
            />
          </Field>
          <Field label="Total Amount (₹)">
            <input
              type="number"
              className={monoInputClass}
              value={form.total === 0 ? "" : form.total}
              onChange={(e) => set("total", Number(e.target.value))}
            />
          </Field>
          <Field label="Advance Paid (₹)">
            <input
              type="number"
              className={monoInputClass}
              value={form.advance === 0 ? "" : form.advance}
              onChange={(e) => set("advance", Number(e.target.value))}
            />
          </Field>
          <Field label="Payment Status">
            <select
              className={inputClass}
              value={dynamicPaymentStatus}
              disabled
            >
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea
              rows={2}
              className={inputClass}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-white/[0.03] px-4 py-3">
          <span className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Balance Due
          </span>
          <span className="font-mono text-xl font-semibold text-gold">{inr(balance)}</span>
        </div>

        {error ? <p className="text-xs text-rust">{error}</p> : null}

        <button className={goldButtonClass + " mt-2 w-full"} onClick={save}>
          Update Rental
        </button>
      </DialogContent>
    </Dialog>
  );
}
