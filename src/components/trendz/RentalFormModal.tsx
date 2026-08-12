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
  initialVariationId,
  onClose,
  onCreated,
}: {
  open: boolean;
  product: Product | null;
  defaultBranch?: string;
  initialVariationId?: string;
  onClose: () => void;
  onCreated: (rental: Rental) => void;
}) {
  const { createRental } = useTrendz();
  const [variationId, setVariationId] = useState("");

  const selectedVariation = useMemo(
    () => product?.variations?.find((v) => v.id === variationId),
    [product, variationId]
  );

  const stocked = useMemo(() => {
    if (!product || !selectedVariation) return [];
    return Object.entries(selectedVariation.stock)
      .filter(([, q]) => q > 0)
      .map(([b]) => b);
  }, [product, selectedVariation]);

  const [branch, setBranch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [qty, setQty] = useState(1);
  const [rentDate, setRentDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [dailyRate, setDailyRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    setVariationId(initialVariationId || "");
    setCustomerName("");
    setCustomerPhone("");
    setQty(1);
    setRentDate(todayISO());
    setDueDate("");
    setDailyRate(product.dailyRate);
    setDiscount(0);
    setTotal(product.dailyRate);
    setAdvance(0);
    setNotes("");
    setErrors({});
  }, [open, product, initialVariationId]);

  useEffect(() => {
    if (!open || !product) return;
    if (!variationId) {
      setBranch("");
      return;
    }
    const initialBranch = defaultBranch && stocked.includes(defaultBranch) ? defaultBranch : stocked[0] ?? "";
    setBranch(initialBranch);
    
    if (selectedVariation) {
      setDailyRate(selectedVariation.dailyRate);
    }
  }, [open, product, defaultBranch, stocked, variationId, selectedVariation]);

  const available = product && branch && selectedVariation ? (selectedVariation.stock[branch] ?? 0) : 0;
  const days = rentDate && dueDate && dueDate > rentDate ? daysBetween(rentDate, dueDate) : 1;
  const computed = Math.max(0, days * dailyRate * (qty || 1) - discount);

  useEffect(() => {
    setTotal(computed);
  }, [computed]);

  const balance = Math.max(0, total - advance);

  if (!product) return null;

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!variationId) next.variationId = "Please select a variation";
    if (!branch) next.branch = "Select a branch with stock";
    if (!customerName.trim()) next.customerName = "Customer name is required";
    if (!customerPhone.trim()) {
      next.customerPhone = "Phone number is required";
    } else if (!/^(\+91)?\d{10}$/.test(customerPhone.replace(/[\s-]/g, ""))) {
      next.customerPhone = "Use a 10-digit Indian number";
    }
    if (!qty || qty < 1) next.qty = "Minimum quantity is 1";
    if (qty > available) next.qty = `Only ${available} available at ${branch}`;
    if (!rentDate) next.rentDate = "Rent date is required";
    if (!dueDate) next.dueDate = "Due date is required";
    else if (dueDate <= rentDate) next.dueDate = "Due date must be after the rent date";
    if (advance > total) next.advance = "Advance cannot exceed the total";
    setErrors(next);
    if (Object.keys(next).length) return;

    setIsSubmitting(true);
    try {
      const rental = await createRental({
        productId: product.id,
        productName: product.name,
        variationId: selectedVariation?.id,
        variationName: selectedVariation?.name,
        sku: selectedVariation?.sku || product.sku,
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
    } catch (e) {
      console.error(e);
      // Fallback if network fails
    } finally {
      setIsSubmitting(false);
    }
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
          <Field label="Variation" error={errors.variationId} className="sm:col-span-2">
            <select className={inputClass} value={variationId} onChange={(e) => setVariationId(e.target.value)}>
              <option value="">Select a variation</option>
              {product.variations?.filter(v => v.enabled).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {Object.values(v.stock).reduce((a, b) => a + b, 0)} total in stock
                </option>
              ))}
            </select>
          </Field>

          <Field label="Product">
            <input className={inputClass} value={product.name} readOnly />
          </Field>
          <Field label="SKU">
            <input className={monoInputClass} value={selectedVariation?.sku || product.sku} readOnly />
          </Field>

          <Field label="Branch" error={errors.branch}>
            <select className={inputClass} value={branch} onChange={(e) => setBranch(e.target.value)}>
              {stocked.length === 0 ? <option value="">No stock available</option> : null}
              {stocked.map((b) => {
                const bStock = selectedVariation?.stock[b] ?? 0;
                return (
                  <option key={b} value={b}>
                    {b} · {bStock} in stock
                  </option>
                );
              })}
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
          <Field label="Customer Phone" error={errors.customerPhone} hint="Required · +91 or 10 digits">
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
              value={dailyRate === 0 ? "" : dailyRate}
              onChange={(e) => setDailyRate(Number(e.target.value))}
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
          <Field
            label="Total Amount (₹)"
            hint={discount > 0 ? `${days} day${days > 1 ? "s" : ""} × ${inr(dailyRate)} × ${qty || 1} - ${inr(discount)} discount` : `${days} day${days > 1 ? "s" : ""} × ${inr(dailyRate)} × ${qty || 1}`}
          >
            <input
              className={monoInputClass + " opacity-70 bg-white/[0.02] cursor-not-allowed"}
              value={total === 0 ? "" : total}
              readOnly
              tabIndex={-1}
            />
          </Field>

          <Field label="Advance Paid (₹)" error={errors.advance}>
            <input
              type="number"
              min={0}
              className={monoInputClass}
              value={advance === 0 ? "" : advance}
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

        <button
          className={goldButtonClass + " mt-2 w-full"}
          onClick={submit}
          disabled={isSubmitting || qty > available}
        >
          {isSubmitting ? "Confirming..." : "Confirm Rental"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
