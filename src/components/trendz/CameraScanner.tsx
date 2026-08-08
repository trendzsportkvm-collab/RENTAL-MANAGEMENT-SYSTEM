import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: any) => void;
  onClose: () => void;
}

export function CameraScanner({ onScan, onError, onClose }: CameraScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      (decodedText) => {
        // Stop scanning on success
        scanner.stop().then(() => {
          onScan(decodedText);
        });
      },
      (errorMessage) => {
        // html5-qrcode throws an error on every frame that doesn't contain a barcode.
        const msg = String(errorMessage);
        if (msg.includes("NotFoundException") || msg.includes("No MultiFormat Readers")) {
          return; // Ignore normal frame-by-frame scanning failures
        }
        if (onError) onError(errorMessage);
      }
    ).catch((err) => {
      console.error("Camera start failed:", err);
      // Let the parent know camera failed (e.g. no permissions)
      if (onError) onError(err);
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan, onError]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Scan Barcode</h3>
          <button 
            onClick={onClose}
            className="rounded-full bg-surface-2 p-2 hover:bg-surface-3 transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="overflow-hidden rounded-xl bg-black">
          <div id="reader" className="w-full"></div>
        </div>
        
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Point your camera at the barcode or QR code
        </p>
      </div>
    </div>
  );
}
