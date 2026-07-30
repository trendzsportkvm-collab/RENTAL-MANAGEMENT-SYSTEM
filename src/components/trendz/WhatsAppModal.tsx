import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Rental } from "@/lib/trendz/types";
import { balanceOf, inr, waLink, waMessage } from "@/lib/trendz/utils";
import { goldButtonClass, ghostButtonClass } from "./primitives";

export function WhatsAppModal({
  rental,
  onClose,
}: {
  rental: Rental | null;
  onClose: () => void;
}) {
  if (!rental) return null;
  const message = waMessage(rental);
  const phone = rental.customerPhone;

  return (
    <Dialog open={!!rental} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong sm:max-w-md">
        <div className="text-center">
          <p className="text-[11px] tracking-[0.2em] text-emerald uppercase">
            Rental confirmed
          </p>
          <div className="mt-4 inline-flex items-center justify-center rounded-lg border border-gold/40 bg-gold/10 px-5 py-3 shadow-glow-gold">
            <span className="font-mono text-2xl font-semibold tracking-tight text-gold">
              {rental.token}
            </span>
          </div>
          <h2 className="mt-4 font-display text-xl font-semibold">{rental.customerName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {rental.productName} · {rental.branch} · Balance {inr(balanceOf(rental))}
          </p>
        </div>

        <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-border bg-white/[0.03] p-3 text-xs whitespace-pre-line text-muted-foreground">
          {message}
        </div>

        <div className="mt-4 grid gap-2">
          <a
            className={goldButtonClass}
            href={waLink(phone, message, true)}
            target="_blank"
            rel="noreferrer"
          >
            Send via WhatsApp App
          </a>
          <a
            className={ghostButtonClass + " py-2 text-sm"}
            href={waLink(phone, message)}
            target="_blank"
            rel="noreferrer"
          >
            Send via WhatsApp Web
          </a>
          <button
            onClick={onClose}
            className="mt-1 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Skip for now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
