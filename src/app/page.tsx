"use client";

import { useState } from "react";
import { Sidebar, type PageKey } from "@/components/trendz/Sidebar";
import { RentalFormModal } from "@/components/trendz/RentalFormModal";
import { WhatsAppModal } from "@/components/trendz/WhatsAppModal";
import { RentalStatusModal } from "@/components/trendz/RentalStatusModal";
import { EditRentalModal } from "@/components/trendz/EditRentalModal";
import { ScanLookup } from "@/components/trendz/pages/ScanLookup";
import { AllProducts } from "@/components/trendz/pages/AllProducts";
import { AllRentals } from "@/components/trendz/pages/AllRentals";
import { Dashboard } from "@/components/trendz/pages/Dashboard";
import { CsvImport } from "@/components/trendz/pages/CsvImport";
import { StockLocations } from "@/components/trendz/pages/StockLocations";
import { AddProduct } from "@/components/trendz/pages/AddProduct";
import { TrendzProvider } from "@/lib/trendz/store";
import type { Product, Rental } from "@/lib/trendz/types";
import { Menu } from "lucide-react";

function TrendzApp() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [rentalProduct, setRentalProduct] = useState<Product | null>(null);
  const [confirmed, setConfirmed] = useState<Rental | null>(null);
  const [statusProduct, setStatusProduct] = useState<Product | null>(null);
  const [editing, setEditing] = useState<Rental | null>(null);
  
  const [productToEditId, setProductToEditId] = useState<string | null>(null);

  const handlePageChange = (p: PageKey) => {
    setPage(p);
    if (p === "add-product") {
      setProductToEditId(null);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-surface border-b border-border z-20 flex items-center px-4">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -ml-2 text-foreground hover:bg-black/5 rounded-md"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="ml-2 font-display font-semibold text-lg">Trendz</span>
      </div>

      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 z-30 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <Sidebar 
        active={page} 
        onChange={handlePageChange} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <main className="md:ml-64 px-4 md:px-8 py-6 md:py-10 pt-20 md:pt-10">
        {page === "dashboard" ? <Dashboard onEdit={setEditing} /> : null}
        {page === "scan" ? <ScanLookup onPutOut={(p) => setRentalProduct(p)} /> : null}
        {page === "rentals" ? <AllRentals onOpen={setStatusProduct} /> : null}
        {page === "products" ? (
          <AllProducts 
            onOpen={setStatusProduct} 
            onEdit={(id) => {
              setProductToEditId(id);
              setPage("add-product");
            }}
          />
        ) : null}
        {page === "stock" ? <StockLocations /> : null}
        {page === "import" ? <CsvImport /> : null}
        {page === "add-product" ? (
          <AddProduct 
            productToEditId={productToEditId} 
            onClose={() => setPage("products")} 
          />
        ) : null}
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

export default function Page() {
  return (
    <TrendzProvider>
      <TrendzApp />
    </TrendzProvider>
  );
}
