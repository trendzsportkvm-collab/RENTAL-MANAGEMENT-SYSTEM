import { BarChart3, ClipboardList, LayoutGrid, ScanLine, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export type PageKey = "scan" | "products" | "rentals" | "ledger" | "import";

export const NAV: { key: PageKey; label: string; icon: typeof ScanLine }[] = [
  { key: "scan", label: "Scan & Lookup", icon: ScanLine },
  { key: "products", label: "All Products", icon: LayoutGrid },
  { key: "rentals", label: "Rentals Dashboard", icon: ClipboardList },
  { key: "ledger", label: "Financial Ledger", icon: BarChart3 },
  { key: "import", label: "CSV Import", icon: Upload },
];

export function Sidebar({
  active,
  onChange,
}: {
  active: PageKey;
  onChange: (key: PageKey) => void;
}) {
  return (
    <aside className="fixed top-0 left-0 z-30 flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="px-6 pt-7 pb-6">
        <h1 className="font-display text-2xl leading-none font-semibold text-foreground">
          Trendz
        </h1>
        <p className="mt-1.5 text-[10px] tracking-[0.22em] text-gold uppercase">
          Rental Studio
        </p>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV.map(({ key, label, icon: Icon }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-200",
                isActive
                  ? "bg-white/[0.06] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "absolute top-1.5 bottom-1.5 left-0 w-[2px] rounded-full transition-all duration-200",
                  isActive ? "bg-gold" : "bg-transparent",
                )}
              />
              <Icon className={cn("h-4 w-4", isActive && "text-gold")} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-6 pb-6 text-[11px] leading-relaxed text-muted-foreground">
        <p className="text-foreground/80">Kalpetta · Bathery</p>
        <p className="mt-1">Wayanad, Kerala</p>
        <p className="mt-3 font-mono text-[10px] text-muted-foreground/70">
          Staff panel v1.0
        </p>
      </div>
    </aside>
  );
}
