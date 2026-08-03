import { useState } from "react";
import { EyeOff, MapPin } from "lucide-react";
import { useTrendz } from "@/lib/trendz/store";
import { inputClass, labelClass } from "../primitives";
import type { StockLocation } from "@/lib/trendz/types";

export function StockLocations() {
  const { locations, products, createLocation } = useTrendz();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [backorderLocation, setBackorderLocation] = useState(false);
  const [autoAllocate, setAutoAllocate] = useState(false);
  const [priority, setPriority] = useState(0);
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    createLocation({
      name: name.trim(),
      slug: slug.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      isDefault,
      backorderLocation,
      autoAllocate,
      priority,
      email,
      enabled: true,
    });

    setName("");
    setSlug("");
    setIsDefault(false);
    setBackorderLocation(false);
    setAutoAllocate(false);
    setPriority(0);
    setEmail("");
  };

  const getProductCount = (locName: string) => {
    return products.filter(p => {
      if (p.type === "simple") {
        return (p.stock[locName] ?? 0) > 0;
      }
      return (p.variations || []).some(v => (v.stock[locName] ?? 0) > 0);
    }).length;
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Location</h1>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left Column - Form */}
        <div className="w-full lg:w-1/3">
          <h2 className="mb-4 font-display text-lg font-medium">Add New Item</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Name</label>
              <input 
                type="text" 
                required
                className={inputClass} 
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">The name is how it appears on your site.</p>
            </div>

            <div>
              <label className={labelClass}>Slug</label>
              <input 
                type="text" 
                className={inputClass} 
                value={slug}
                onChange={e => setSlug(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">The "slug" is the URL-friendly version of the name. It is usually all lowercase and contains only letters, numbers, and hyphens.</p>
            </div>

            <div>
              <label className={labelClass}>Default for new products</label>
              <select 
                className={inputClass}
                value={isDefault ? "yes" : "no"}
                onChange={e => setIsDefault(e.target.value === "yes")}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Should location be selected by default for new products?</p>
            </div>

            <div>
              <label className={labelClass}>Backorder location</label>
              <select 
                className={inputClass}
                value={backorderLocation ? "yes" : "no"}
                onChange={e => setBackorderLocation(e.target.value === "yes")}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Should backorder stock be allocated to this location? Only used if auto order allocate is enabled. Please ensure only one backorder location is set.</p>
            </div>

            <div>
              <label className={labelClass}>Auto order allocate</label>
              <select 
                className={inputClass}
                value={autoAllocate ? "yes" : "no"}
                onChange={e => setAutoAllocate(e.target.value === "yes")}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Should stock be auto allocated to stock locations when an order is placed? See priority field below to set priority.</p>
            </div>

            <div>
              <label className={labelClass}>Location priority</label>
              <input 
                type="number" 
                className={inputClass} 
                value={priority}
                onChange={e => setPriority(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-muted-foreground">This is the order in which stock is auto allocated if enabled.</p>
            </div>

            <div>
              <label className={labelClass}>Location email</label>
              <input 
                type="email" 
                className={inputClass} 
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">Email address for notifications when a customer buys from this location. Works only if auto order allocation is enabled for this location.</p>
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Add New Item
              </button>
            </div>
          </form>
        </div>

        {/* Right Column - Table */}
        <div className="flex-1">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input type="text" className={inputClass + " w-48 h-9"} />
              <button className="rounded border border-border px-3 py-1.5 text-sm font-medium hover:bg-white/[0.05] transition-colors">Search Items</button>
            </div>

            <div className="flex items-center gap-2">
            </div>
          </div>

          <div className="flex items-center justify-end mb-2 text-sm text-muted-foreground">
            {locations.length} items
          </div>

          <div className="glass overflow-x-auto rounded-lg">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-white/[0.02]">
                  <th className="w-12 px-4 py-3 text-center"><input type="checkbox" className="rounded border-border bg-transparent focus:ring-gold" /></th>
                  <th className="px-4 py-3 font-medium text-gold hover:text-gold/80 cursor-pointer">Name</th>
                  <th className="px-4 py-3 font-medium text-gold hover:text-gold/80 cursor-pointer">Slug</th>
                  <th className="px-4 py-3 font-medium text-gold hover:text-gold/80 cursor-pointer">Count</th>
                  <th className="px-4 py-3 font-medium">Enabled/Disabled</th>
                  <th className="px-4 py-3 font-medium text-center">Auto Allocation</th>
                  <th className="px-4 py-3 font-medium text-center">Map Visibility</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Default Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {locations.map((loc) => (
                  <tr key={loc.id} className="group transition-colors hover:bg-white/[0.02] bg-white/[0.01]">
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" className="rounded border-border bg-transparent focus:ring-gold" />
                    </td>
                    <td className="px-4 py-3 font-medium text-gold hover:underline cursor-pointer">
                      {loc.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {loc.slug}
                    </td>
                    <td className="px-4 py-3 text-blue-400 hover:underline cursor-pointer">
                      {getProductCount(loc.name)}
                    </td>
                    <td className="px-4 py-3">
                      <EyeOff className="h-4 w-4 text-muted-foreground opacity-30 hover:opacity-100 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="mx-auto flex h-4 w-4 items-center justify-center rounded-full border-2 border-muted-foreground/30"></div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <MapPin className="mx-auto h-4 w-4 text-muted-foreground opacity-50" />
                    </td>
                    <td className="px-4 py-3 text-blue-400">
                      {loc.priority}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {loc.isDefault ? "Yes" : ""}
                    </td>
                  </tr>
                ))}
                
                {locations.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      No locations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
