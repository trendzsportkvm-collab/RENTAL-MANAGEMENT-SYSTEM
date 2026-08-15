import { useState } from "react";
import { BarChart3, ClipboardList, LayoutGrid, ScanLine, Upload, ChevronDown, Plus, Tag, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrendz } from "@/lib/trendz/store";
import { useAuth } from "@/lib/trendz/AuthContext";

export type PageKey = "scan" | "products" | "dashboard" | "rentals" | "stock" | "categories" | "import" | "add-product";

export function Sidebar({
  active,
  onChange,
  isOpen,
  onClose,
}: {
  active: PageKey;
  onChange: (key: PageKey) => void;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const { categories } = useTrendz();
  const { profile, signOut } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Rental Management": true,
    Products: true,
  });
  
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const navGroups = [
    {
      title: "Rental Management",
      items: [
        { key: "scan" as PageKey, label: "Inventory Search", icon: ScanLine },
        { key: "rentals" as PageKey, label: "All Rentals", icon: ClipboardList },
      ],
    },
    {
      title: "Products",
      items: [
        { key: "products" as PageKey, label: "All Products", icon: LayoutGrid },
        { key: "add-product" as PageKey, label: "Add New Product", icon: Plus, adminOnly: true },
        { key: "categories" as PageKey, label: "Categories", icon: Tag, adminOnly: true },
        { key: "stock" as PageKey, label: "Stock Locations", icon: LayoutGrid, superAdminOnly: true },
        { key: "import" as PageKey, label: "CSV Import", icon: Upload, adminOnly: true },
      ].filter(item => {
        if ((item as any).superAdminOnly) return profile?.role === "super_admin";
        if ((item as any).adminOnly) return profile?.role === "super_admin" || profile?.role === "owner";
        return true;
      }),
    },
  ];

  return (
    <aside className={cn(
      "fixed top-0 left-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar overflow-y-auto transition-transform duration-300 md:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="px-6 pt-7 pb-6 flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl leading-none font-semibold text-foreground">
            Trendz
          </h1>
          <p className="mt-1.5 text-[10px] tracking-[0.22em] text-gold uppercase">
            Rental Studio
          </p>
        </div>
        {isOpen && (
          <button onClick={onClose} className="md:hidden p-2 text-muted-foreground hover:bg-black/5 rounded-full">
            ✕
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-4 px-3 pb-8">
        {/* Top-level standalone items */}
        <div className="flex flex-col gap-1 mb-2">
          <button
            onClick={() => onChange("dashboard")}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-200",
              active === "dashboard"
                ? "bg-white/[0.06] text-foreground"
                : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "absolute top-1.5 bottom-1.5 left-0 w-[2px] rounded-full transition-all duration-200",
                active === "dashboard" ? "bg-gold" : "bg-transparent",
              )}
            />
            <BarChart3 className={cn("h-4 w-4", active === "dashboard" && "text-gold")} />
            Dashboard
          </button>
        </div>

        {navGroups.map((group) => {
          const isOpen = openGroups[group.title];
          return (
            <div key={group.title} className="flex flex-col">
              <button
                onClick={() => toggleGroup(group.title)}
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                {group.title}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    isOpen ? "rotate-180" : ""
                  )}
                />
              </button>
              
              <div
                className={cn(
                  "flex flex-col gap-1 overflow-hidden transition-all duration-200",
                  isOpen ? "mt-1 opacity-100" : "max-h-0 opacity-0"
                )}
                style={{ maxHeight: isOpen ? "1000px" : "0px" }}
              >
                {group.items.map((item) => {
                  const isActive = item.key === active;
                  return (
                    <button
                      key={item.key}
                      onClick={() => onChange(item.key)}
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
                      <item.icon className={cn("h-4 w-4", isActive && "text-gold")} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto px-6 pb-6 text-[11px] leading-relaxed text-muted-foreground">
        {profile ? (
          <div className="mb-4">
            <p className="text-foreground/80 font-medium">{profile.full_name}</p>
            <p className="mt-1 uppercase tracking-widest text-[9px] text-gold">{profile.role}</p>
            <button 
              onClick={signOut}
              className="mt-3 flex items-center gap-2 text-rust hover:text-rust/80 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        ) : (
          <>
            <p className="text-foreground/80">Kalpetta · Bathery</p>
            <p className="mt-1">Wayanad, Kerala</p>
          </>
        )}
        <p className="mt-3 font-mono text-[10px] text-muted-foreground/70">
          Staff panel v1.1
        </p>
      </div>
    </aside>
  );
}
