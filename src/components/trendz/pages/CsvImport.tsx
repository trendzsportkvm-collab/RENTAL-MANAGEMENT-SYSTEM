import { useRef, useState } from "react";
import { Download, FileText, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { useTrendz, type ImportRow } from "@/lib/trendz/store";
import { downloadCSV } from "@/lib/trendz/utils";
import { ghostButtonClass, goldButtonClass } from "../primitives";

const TEMPLATE: (string | number)[][] = [
  ["name", "sku", "daily_rate", "branch_name", "quantity"],
  ["Bridal Suit Red", "BS-RED-001", 500, "Kalpetta", 3],
  ["Bridal Suit Red", "BS-RED-001", 500, "Bathery", 2],
  ["Bridal Gown White", "GWN-WHT-001", 2000, "Kalpetta", 1],
];

const parseCSV = (text: string): ImportRow[] => {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row as unknown as ImportRow;
  });
};

export function CsvImport() {
  const { importProducts } = useTrendz();
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
    const text = await file.text();
    const rows = parseCSV(text);
    const res = importProducts(rows);
    setResult(res);
    toast.success("Import finished", {
      description: `${res.created} created · ${res.updated} updated · ${res.errors.length} errors`,
    });
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
                name, sku, daily_rate, branch_name, quantity
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              To set stock in multiple branches, add one row per branch for the same SKU.
            </p>
          </div>
          <button
            className={ghostButtonClass + " py-2"}
            onClick={() => downloadCSV("trendz-import-template.csv", TEMPLATE)}
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
