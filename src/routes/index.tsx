import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sidebar, type PageKey } from "@/components/trendz/Sidebar";
import { RentalFormModal } from "@/components/trendz/RentalFormModal";
import { WhatsAppModal } from "@/components/trendz/WhatsAppModal";
import { RentalStatusModal } from "@/components/trendz/RentalStatusModal";
import { EditRentalModal } from "@/components/trendz/EditRentalModal";
import { ScanLookup } from "@/components/trendz/pages/ScanLookup";
import { AllProducts } from "@/components/trendz/pages/AllProducts";
import { RentalsDashboard } from "@/components/trendz/pages/RentalsDashboard";
import { FinancialLedger } from "@/components/trendz/pages/FinancialLedger";
import { CsvImport } from "@/components/trendz/pages/CsvImport";
import { TrendzProvider } from "@/lib/trendz/store";
import type { Product, Rental } from "@/lib/trendz/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trendz Rental Studio — Staff Panel" },
      {
        name: "description",
        content:
          "Trendz staff panel: scan SKUs, track branch stock, manage active rentals, returns and the financial ledger.",
      },
      { property: "og:title", content: "Trendz Rental Studio — Staff Panel" },
      {
        property: "og:description",
        content: "Premium clothing rental management for Trendz, Wayanad, Kerala.",
      },
    ],
  }),
  component: () => (
    <TrendzProvider>
      <TrendzApp />
    </TrendzProvider>
  ),
});

function TrendzApp() {
  const [page, setPage] = useState<PageKey>("scan");
  const [rentalProduct, setRentalProduct] = useState<Product | null>(null);
  const [confirmed, setConfirmed] = useState<Rental | null>(null);
  const [statusProduct, setStatusProduct] = useState<Product | null>(null);
  const [editing, setEditing] = useState<Rental | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar active={page} onChange={setPage} />
      <main className="ml-60 px-8 py-10">
        {page === "scan" ? <ScanLookup onPutOut={(p) => setRentalProduct(p)} /> : null}
        {page === "products" ? <AllProducts onOpen={setStatusProduct} /> : null}
        {page === "rentals" ? <RentalsDashboard onEdit={setEditing} /> : null}
        {page === "ledger" ? <FinancialLedger /> : null}
        {page === "import" ? <CsvImport /> : null}
      </main>

      <RentalFormModal
        open={!!rentalProduct}
        product={rentalProduct}
        onClose={() => setRentalProduct(null)}
        onCreated={(r) => {
          setRentalProduct(null);
          setConfirmed(r);
        }}
      />
      <WhatsAppModal rental={confirmed} onClose={() => setConfirmed(null)} />
      <RentalStatusModal
        product={statusProduct}
        onClose={() => setStatusProduct(null)}
        onPutOut={(p) => setRentalProduct(p)}
        onEdit={setEditing}
      />
      <EditRentalModal rental={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
