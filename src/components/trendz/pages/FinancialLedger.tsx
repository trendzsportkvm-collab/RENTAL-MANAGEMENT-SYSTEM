import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useTrendz } from "@/lib/trendz/store";
import { balanceOf, daysBetween, downloadCSV, fmtDate, inr, isOverdue, paymentLabel, todayISO } from "@/lib/trendz/utils";
import {
  PaymentBadge,
  RentalStatusBadge,
  SummaryCard,
  TokenBadge,
  ghostButtonClass,
  goldButtonClass,
  inputClass,
} from "../primitives";

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

interface Filters {
  from: string;
  to: string;
  branch: string;
  status: string;
  payment: string;
}

export function FinancialLedger() {
  const { rentals, branches } = useTrendz();
  const initial: Filters = {
    from: monthStart(),
    to: todayISO(),
    branch: "all",
    status: "all",
    payment: "all",
  };
  const [draft, setDraft] = useState<Filters>(initial);
  const [applied, setApplied] = useState<Filters>(initial);

  const rows = useMemo(
    () =>
      rentals.filter((r) => {
        if (applied.from && r.rentDate < applied.from) return false;
        if (applied.to && r.rentDate > applied.to) return false;
        if (applied.branch !== "all" && r.branch !== applied.branch) return false;
        if (applied.status !== "all" && r.status !== applied.status) return false;
        if (applied.payment !== "all" && r.paymentStatus !== applied.payment) return false;
        return true;
      }),
    [rentals, applied],
  );

  const revenue = rows.reduce((a, r) => a + r.total, 0);
  const collected = rows.reduce((a, r) => a + r.advance, 0);
  const pending = rows.reduce((a, r) => a + balanceOf(r), 0);
  const overdueBalance = rows.filter(isOverdue).reduce((a, r) => a + balanceOf(r), 0);

  const exportCSV = () => {
    const header = [
      "Token","Customer","Phone","Item","SKU","Branch","Qty","Days","Rate/Day","Total","Advance","Balance","Payment","Status","Rented","Due",
    ];
    const body = rows.map((r) => [
      r.token,
      r.customerName,
      r.customerPhone,
      r.productName,
      r.sku,
      r.branch,
      r.qty,
      daysBetween(r.rentDate, r.dueDate),
      r.dailyRate,
      r.total,
      r.advance,
      balanceOf(r),
      paymentLabel(r.paymentStatus),
      r.status === "returned" ? "Returned" : "Out",
      r.rentDate,
      r.dueDate,
    ]);
    downloadCSV(`trendz-ledger-${todayISO()}.csv`, [header, ...body]);
    toast.success("Ledger exported", { description: `${rows.length} rows` });
  };

  return (
    <div>
      <header>
        <h1 className="font-display text-3xl font-semibold">Financial Ledger</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete rental history with revenue, collections and outstanding balances.
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Total Revenue" value={inr(revenue)} tone="gold" />
        <SummaryCard label="Collected" value={inr(collected)} tone="emerald" />
        <SummaryCard label="Pending Balance" value={inr(pending)} tone="rust" />
        <SummaryCard label="Overdue Balance" value={inr(overdueBalance)} tone="rust" />
        <SummaryCard label="Rental Count" value={rows.length} />
      </div>

      <div className="glass mt-6 flex flex-wrap items-end gap-3 p-3">
        <label className="text-xs text-muted-foreground">
          <span className="mb-1 block">From</span>
          <input
            type="date"
            className={inputClass + " w-40 font-mono"}
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          <span className="mb-1 block">To</span>
          <input
            type="date"
            className={inputClass + " w-40 font-mono"}
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </label>
        <select
          className={inputClass + " w-36"}
          value={draft.branch}
          onChange={(e) => setDraft({ ...draft, branch: e.target.value })}
        >
          <option value="all">All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          className={inputClass + " w-32"}
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
        >
          <option value="all">All status</option>
          <option value="out">Out</option>
          <option value="returned">Returned</option>
        </select>
        <select
          className={inputClass + " w-32"}
          value={draft.payment}
          onChange={(e) => setDraft({ ...draft, payment: e.target.value })}
        >
          <option value="all">All payments</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <button className={goldButtonClass} onClick={() => setApplied(draft)}>
          Apply Filter
        </button>
        <button className={ghostButtonClass + " ml-auto py-2"} onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="glass mt-6 overflow-x-auto">
        <table className="w-full min-w-5xl text-sm">
          <thead className="sticky top-0 z-10 bg-surface-2/95 backdrop-blur">
            <tr className="text-left text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
              {["Token","Customer","Item","Branch","Qty","Days","Rate/Day","Total","Advance","Balance","Payment","Status","Rented","Due"].map((h) => (
                <th key={h} className="px-3 py-3 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const bal = balanceOf(r);
              return (
                <tr
                  key={r.id}
                  className={
                    "transition-colors duration-200 " + (isOverdue(r) ? "overdue-row" : "row-zebra")
                  }
                >
                  <td className="px-3 py-2.5">
                    <TokenBadge token={r.token} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.customerName}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.productName}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.branch}</td>
                  <td className="px-3 py-2.5 font-mono">{r.qty}</td>
                  <td className="px-3 py-2.5 font-mono">{daysBetween(r.rentDate, r.dueDate)}</td>
                  <td className="px-3 py-2.5 font-mono">{inr(r.dailyRate)}</td>
                  <td className="px-3 py-2.5 font-mono">{inr(r.total)}</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{inr(r.advance)}</td>
                  <td
                    className={
                      "px-3 py-2.5 font-mono " + (bal > 0 ? "text-rust" : "text-muted-foreground")
                    }
                  >
                    {inr(bal)}
                  </td>
                  <td className="px-3 py-2.5">
                    <PaymentBadge status={r.paymentStatus} />
                  </td>
                  <td className="px-3 py-2.5">
                    <RentalStatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                    {fmtDate(r.rentDate)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                    {fmtDate(r.dueDate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No rentals in this range.
          </p>
        ) : null}
      </div>
    </div>
  );
}
