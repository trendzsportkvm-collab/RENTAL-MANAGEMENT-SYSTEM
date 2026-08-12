import type { PaymentStatus, Rental } from "./types";

export const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const shiftISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/** YYYY-MM-DD -> DD/MM/YYYY */
export const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const daysBetween = (fromISO: string, toISO: string) => {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISO + "T00:00:00").getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000));
};

export const isOverdue = (r: Rental) =>
  r.status === "out" && r.dueDate < todayISO();

export const balanceOf = (r: Rental) => {
  if (r.paymentStatus === "paid") return 0;
  if (r.paymentStatus === "unpaid") return r.total;
  return Math.max(0, r.total - r.advance);
};

export const paymentLabel = (p: PaymentStatus) =>
  p === "paid" ? "Paid" : p === "partial" ? "Partial" : "Unpaid";

export const nextToken = (rentals: Rental[]) => {
  const year = new Date().getFullYear();
  const nums = rentals
    .map((r) => Number(r.token.split("-")[2]))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `TRZ-${year}-${String(next).padStart(4, "0")}`;
};

export const digitsOnly = (s: string) => s.replace(/\D/g, "");

export const waMessage = (r: Rental) =>
  [
    `Hi ${r.customerName}!`,
    ``,
    `Your rental from *Trendz* is confirmed.`,
    ``,
    `Item: ${r.productName}`,
    `Branch: ${r.branch}`,
    `Rented: ${fmtDate(r.rentDate)}`,
    `Due Back: ${fmtDate(r.dueDate)}`,
    `Token: ${r.token}`,
    `Total: ₹${r.total}`,
    `Advance: ₹${r.advance}`,
    `Balance: ₹${balanceOf(r)}`,
    ``,
    `Please return by *${fmtDate(r.dueDate)}*. Thank you!`,
  ].join("\n");

export const waReminder = (r: Rental) =>
  [
    `Hi ${r.customerName}!`,
    ``,
    `A friendly reminder from *Trendz*.`,
    `Item: ${r.productName} (Token: ${r.token})`,
    `Due Back: ${fmtDate(r.dueDate)}`,
    `Balance: ₹${balanceOf(r)}`,
    ``,
    isOverdue(r)
      ? `This rental is *overdue* — please return it at the earliest.`
      : `Please return it on time. Thank you!`,
  ].join("\n");

export const waPhone = (phone: string) => {
  const d = digitsOnly(phone);
  return d.length > 10 ? d : "91" + d;
};

export const waLink = (phone: string, text: string, app = false) => {
  const base = app
    ? "whatsapp://send?"
    : "https://api.whatsapp.com/send/?";
  return `${base}phone=${waPhone(phone)}&text=${encodeURIComponent(text)}`;
};

export const downloadCSV = (filename: string, rows: (string | number)[][]) => {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
