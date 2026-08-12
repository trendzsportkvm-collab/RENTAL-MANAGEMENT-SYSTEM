import { useRef, useState } from "react";
import { Download, FileText, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { useTrendz, type ImportRow } from "@/lib/trendz/store";
import { downloadCSV } from "@/lib/trendz/utils";
import { ghostButtonClass, goldButtonClass } from "../primitives";

import Papa from "papaparse";



const parseCSV = async (file: File): Promise<ImportRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse<ImportRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    });
  });
};

export function CsvImport() {
  const { importProducts, locations } = useTrendz();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | null | undefined) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Only .csv files are supported");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const runImport = async () => {
    if (!file) return;
    try {
      const rows = await parseCSV(file);
      const res = await importProducts(rows);
      setResult(res);
    toast.success("Import finished", {
      description: `${res.created} created · ${res.updated} updated · ${res.errors.length} errors`,
    });
    } catch (err) {
      toast.error("Failed to parse CSV");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="font-display text-3xl font-semibold">CSV Import</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bring in your catalog and per-branch stock in one pass.
        </p>
      </header>

      <section className="glass mt-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Bulk Import Products via CSV</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Required columns:{" "}
              <span className="font-mono text-foreground">
                Type, Name, SKU, Category, Daily Rate
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              For variable products, add <span className="font-mono text-foreground">Variation Name</span> and <span className="font-mono text-foreground">Variation SKU</span>.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Optional columns: Description, Image URL (Paste external links here to save Supabase Storage!)
            </p>
          </div>
          <button
            className={ghostButtonClass + " py-2"}
            onClick={() => {
              const headers = ["Name", "SKU", "Variation Name", "Variation SKU", "Category", "Daily Rate", "Description", "Image URL"];
              const branches = locations.filter(l => l.enabled);
              branches.forEach(b => headers.push(`Stock: ${b.name}`));
              
              const varRow1 = ["Groom Sherwani", "SHR-001", "Size M", "SHR-001-M", "Mens", 1899, "", ""];
              const varRow2 = ["Groom Sherwani", "SHR-001", "Size L", "SHR-001-L", "Mens", 1899, "", ""];
              
              branches.forEach(() => {
                varRow1.push("5");
                varRow2.push("2");
              });
              
              downloadCSV("trendz-import-template.csv", [headers, varRow1, varRow2]);
            }}
          >
            <Download className="h-3.5 w-3.5" /> Download Template
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={
            "mt-5 cursor-pointer rounded-lg border border-dashed p-10 text-center transition-all duration-200 " +
            (dragging
              ? "border-gold/60 bg-gold/8"
              : "border-border hover:border-gold/40 hover:bg-white/[0.03]")
          }
        >
          <UploadCloud className="mx-auto h-8 w-8 text-gold" />
          <p className="mt-3 text-sm">Drop your CSV here or click to browse</p>
          <p className="mt-1 text-xs text-muted-foreground">Max one file · .csv only</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>

        {file ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-white/[0.03] px-3 py-2.5">
            <FileText className="h-4 w-4 text-gold" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{file.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              className={ghostButtonClass}
              onClick={() => {
                setFile(null);
                setResult(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        ) : null}

        {file ? (
          <button className={goldButtonClass + " mt-4 w-full"} onClick={runImport}>
            Start Import
          </button>
        ) : null}

        {result ? (
          <div className="mt-5 rounded-lg border border-border bg-white/[0.03] p-4 text-sm">
            <p>
              Created <span className="font-mono text-emerald">{result.created}</span> products,
              Updated <span className="font-mono text-gold">{result.updated}</span>, Errors:{" "}
              <span className="font-mono text-rust">{result.errors.length}</span>
            </p>
            {result.errors.length ? (
              <ul className="mt-2 space-y-1 text-xs text-rust">
                {result.errors.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
