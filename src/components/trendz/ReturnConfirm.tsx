import { useState } from "react";
import type { ReturnCondition } from "@/lib/trendz/types";
import { ghostButtonClass, goldButtonClass } from "./primitives";

const CONDITIONS: { value: ReturnCondition; label: string }[] = [
  { value: "good", label: "Good" },
  { value: "damaged", label: "Damaged" },
  { value: "missing", label: "Missing" },
];

export function ReturnConfirm({
  onConfirm,
  onCancel,
}: {
  onConfirm: (condition: ReturnCondition) => void;
  onCancel: () => void;
}) {
  const [condition, setCondition] = useState<ReturnCondition>("good");

  return (
    <div className="glass absolute right-0 z-20 mt-2 w-56 p-3 shadow-glow-soft">
      <p className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
        Return condition
      </p>
      <div className="mt-2 flex gap-1">
        {CONDITIONS.map((c) => (
          <button
            key={c.value}
            onClick={() => setCondition(c.value)}
            className={
              "flex-1 rounded-sm border px-2 py-1 text-[11px] transition-colors duration-200 " +
              (condition === c.value
                ? "border-gold/50 bg-gold/12 text-gold"
                : "border-border text-muted-foreground hover:text-foreground")
            }
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button className={goldButtonClass + " flex-1 px-2 py-1.5 text-xs"} onClick={() => onConfirm(condition)}>
          Confirm
        </button>
        <button className={ghostButtonClass} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
