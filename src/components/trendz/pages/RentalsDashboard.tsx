import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useTrendz } from "@/lib/trendz/store";
import type { Rental } from "@/lib/trendz/types";
import { balanceOf, fmtDate, inr, isOverdue, waLink, waReminder } from "@/lib/trendz/utils";
import {
  PaymentStatusSelect,
  StatusBadge,
  SummaryCard,
  TokenBadge,
  ghostButtonClass,
} from "../primitives";
import { ReturnConfirm } from "../ReturnConfirm";

export function RentalsDashboard({ onEdit }: { onEdit: (r: Rental) => void }) {
  const { rentals, setPaymentStatus, markReturned } = useTrendz();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const active = rentals.filter((r) => r.status === "out");
  const overdue = active.filter(isOverdue);

  return (
    <div>
      <header>
        <h1 className="font-display text-3xl font-semibold">Rentals Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything currently out of the shop, across both branches.
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:max-w-lg">
        <SummaryCard label="Items Currently Out" value={active.reduce((a, r) => a + r.qty, 0)} />
        <SummaryCard label="Overdue Items" value={overdue.length} tone="rust" />
      </div>

      <div className="glass mt-6 overflow-x-auto">
        <table className="w-full min-w-4xl text-sm">
          <thead className="sticky top-0 z-10 bg-surface-2/95 backdrop-blur">
            <tr className="text-left text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
              {["Token", "Product", "Customer", "Branch", "Qty", "Amount", "Payment", "Due Date", "Actions"].map(
                (h) => (
                  <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {active.map((r) => {
              const late = isOverdue(r);
              return (
                <tr
                  key={r.id}
                  className={
                    "transition-colors duration-200 " + (late ? "overdue-row" : "row-zebra")
                  }
                >
                  <td className="px-4 py-3">
                    <TokenBadge token={r.token} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={r.image}
                        alt={r.productName}
                        width={40}
                        height={40}
                        loading="lazy"
                        className="h-10 w-10 rounded-md border border-border object-cover"
                      />
                      <div>
                        <p className="font-medium whitespace-nowrap">{r.productName}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{r.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="whitespace-nowrap">{r.customerName}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {r.customerPhone || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.branch}</td>
                  <td className="px-4 py-3 font-mono">{r.qty}</td>
                  <td className="px-4 py-3 font-mono text-xs leading-relaxed whitespace-nowrap">
                    <div>{inr(r.total)} total</div>
                    <div className="text-muted-foreground">{inr(r.advance)} advance</div>
                    <div className={balanceOf(r) > 0 ? "text-rust" : "text-emerald"}>
                      {inr(balanceOf(r))} balance
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusSelect
                      value={r.paymentStatus}
                      onChange={(v) => {
                        setPaymentStatus(r.id, v);
                        toast.success(`${r.token} marked ${v}`);
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-xs">{fmtDate(r.dueDate)}</span>
                    {late ? (
                      <StatusBadge tone="rust" className="ml-2">
                        OVERDUE
                      </StatusBadge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative flex items-center gap-2">
                      <button
                        className={ghostButtonClass + " border-indigo/40 text-indigo"}
                        onClick={() => onEdit(r)}
                      >
                        Edit
                      </button>
                      <button className={ghostButtonClass} onClick={() => setConfirmId(r.id)}>
                        Mark Returned
                      </button>
                      <a
                        href={waLink(r.customerPhone, waReminder(r))}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Send WhatsApp reminder"
                        className="rounded-md border border-emerald/40 bg-emerald/10 p-1.5 text-emerald transition-colors duration-200 hover:bg-emerald/20"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                      {confirmId === r.id ? (
                        <ReturnConfirm
                          onCancel={() => setConfirmId(null)}
                          onConfirm={(condition) => {
                            markReturned(r.id, condition);
                            setConfirmId(null);
                            toast.success(`${r.token} returned`, {
                              description: `Condition: ${condition} · marked paid`,
                            });
                          }}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {active.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No active rentals. Everything is back in the racks.
          </p>
        ) : null}
      </div>
    </div>
  );
}
