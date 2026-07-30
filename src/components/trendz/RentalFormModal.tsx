import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTrendz } from "@/lib/trendz/store";
import type { Product, Rental } from "@/lib/trendz/types";
import { daysBetween, inr, todayISO } from "@/lib/trendz/utils";
import { Field, goldButtonClass, inputClass, monoInputClass } from "./primitives";

export function RentalFormModal({
  open,
  product,
  defaultBranch,
  onClose,
  onCreated,
}: {
  open: boolean;
  product: Product | null;
  defaultBranch?: string;
  onClose: () => void;
  onCreated: (rental: Rental) => void;
}) {
  const { createRental } = useTrendz();
  const stocked = useMemo(
    () =>
      product
        ? Object.entries(product.stock)
            .filter(([, q]) => q > 0)
            .map(([b]) => b)
        : [],
    [product],
  );

  const [branch, setBranch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [qty, setQty] = useState(1);
  const [rentDate, setRentDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [dailyRate, setDailyRate] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalTouched, setTotalTouched] = useState(false);
  const [advance, setAdvance] = useState(0);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !product) return;
    const initialBranch = defaultBranch && product.stock[defaultBranch] ? defaultBranch : stocked[0] ?? "";
    setBranch(initialBranch);
    setCustomerName("");
    setCustomerPhone("");
    setQty(1);
    setRentDate(todayISO());
    setDueDate("");
    setDailyRate(product.dailyRate);
    setTotal(product.dailyRate);
    setTotalTouched(false);
    setAdvance(0);
    setNotes("");
    setErrors({});
  }, [open, product, defaultBranch, stocked]);

  const available = product && branch ? (product.stock[branch] ?? 0) : 0;
  const days = rentDate && dueDate && dueDate > rentDate ? daysBetween(rentDate, dueDate) : 1;
  const computed = days * dailyRate * (qty || 1);

  useEffect(() => {
    if (!totalTouched) setTotal(computed);
  }, [computed, totalTouched]);

  const balance = Math.max(0, total - advance);

  if (!product) return null;

  const submit = () => {
    const next: Record<string, string> = {};
    if (!branch) next.branch = "Select a branch with stock";
    if (!customerName.trim()) next.customerName = "Customer name is required";
    if (customerPhone && !/^(\+91)?\d{10}$/.test(customerPhone.replace(/[\s-]/g, "")))
      next.customerPhone = "Use a 10-digit Indian number";
    if (!qty || qty < 1) next.qty = "Minimum quantity is 1";
    if (qty > available) next.qty = `Only ${available} available at ${branch}`;
    if (!rentDate) next.rentDate = "Rent date is required";
    if (!dueDate) next.dueDate = "Due date is required";
    else if (dueDate <= rentDate) next.dueDate = "Due date must be after the rent date";
    if (advance > total) next.advance = "Advance cannot exceed the total";
    setErrors(next);
    if (Object.keys(next).length) return;

    const rental = createRental({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      image: product.image,
      branch,
      customerName: customerName.trim(),
      customerPhone: customerPhone.replace(/[\s-]/g, ""),
      qty,
      rentDate,
      dueDate,
      dailyRate,
      total,
      advance,
      paymentStatus: advance <= 0 ? "unpaid" : advance >= total ? "paid" : "partial",
      notes: notes.trim(),
    });
    onCreated(rental);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold">
            Put Out Rental
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product">
            <input className={inputClass} value={product.name} readOnly />
          </Field>
          <Field label="SKU">
            <input className={monoInputClass} value={product.sku} readOnly />
          </Field>

          <Field label="Branch" error={errors.branch}>
            <select className={inputClass} value={branch} onChange={(e) => setBranch(e.target.value)}>
              {stocked.length === 0 ? <option value="">No stock available</option> : null}
              {stocked.map((b) => (
                <option key={b} value={b}>
                  {b} · {product.stock[b]} in stock
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity" hint={`${available} available`} error={errors.qty}>
            <input
              type="number"
              min={1}
              max={available}
              className={monoInputClass}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </Field>

          <Field label="Customer Name" error={errors.customerName}>
            <input
              className={inputClass}
              placeholder="e.g. Arjun Kumar"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </Field>
          <Field label="Customer Phone" error={errors.customerPhone} hint="Optional · +91 or 10 digits">
            <div className="relative">
              <input
                className={monoInputClass + " pr-9"}
                placeholder="9847012345"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
              <MessageCircle className="pointer-events-none absolute top-2.5 right-3 h-4 w-4 text-emerald" />
            </div>
          </Field>

          <Field label="Rent Date" error={errors.rentDate}>
            <input
              type="date"
              className={monoInputClass}
              value={rentDate}
              onChange={(e) => setRentDate(e.target.value)}
            />
          </Field>
          <Field label="Due Date" error={errors.dueDate}>
            <input
              type="date"
              min={rentDate}
              className={monoInputClass}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>

          <Field label="Daily Rate (₹)">
            <input
              type="number"
              min={0}
              className={monoInputClass}
              value={dailyRate}
              onChange={(e) => setDailyRate(Number(e.target.value))}
            />
          </Field>
          <Field
            label="Total Amount (₹)"
            hint={`${days} day${days > 1 ? "s" : ""} × ${inr(dailyRate)} × ${qty || 1}`}
          >
            <input
              type="number"
              min={0}
              className={monoInputClass}
              value={total}
              onChange={(e) => {
                setTotalTouched(true);
                setTotal(Number(e.target.value));
              }}
            />
          </Field>

          <Field label="Advance Paid (₹)" error={errors.advance}>
            <input
              type="number"
              min={0}
              className={monoInputClass}
              value={advance}
              onChange={(e) => setAdvance(Number(e.target.value))}
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea
              rows={2}
              className={inputClass}
              placeholder="Anything staff should remember…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-white/[0.03] px-4 py-3">
          <span className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Balance Due
          </span>
          <span className="font-mono text-xl font-semibold text-gold">{inr(balance)}</span>
        </div>

        <button className={goldButtonClass + " mt-2 w-full"} onClick={submit}>
          Confirm Rental
        </button>
      </DialogContent>
    </Dialog>
  );
}
