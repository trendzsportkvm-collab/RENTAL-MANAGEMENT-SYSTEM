import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Trash2, ArrowLeft } from "lucide-react";
import { useTrendz } from "@/lib/trendz/store";
import type { Product, ProductAttribute, ProductVariation } from "@/lib/trendz/types";
import { createClient } from "@/lib/supabase/client";
import { Field, goldButtonClass, inputClass, monoInputClass } from "../primitives";

type Tab = "basic" | "attributes" | "variations";

const STANDARD_ATTRIBUTES = [
  "Clothing Size",
  "Shoe Size",
  "Color",
  "Fit / Style",
  "Custom..."
];

const STANDARD_SUGGESTIONS: Record<string, string[]> = {
  "Clothing Size": ["XS", "S", "M", "L", "XL", "XXL", "3XL"],
  "Shoe Size": ["6", "7", "8", "9", "10", "11", "12"],
  "Color": ["Black", "White", "Red", "Blue", "Green", "Gold", "Silver", "Pink", "Yellow", "Navy"],
  "Fit / Style": ["Slim", "Regular", "Loose"],
};

const titleCase = (str: string) => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatAttributeValue = (name: string, val: string) => {
  if (!val) return val;
  if (name.includes("Size") && val.match(/^[a-z]+$/i) && val.length <= 3) {
    return val.toUpperCase();
  }
  return titleCase(val);
};

export function AddProduct({
  productToEditId,
  initialCategory,
  onClose,
}: {
  productToEditId?: string | null;
  initialCategory?: string;
  onClose: () => void;
}) {
  const { products, categories, branches, createProduct, updateProduct } = useTrendz();
  
  const productToEdit = productToEditId ? products.find(p => p.id === productToEditId) : null;

  const [tab, setTab] = useState<Tab>("basic");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("Uncategorized");
  const [dailyRate, setDailyRate] = useState(0);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [type, setType] = useState<"simple" | "variable">("simple");
  const [stock, setStock] = useState<Record<string, number>>({});

  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setSku(productToEdit.sku);
      setCategory(productToEdit.category || "Uncategorized");
      setDailyRate(productToEdit.dailyRate);
      setDescription(productToEdit.description || "");
      setImage(productToEdit.image);
      setType(productToEdit.type);
      setStock(productToEdit.stock || {});
      setAttributes(productToEdit.attributes || []);
      setVariations(productToEdit.variations || []);
    } else {
      setName("");
      setSku("");
      setCategory(initialCategory || "Uncategorized");
      setDailyRate(0);
      setDescription("");
      setImage("");
      setType("simple");
      
      const initialStock: Record<string, number> = {};
      branches.forEach(b => initialStock[b] = 0);
      setStock(initialStock);
      
      setAttributes([]);
      setVariations([]);
    }
    setTab("basic");
    setError("");
  }, [productToEdit, initialCategory, branches]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from('product_images')
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('product_images')
          .getPublicUrl(fileName);

        setImage(publicUrl);
      } catch (err: any) {
        toast.error("Failed to upload image");
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const addAttribute = () => {
    setAttributes([...attributes, { name: "", values: [] }]);
  };

  const updateAttribute = (index: number, key: keyof ProductAttribute, value: any) => {
    const next = [...attributes];
    next[index] = { ...next[index], [key]: value };
    setAttributes(next);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleAttributeValues = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const rawVal = e.currentTarget.value.trim().replace(/,$/, "");
      const val = formatAttributeValue(attributes[index].name, rawVal);
      if (val && !attributes[index].values.includes(val)) {
        updateAttribute(index, "values", [...attributes[index].values, val]);
        e.currentTarget.value = "";
      }
    }
  };

  const handleAttributeBlur = (index: number, e: React.FocusEvent<HTMLInputElement>) => {
    const rawVal = e.currentTarget.value.trim().replace(/,$/, "");
    const val = formatAttributeValue(attributes[index].name, rawVal);
    if (val && !attributes[index].values.includes(val)) {
      updateAttribute(index, "values", [...attributes[index].values, val]);
      e.currentTarget.value = "";
    }
  };

  const removeAttributeValue = (attrIndex: number, val: string) => {
    const next = [...attributes];
    next[attrIndex].values = next[attrIndex].values.filter((v) => v !== val);
    setAttributes(next);
  };

  const generateVariations = () => {
    if (attributes.length === 0 || attributes.some((a) => !a.name.trim() || a.values.length === 0)) {
      toast.error("Please define valid attributes with values first.");
      return;
    }

    const attrs = attributes.map((a) => ({ name: a.name.trim(), values: a.values }));
    const combine = (index: number): Record<string, string>[] => {
      if (index === attrs.length) return [{}];
      const result: Record<string, string>[] = [];
      const sub = combine(index + 1);
      for (const val of attrs[index].values) {
        for (const s of sub) {
          result.push({ [attrs[index].name]: val, ...s });
        }
      }
      return result;
    };

    const combinations = combine(0);
    const newVars: ProductVariation[] = combinations.map((c, i) => {
      const nameParts = Object.entries(c).map(([k, v]) => `${k}: ${v}`);
      const suffix = Object.values(c).join("-").toUpperCase().replace(/\s+/g, "");
      return {
        id: `v${Date.now()}-${i}`,
        name: nameParts.join(", "),
        sku: `${sku ? sku + "-" : ""}${suffix}`,
        dailyRate: dailyRate,
        stock: { Kalpetta: 0, Bathery: 0 },
        attributes: c,
        enabled: true,
      };
    });

    setVariations(newVars);
    toast.success(`Generated ${newVars.length} variations`);
    setTab("variations");
  };

  const updateVariation = (index: number, patch: Partial<ProductVariation>) => {
    const next = [...variations];
    next[index] = { ...next[index], ...patch };
    setVariations(next);
  };

  const save = () => {
    if (!name.trim()) return setError("Product name is required");
    if (!sku.trim()) return setError("Base SKU is required");
    
    const skuRegex = /^[A-Z]{3,4}-\d{3,4}$/;
    if (!skuRegex.test(sku.trim())) {
      return setError("Invalid SKU Format. It must be 3-4 letters followed by a hyphen and 3-4 numbers (e.g. TUX-001).");
    }
    
    if (!category.trim()) return setError("Category is required");
    if (type === "variable" && variations.length === 0) {
      return setError("Please generate variations for this variable product");
    }

    const payload: Omit<Product, "id"> = {
      name: name.trim(),
      sku: sku.trim(),
      category: category.trim(),
      dailyRate,
      description,
      image,
      type,
      stock: type === "simple" ? stock : {},
      attributes: type === "variable" ? attributes : [],
      variations: type === "variable" ? variations : [],
    };

    if (productToEdit) {
      updateProduct(productToEdit.id, payload);
      toast.success("Product updated successfully");
    } else {
      createProduct(payload);
      toast.success("Product created successfully");
    }
    onClose();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white/[0.02] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-4xl font-semibold">
              {productToEdit ? "Edit Product" : "Add New Product"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {productToEdit ? "Update product details and stock." : "Create a new rental item in the catalog."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-rust mr-2">{error}</p>
          <button
            className="rounded-md border border-border px-6 py-2 text-sm font-medium hover:bg-white/[0.05]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className={goldButtonClass} onClick={save}>
            {productToEdit ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </header>

      <div className="glass flex flex-col overflow-hidden rounded-xl">
        <div className="flex border-b border-border bg-white/[0.02]">
          {(["basic", "attributes", "variations"] as Tab[]).map((t) => {
            if (type === "simple" && t !== "basic") return null;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  tab === t
                    ? "border-b-2 border-gold text-gold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "basic" && "1. Basic Info"}
                {t === "attributes" && "2. Attributes"}
                {t === "variations" && "3. Variations & Stock"}
              </button>
            );
          })}
        </div>

        <div className="p-8">
          {tab === "basic" && (
            <div className="grid gap-10 sm:grid-cols-2">
              <div className="space-y-6">
                <Field label="Product Name">
                  <input
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Premium Tuxedo"
                  />
                </Field>
                <Field label="Category">
                  <input
                    list="categories-list"
                    className={inputClass}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Suit, Jeans"
                  />
                  <datalist id="categories-list">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Base SKU">
                    <input
                      className={monoInputClass}
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      placeholder="e.g. TUX-001"
                    />
                  </Field>
                  <Field label="Base Daily Rate (₹)">
                    <input
                      type="number"
                      className={monoInputClass}
                      value={dailyRate === 0 ? "" : dailyRate}
                      onChange={(e) => setDailyRate(Number(e.target.value))}
                    />
                  </Field>
                </div>
                <Field label="Product Type">
                  <select
                    className={inputClass}
                    value={type}
                    onChange={(e) => setType(e.target.value as "simple" | "variable")}
                  >
                    <option value="simple">Simple Product</option>
                    <option value="variable">Variable Product</option>
                  </select>
                </Field>
                <Field label="Description">
                  <textarea
                    rows={4}
                    className={inputClass}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Field>
              </div>

              <div className="space-y-6">
                <Field label="Product Image">
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-white/[0.02] p-10 text-center hover:bg-white/[0.04]">
                    {image ? (
                      <div className="relative">
                        <img src={image} alt="Preview" className="h-48 w-auto rounded object-cover shadow-lg" />
                        <button
                          onClick={() => setImage("")}
                          className="absolute -right-3 -top-3 rounded-full bg-rust p-1.5 text-white shadow hover:bg-rust/90"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <label className={`cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                          <span className="rounded-md bg-white/[0.05] px-4 py-2 text-sm text-foreground hover:bg-white/[0.1]">
                            {isUploading ? "Uploading..." : "Select Image"}
                          </span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                        <p className="mt-3 text-xs text-muted-foreground">Upload a JPG or PNG file</p>
                      </>
                    )}
                  </div>
                </Field>

                {type === "simple" && (
                  <div className="space-y-5 rounded-xl border border-border p-6 bg-white/[0.01]">
                    <h3 className="font-display text-sm font-medium text-gold">Simple Product Stock</h3>
                    {branches.map((b) => (
                      <Field key={b} label={`${b} Stock`}>
                        <input
                          type="number"
                          min="0"
                          className={monoInputClass}
                          value={stock[b] === 0 ? "" : (stock[b] || "")}
                          onChange={(e) => setStock({ ...stock, [b]: Number(e.target.value) })}
                        />
                      </Field>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "attributes" && (
            <div className="space-y-6">
              <div className="space-y-4">
                {attributes.map((attr, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-white/[0.01] p-5 sm:flex-row sm:items-start">
                    <Field label="Attribute Name" className="sm:w-1/3">
                      <div className="flex flex-col gap-2">
                        <select
                          className={inputClass}
                          value={STANDARD_ATTRIBUTES.includes(attr.name) ? attr.name : (attr.name ? "Custom..." : "")}
                          onChange={(e) => {
                            if (e.target.value === "Custom...") {
                              updateAttribute(i, "name", "Custom Attribute");
                            } else {
                              updateAttribute(i, "name", e.target.value);
                            }
                          }}
                        >
                          <option value="" disabled>Select Attribute</option>
                          {STANDARD_ATTRIBUTES.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        {!STANDARD_ATTRIBUTES.includes(attr.name) && attr.name && (
                          <input
                            className={inputClass}
                            value={attr.name === "Custom Attribute" ? "" : attr.name}
                            onChange={(e) => updateAttribute(i, "name", e.target.value)}
                            placeholder="Type custom name"
                            autoFocus
                          />
                        )}
                      </div>
                    </Field>
                    <div className="flex-1 space-y-2">
                      <Field label="Values (Press Enter to add)">
                        <input
                          className={inputClass}
                          placeholder="Type a value and press Enter..."
                          onKeyDown={(e) => handleAttributeValues(i, e)}
                          onBlur={(e) => handleAttributeBlur(i, e)}
                        />
                      </Field>
                      {STANDARD_SUGGESTIONS[attr.name] && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="text-xs text-muted-foreground mr-1 mt-1 flex items-center">Suggestions:</span>
                          {STANDARD_SUGGESTIONS[attr.name].map(sug => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => {
                                if (!attr.values.includes(sug)) {
                                  updateAttribute(i, "values", [...attr.values, sug]);
                                }
                              }}
                              className="rounded border border-border bg-white/[0.02] px-2 py-0.5 text-xs text-muted-foreground hover:bg-gold/10 hover:text-gold hover:border-gold/30 transition-colors"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      )}
                      {attr.values.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {attr.values.map((v) => (
                            <span
                              key={v}
                              className="flex items-center gap-1.5 rounded-md bg-white/[0.08] px-2.5 py-1 text-xs font-medium"
                            >
                              {v}
                              <button
                                onClick={() => removeAttributeValue(i, v)}
                                className="text-muted-foreground hover:text-rust"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeAttribute(i)}
                      className="mt-6 p-2 text-muted-foreground hover:text-rust transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={addAttribute}
                  className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-white/[0.05]"
                >
                  <Plus className="h-4 w-4" /> Add Attribute
                </button>
                <button onClick={generateVariations} className={goldButtonClass}>
                  Generate Variations
                </button>
              </div>
            </div>
          )}

          {tab === "variations" && (
            <div className="space-y-6">
              {variations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-16 text-center">
                  <p className="text-muted-foreground">
                    No variations generated yet. Go to Attributes to generate them.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {variations.map((v, i) => (
                    <div
                      key={v.id}
                      className={`flex flex-col gap-4 rounded-xl border border-border p-5 transition-colors ${
                        !v.enabled ? "opacity-50 grayscale bg-transparent" : "bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-border/50 pb-4">
                        <div>
                          <h4 className="font-display text-lg font-medium text-foreground">{v.name}</h4>
                          <p className="font-mono text-xs text-muted-foreground mt-1">{v.sku}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={v.enabled}
                              onChange={(e) => updateVariation(i, { enabled: e.target.checked })}
                              className="h-4 w-4 accent-gold"
                            />
                            Enabled
                          </label>
                          <button
                            onClick={() => setVariations(variations.filter((_, idx) => idx !== i))}
                            className="text-muted-foreground hover:text-rust transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                        <Field label="SKU">
                          <input
                            className={monoInputClass}
                            value={v.sku}
                            onChange={(e) => updateVariation(i, { sku: e.target.value })}
                            disabled={!v.enabled}
                          />
                        </Field>
                        <Field label="Daily Rate (₹)">
                          <input
                            type="number"
                            className={monoInputClass}
                            value={v.dailyRate === 0 ? "" : v.dailyRate}
                            onChange={(e) => updateVariation(i, { dailyRate: Number(e.target.value) })}
                            disabled={!v.enabled}
                          />
                        </Field>
                        {branches.map((b) => (
                          <Field key={b} label={`${b} Stock`}>
                            <input
                              type="number"
                              min="0"
                              className={monoInputClass}
                              value={v.stock[b] === 0 ? "" : (v.stock[b] || "")}
                              onChange={(e) =>
                                updateVariation(i, { stock: { ...v.stock, [b]: Number(e.target.value) } })
                              }
                              disabled={!v.enabled}
                            />
                          </Field>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
