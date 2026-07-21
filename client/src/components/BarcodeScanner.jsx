import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function BarcodeScanner({ onScan, onClose }) {
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const containerRef = useRef(null);
  onScanRef.current = onScan;

  useEffect(() => {
    let stopped = false;
    let scanner = null;

    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      setError('Camera requires HTTPS. Use https:// or localhost.');
      return;
    }

    const start = async () => {
      try {
        scanner = new Html5Qrcode('barcode-reader');
        scannerRef.current = scanner;

        let cameraId = null;
        try {
          const cameras = await Html5Qrcode.getCameras();
          const back = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
          cameraId = back ? back.id : cameras[0]?.id;
        } catch {}

        const config = {
          fps: 15,
          qrbox: { width: 300, height: 150 },
          aspectRatio: 1.7777,
        };

        if (cameraId) {
          await scanner.start({ deviceId: cameraId }, config, handleScan, () => {});
        } else {
          await scanner.start({ facingMode: 'environment' }, config, handleScan, () => {});
        }
        if (!stopped) setReady(true);
      } catch (err) {
        console.warn('Scanner failed:', err);
        if (stopped) return;
        const msg = err.toString();
        if (msg.includes('NotAllowed') || msg.includes('Permission')) {
          setError('Camera permission denied. Allow camera access in your browser settings, or enter the barcode manually.');
        } else if (msg.includes('NotFound')) {
          setError('No camera found on this device.');
        } else if (msg.includes('NotReadable')) {
          setError('Camera is busy (maybe used by another app). Close other apps and try again.');
        } else {
          setError('Could not start camera. Enter the barcode manually.');
        }
      }
    };

    const handleScan = (decodedText) => {
      if (!stopped) {
        onScanRef.current(decodedText);
      }
    };

    start();

    return () => {
      stopped = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(15,23,42,0.05)] overflow-hidden mb-6 border border-surface-variant">
      <div className="relative" style={{ minHeight: '280px' }}>
        <div id="barcode-reader" className="w-full"></div>
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest z-10">
            <div className="text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl block mb-2">photo_camera</span>
              <p className="text-body-md font-body">Starting camera...</p>
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="p-4 text-error text-body-md font-body text-center flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </p>
      )}
      <div className="p-3 border-t border-surface-variant space-y-2">
        <p className="text-label-sm font-label-sm text-on-surface-variant text-center">Point the camera at a barcode</p>
        <button className="btn-base btn-outline w-full" onClick={onClose}>
          Close Scanner
        </button>
      </div>
    </div>
  );
}