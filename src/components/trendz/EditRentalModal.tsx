import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTrendz } from "@/lib/trendz/store";
import type { PaymentStatus, Rental } from "@/lib/trendz/types";
import { daysBetween, inr, todayISO } from "@/lib/trendz/utils";
import { Field, goldButtonClass, inputClass, monoInputClass } from "./primitives";
import { MessageCircle } from "lucide-react";

export function EditRentalModal({
  rental,
  onClose,
}: {
  rental: Rental | null;
  onClose: () => void;
}) {
  const { updateRental } = useTrendz();
  const [form, setForm] = useState<Rental | null>(rental);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    if (rental) {
      setForm(rental);
      const days = rental.rentDate && rental.dueDate && rental.dueDate > rental.rentDate ? daysBetween(rental.rentDate, rental.dueDate) : 1;
      const expectedTotal = days * rental.dailyRate * (rental.qty || 1);
      setDiscount(Math.max(0, expectedTotal - rental.total));
      setError("");
    }
  }, [rental]);

  if (!rental || !form) return null;

  const set = <K extends keyof Rental>(key: K, value: Rental[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const days = form.rentDate && form.dueDate && form.dueDate > form.rentDate ? daysBetween(form.rentDate, form.dueDate) : 1;
  const computedTotal = Math.max(0, days * form.dailyRate * (form.qty || 1) - discount);
  const balance = Math.max(0, computedTotal - form.advance);
  const dynamicPaymentStatus: PaymentStatus =
    form.advance >= computedTotal ? "paid" : form.advance > 0 ? "partial" : "unpaid";

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
      total: computedTotal,
      advance: form.advance,
      bufferDays: form.bufferDays || 0,
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
          {form.variationName ? (
            <Field label="Variation" className="sm:col-span-2">
              <input className={inputClass + " opacity-70 bg-white/[0.02]"} value={form.variationName} readOnly />
            </Field>
          ) : null}
          <Field label="Product">
            <input className={inputClass + " opacity-70 bg-white/[0.02]"} value={form.productName} readOnly />
          </Field>
          <Field label="SKU">
            <input className={monoInputClass + " opacity-70 bg-white/[0.02]"} value={form.sku} readOnly />
          </Field>
          <Field label="Branch">
            <input className={inputClass + " opacity-70 bg-white/[0.02]"} value={form.branch} readOnly />
          </Field>
          <Field label="Quantity">
            <input className={monoInputClass + " opacity-70 bg-white/[0.02]"} value={form.qty} readOnly />
          </Field>

          <Field label="Customer Name">
            <input
              className={inputClass}
              value={form.customerName}
              onChange={(e) => set("customerName", e.target.value)}
            />
          </Field>
          <Field label="Customer Phone" hint="Required · +91 or 10 digits">
            <div className="relative">
              <input
                className={monoInputClass + " pr-9"}
                value={form.customerPhone}
                onChange={(e) => set("customerPhone", e.target.value)}
              />
              <MessageCircle className="pointer-events-none absolute top-2.5 right-3 h-4 w-4 text-emerald" />
            </div>
          </Field>
          <Field label="Rent Date">
            <input
              type="date"
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
          <Field label="Maintenance Buffer (Days)" hint="Days at dry cleaner post-return">
            <input
              type="number"
              min={0}
              className={monoInputClass}
              value={form.bufferDays === 0 ? "" : form.bufferDays}
              onChange={(e) => set("bufferDays", Number(e.target.value))}
            />
          </Field>
          <Field label="Daily Rate (₹)">
            <input
              type="number"
              className={monoInputClass + " opacity-70 bg-white/[0.02] cursor-not-allowed"}
              value={form.dailyRate === 0 ? "" : form.dailyRate}
              readOnly
              tabIndex={-1}
            />
          </Field>
          <Field label="Discount (₹)">
            <input
              type="number"
              min={0}
              className={monoInputClass}
              value={discount === 0 ? "" : discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </Field>
          <Field label="Total Amount (₹)">
            <input
              type="number"
              className={monoInputClass + " opacity-70 bg-white/[0.02] cursor-not-allowed"}
              value={computedTotal === 0 ? "" : computedTotal}
              readOnly
              tabIndex={-1}
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
