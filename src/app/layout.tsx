import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "@/styles.css";

export const metadata: Metadata = {
  title: "Trendz — Rental Management",
  description: "Trendz internal rental management panel for premium clothing rentals across Kerala branches.",
  authors: [{ name: "Trendz" }],
  openGraph: {
    title: "Trendz — Rental Management",
    description: "Internal panel for tracking clothing rentals, stock and payments.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        {children}
        <Toaster position="top-right" duration={3000} />
      </body>
    </html>
  );
}
