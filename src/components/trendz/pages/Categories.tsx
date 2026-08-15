import { useState } from "react";
import { useTrendz } from "@/lib/trendz/store";
import { Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

export function Categories() {
  const { categories, addCategory, deleteCategory } = useTrendz();
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatBaseSku, setNewCatBaseSku] = useState("");

  const handleAdd = async () => {
    if (!newCatName.trim()) {
      toast.error("Category name is required");
      return;
    }
    const cat = await addCategory(newCatName.trim(), newCatBaseSku.trim() || undefined);
    if (cat) {
      toast.success("Category added successfully");
      setNewCatName("");
      setNewCatBaseSku("");
      setIsAdding(false);
    } else {
      toast.error("Failed to add category");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-semibold text-foreground">Categories</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-black hover:bg-gold/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {isAdding && (
        <div className="glass-strong rounded-xl border border-border p-6 shadow-xl animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-medium text-foreground mb-4">New Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Category Name</label>
              <input
                type="text"
                placeholder="e.g. Wedding Suit"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Base SKU (Optional)</label>
              <input
                type="text"
                placeholder="e.g. WS"
                value={newCatBaseSku}
                onChange={(e) => setNewCatBaseSku(e.target.value.toUpperCase())}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold font-mono uppercase"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setIsAdding(false)}
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newCatName.trim()}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              Save Category
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/20 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Base SKU</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-white/[0.02]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gold/10 text-gold">
                      <Tag className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-foreground">{c.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {c.base_sku ? (
                    <span className="inline-flex items-center rounded bg-white/10 px-2 py-1 text-xs font-mono font-medium text-white">
                      {c.base_sku}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => {
                      if (confirm(\`Are you sure you want to delete "\${c.name}"?\`)) {
                        deleteCategory(c.id);
                      }
                    }}
                    className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && !isAdding && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                  No categories found. Click "Add Category" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
