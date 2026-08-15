import type { PaymentStatus, Rental } from "./types";

export const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

export const todayISO = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(new Date());
};

export const shiftISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(d);
};

/** YYYY-MM-DD -> DD/MM/YYYY */
export const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
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
    `✨ *Rental Confirmed!* ✨`,
    `Hi ${r.customerName}, thank you for choosing *Trendz*!`,
    ``,
    `👔 *Item:* ${r.productName} (${r.sku})`,
    `📅 *Rented On:* ${fmtDate(r.rentDate)}`,
    `⏰ *Due Back:* ${fmtDate(r.dueDate)}`,
    ``,
    `💰 *Financials:*`,
    `• Total: ₹${r.total}`,
    `• Advance Paid: ₹${r.advance}`,
    `• Pending Balance: ₹${balanceOf(r)}`,
    ``,
    `📌 *Token ID:* ${r.token}`,
    `📍 *Branch:* ${r.branch}`,
    ``,
    `We hope you have a great event! Please ensure the item is returned on time to avoid late fees.`,
  ].join("\n");

export const waReminder = (r: Rental) =>
  [
    isOverdue(r) ? `⚠️ *OVERDUE RENTAL ALERT* ⚠️` : `🔔 *Friendly Reminder from Trendz!* 🔔`,
    `Hi ${r.customerName},`,
    ``,
    isOverdue(r)
      ? `Your rental for the *${r.productName}* was due back on *${fmtDate(r.dueDate)}* and is currently overdue.`
      : `Just a quick reminder that your rental for the *${r.productName}* is due back on *${fmtDate(r.dueDate)}*.`,
    ``,
    `📌 *Token ID:* ${r.token}`,
    balanceOf(r) > 0 ? `💰 *Pending Balance:* ₹${balanceOf(r)}` : `💰 *Pending Balance:* ₹0 (Fully Paid)`,
    ``,
    isOverdue(r)
      ? `Please return the item at the earliest. Note that late fees may apply for each additional day.`
      : `We hope you enjoyed using it! Please return it to our *${r.branch}* branch on time.`,
    ``,
    `Thank you! ✨`,
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
