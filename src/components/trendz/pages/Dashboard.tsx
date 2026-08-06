import { useMemo, useState } from "react";
import { Download, MessageCircle, Filter, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { useTrendz } from "@/lib/trendz/store";
import type { Rental } from "@/lib/trendz/types";
import { balanceOf, daysBetween, downloadCSV, fmtDate, inr, isOverdue, paymentLabel, todayISO, waLink, waReminder } from "@/lib/trendz/utils";
import {
  PaymentBadge,
  RentalStatusBadge,
  SummaryCard,
  TokenBadge,
  ghostButtonClass,
  goldButtonClass,
  inputClass,
  PaymentStatusSelect,
  StatusBadge,
} from "../primitives";
import { ReturnConfirm } from "../ReturnConfirm";
import { TableSkeleton, SummaryCardsSkeleton } from "../Skeleton";

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

type SortKey = "rentDate" | "dueDate" | "customerName" | "token" | "total";

export function Dashboard({ onEdit }: { onEdit: (r: Rental) => void }) {
  const { rentals, branches, setPaymentStatus, markReturned, isLoading } = useTrendz();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"rental" | "ledger">("rental");
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("rentDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const initial: Filters = {
    from: "", // Default to no date filter so we see active by default easily, or keep it to month start
    to: "",
    branch: "all",
    status: "all", // Show all by default in the new combined dashboard, or "out" ? Let's stick to "all" to be a true ledger/dashboard combo
    payment: "all",
  };
  
  const [draft, setDraft] = useState<Filters>(initial);
  const [applied, setApplied] = useState<Filters>(initial);

  const rows = useMemo(() => {
    let filtered = rentals;
    
    // Apply common filters
    filtered = filtered.filter((r) => {
      if (applied.from && r.rentDate < applied.from) return false;
      if (applied.to && r.rentDate > applied.to) return false;
      if (applied.branch !== "all" && r.branch !== applied.branch) return false;
      if (applied.payment !== "all" && r.paymentStatus !== applied.payment) return false;
      return true;
    });

    // Apply tab-specific status filter
    if (activeTab === "rental") {
      filtered = filtered.filter(r => r.status === "out");
    } else if (applied.status !== "all") {
      filtered = filtered.filter(r => r.status === applied.status);
    }

    return filtered.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
         return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
         return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [rentals, applied, sortKey, sortOrder]);

  const active = rentals.filter((r) => r.status === "out");
  const overdue = active.filter(isOverdue);

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
    downloadCSV(`trendz-dashboard-${todayISO()}.csv`, [header, ...body]);
    toast.success("Ledger exported", { description: `${rows.length} rows` });
  };

  return (
    <div>
      <header>
        <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
        <div className="mt-6 flex items-center gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab("rental")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "rental" ? "border-b-2 border-gold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Rental Dashboard
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "ledger" ? "border-b-2 border-gold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Financial Ledger
          </button>
        </div>
      </header>

      {isLoading ? (
        <SummaryCardsSkeleton count={activeTab === "rental" ? 2 : 4} />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {activeTab === "rental" ? (
            <>
              <SummaryCard label="Items Currently Out" value={active.reduce((a, r) => a + r.qty, 0)} />
              <SummaryCard label="Overdue Items" value={overdue.length} tone="rust" />
            </>
          ) : (
            <>
              <SummaryCard label="Total Revenue" value={inr(revenue)} tone="gold" />
              <SummaryCard label="Collected" value={inr(collected)} tone="emerald" />
              <SummaryCard label="Pending Balance" value={inr(pending)} tone="rust" />
              <SummaryCard label="Record Count" value={rows.length} />
            </>
          )}
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">
          {activeTab === "rental" ? "Active Rentals" : "Ledger Records"}
        </h2>
        <div className="flex items-center gap-2">
          <select
            className={inputClass + " w-36 py-1.5"}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="rentDate">Sort by Date</option>
            <option value="dueDate">Sort by Due Date</option>
            <option value="customerName">Sort by Name</option>
            <option value="token">Sort by Token</option>
            <option value="total">Sort by Amount</option>
          </select>
          <button 
            className={ghostButtonClass + " px-2 py-1.5"} 
            onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}
            title="Toggle Sort Order"
          >
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            className={ghostButtonClass + " py-1.5"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" /> Filter
          </button>
          {activeTab === "ledger" && (
            <button className={ghostButtonClass + " py-1.5"} onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="glass mt-4 flex flex-wrap items-end gap-3 p-3 animate-in fade-in slide-in-from-top-2">
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
          {activeTab === "ledger" && (
            <select
              className={inputClass + " w-32"}
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              <option value="all">All status</option>
              <option value="out">Out</option>
              <option value="returned">Returned</option>
            </select>
          )}
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
            Apply
          </button>
        </div>
      )}

      <div className="glass mt-6 overflow-x-auto">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={8} columns={8} />
          </div>
        ) : activeTab === "rental" ? (
          /* ── RENTAL DASHBOARD TABLE ── operational focus ── */
          <table className="w-full min-w-3xl text-sm">
            <thead className="sticky top-0 z-10 bg-surface-2/95 backdrop-blur">
              <tr className="text-left text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                {["Token", "Customer", "Item", "Branch", "Qty", "Due Date", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const late = isOverdue(r);
                const daysLeft = Math.ceil(
                  (new Date(r.dueDate).getTime() - Date.now()) / 86400000
                );
                return (
                  <tr
                    key={r.id}
                    className={"transition-colors duration-200 " + (late ? "overdue-row" : "row-zebra")}
                  >
                    <td className="px-3 py-2.5"><TokenBadge token={r.token} /></td>
                    <td className="px-3 py-2.5">
                      <p className="whitespace-nowrap font-medium">{r.customerName}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{r.customerPhone || "—"}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <img src={r.image} alt={r.productName} width={32} height={32} loading="lazy"
                          className="h-8 w-8 rounded-md border border-border object-cover" />
                        <div>
                          <p className="font-medium whitespace-nowrap">{r.productName}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{r.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{r.branch}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-sm font-semibold">{r.qty}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                      <div className="font-medium">{fmtDate(r.dueDate)}</div>
                      {late ? (
                        <StatusBadge tone="rust" className="mt-0.5">OVERDUE</StatusBadge>
                      ) : (
                        <div className="text-muted-foreground">
                          {daysLeft > 0 ? `${daysLeft}d left` : "Due today"}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="relative flex items-center gap-2">
                        <button className={ghostButtonClass + " border-indigo/40 text-indigo"} onClick={() => onEdit(r)}>Edit</button>
                        <button className={ghostButtonClass} onClick={() => setConfirmId(r.id)}>Return</button>
                        <a href={waLink(r.customerPhone, waReminder(r))} target="_blank" rel="noreferrer"
                          aria-label="WhatsApp reminder"
                          className="rounded-md border border-emerald/40 bg-emerald/10 p-1.5 text-emerald transition-colors duration-200 hover:bg-emerald/20">
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                        {confirmId === r.id ? (
                          <ReturnConfirm
                            onCancel={() => setConfirmId(null)}
                            onConfirm={(condition) => {
                              markReturned(r.id, condition);
                              setConfirmId(null);
                              toast.success(`${r.token} returned`, { description: `Condition: ${condition} · marked paid` });
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
        ) : (
          /* ── FINANCIAL LEDGER TABLE ── money focus ── */
          <table className="w-full min-w-5xl text-sm">
            <thead className="sticky top-0 z-10 bg-surface-2/95 backdrop-blur">
              <tr className="text-left text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                {["Token", "Customer", "Item", "Period", "Total", "Advance", "Balance", "Payment", "Status"].map((h) => (
                  <th key={h} className="px-3 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const bal = balanceOf(r);
                const days = daysBetween(r.rentDate, r.dueDate);
                return (
                  <tr key={r.id} className={"transition-colors duration-200 row-zebra"}>
                    <td className="px-3 py-2.5"><TokenBadge token={r.token} /></td>
                    <td className="px-3 py-2.5">
                      <p className="whitespace-nowrap font-medium">{r.customerName}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{r.customerPhone || "—"}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium whitespace-nowrap">{r.productName}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{r.sku}</p>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                      <div>{fmtDate(r.rentDate)} → {fmtDate(r.dueDate)}</div>
                      <div className="text-muted-foreground">{days} day{days !== 1 ? "s" : ""} · {inr(r.dailyRate)}/day</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-sm font-semibold whitespace-nowrap">{inr(r.total)}</td>
                    <td className="px-3 py-2.5 font-mono text-sm text-emerald whitespace-nowrap">{inr(r.advance)}</td>
                    <td className="px-3 py-2.5 font-mono text-sm whitespace-nowrap">
                      <span className={bal > 0 ? "text-rust font-semibold" : "text-emerald"}>{inr(bal)}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {r.status === "out" ? (
                        <PaymentStatusSelect value={r.paymentStatus} onChange={(v) => {
                          setPaymentStatus(r.id, v);
                          toast.success(`${r.token} marked ${v}`);
                        }} />
                      ) : (
                        <PaymentBadge status={r.paymentStatus} />
                      )}
                    </td>
                    <td className="px-3 py-2.5"><RentalStatusBadge status={r.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!isLoading && rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No records found.
          </p>
        ) : null}
      </div>
    </div>
  );
}
