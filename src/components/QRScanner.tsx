"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle, Keyboard, Loader2, X } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/library";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isOpen: boolean;
  title?: string;
  description?: string;
  manualLabel?: string;
  manualPlaceholder?: string;
  manualButtonLabel?: string;
}

interface BrowserError {
  name?: string;
  message?: string;
}

const getBrowserError = (error: unknown): BrowserError =>
  error instanceof Error ? error : {};

export default function QRScanner({
  onScan,
  onClose,
  isOpen,
  title = "QR Kod Tarayıcı",
  description = "QR kodu kameraya gösterin",
  manualLabel = "Kamera çalışmazsa QR bağlantısını manuel girin:",
  manualPlaceholder = "QR kod verisini veya URL'yi buraya yapıştırın...",
  manualButtonLabel = "QR Verisini İşle",
}: QRScannerProps) {
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [manualValue, setManualValue] = useState("");
  const [showManualFallback, setShowManualFallback] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleScan = useCallback(
    (data: string) => {
      const cleanData = data.trim();
      if (!cleanData) return;
      stopScanning();
      onScan(cleanData);
    },
    [onScan, stopScanning]
  );

  const startScanning = useCallback(
    async (deviceId: string) => {
      if (!deviceId) {
        setError("Kamera seçilemedi.");
        return;
      }

      try {
        setError("");
        setIsScanning(true);

        if (!videoRef.current) {
          throw new Error("Video alanı hazır değil. Lütfen tekrar deneyin.");
        }

        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result, scanError) => {
            if (result) {
              handleScan(result.getText());
            }
            if (scanError && scanError.name !== "NotFoundException") {
              setError("QR kod okunamadı. Kodu kameraya biraz daha net gösterin.");
            }
          }
        );
      } catch (err: unknown) {
        const browserError = getBrowserError(err);
        setError(
          "Kamera başlatılamadı. Tablet/telefonda kamera iznini verin; canlı ortamda sayfa HTTPS üzerinden açılmalı. " +
            (browserError.message || "")
        );
        setShowManualFallback(true);
        setIsScanning(false);
      }
    },
    [handleScan]
  );

  const prepareAndStartCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Bu tarayıcı kamera ile QR okumayı desteklemiyor.");
      setShowManualFallback(true);
      return;
    }

    setIsPreparing(true);
    setError("");
    stopScanning();

    try {
      const initialDevices = await navigator.mediaDevices.enumerateDevices();
      const initialVideoDevices = initialDevices.filter(
        (device) => device.kind === "videoinput"
      );

      const permissionStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      permissionStream.getTracks().forEach((track) => track.stop());

      const refreshedDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = refreshedDevices.filter(
        (device) => device.kind === "videoinput"
      );
      const availableDevices =
        videoDevices.length > 0 ? videoDevices : initialVideoDevices;

      if (availableDevices.length === 0) {
        throw new Error("Bu cihazda kamera bulunamadı.");
      }

      const rearCamera =
        availableDevices.find((device) =>
          /back|rear|environment|arka/i.test(device.label)
        ) || availableDevices[0];

      setDevices(availableDevices);
      setSelectedDevice(rearCamera.deviceId);
      requestAnimationFrame(() => startScanning(rearCamera.deviceId));
    } catch (err: unknown) {
      const browserError = getBrowserError(err);

      if (browserError.name === "NotAllowedError") {
        setError(
          "Kamera izni reddedildi. Tarayıcı adres çubuğundan kamera iznini açıp tekrar deneyin."
        );
      } else if (browserError.name === "NotFoundError") {
        setError("Bu cihazda kullanılabilir kamera bulunamadı.");
      } else if (browserError.name === "NotReadableError") {
        setError("Kamera başka bir uygulama tarafından kullanılıyor olabilir.");
      } else if (!window.isSecureContext) {
        setError(
          "Kamera erişimi için sayfa HTTPS veya localhost üzerinden açılmalı."
        );
      } else {
        setError(browserError.message || "Kamera erişimi başlatılamadı.");
      }
      setShowManualFallback(true);
    } finally {
      setIsPreparing(false);
    }
  }, [startScanning, stopScanning]);

  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      return;
    }

    setManualValue("");
    setShowManualFallback(false);
    prepareAndStartCamera();

    return () => {
      stopScanning();
    };
  }, [isOpen, prepareAndStartCamera, stopScanning]);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId);
    stopScanning();
    requestAnimationFrame(() => startScanning(deviceId));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0b1413] text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="QR tarayıcıyı kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="relative h-80 overflow-hidden rounded-xl border border-slate-700 bg-black">
            <video
              ref={videoRef}
              className={`h-full w-full object-cover ${
                isScanning ? "opacity-100" : "opacity-25"
              }`}
              autoPlay
              playsInline
              muted
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-48 w-48 rounded-2xl border-2 border-[#e4fc55]/90">
                <div className="absolute -left-1 -top-1 h-8 w-8 border-l-4 border-t-4 border-[#e4fc55]" />
                <div className="absolute -right-1 -top-1 h-8 w-8 border-r-4 border-t-4 border-[#e4fc55]" />
                <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-[#e4fc55]" />
                <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-[#e4fc55]" />
              </div>
            </div>
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 text-center">
                {isPreparing ? (
                  <Loader2 className="h-10 w-10 animate-spin text-[#e4fc55]" />
                ) : (
                  <Camera className="h-12 w-12 text-[#e4fc55]" />
                )}
                <p className="text-sm font-medium text-slate-100">
                  {isPreparing ? "Kamera açılıyor..." : "Kamera hazır değil"}
                </p>
              </div>
            )}
          </div>

          {devices.length > 1 && (
            <label className="block text-sm text-slate-300">
              Kamera
              <select
                value={selectedDevice}
                onChange={(event) => handleDeviceChange(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-[#e4fc55]"
              >
                {devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Kamera ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && (
            <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-amber-300" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={prepareAndStartCamera}
              disabled={isPreparing}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-[#e4fc55] hover:bg-white/10 disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              Kamerayı Tekrar Aç
            </button>
            <button
              type="button"
              onClick={() => setShowManualFallback((value) => !value)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
            >
              <Keyboard className="h-4 w-4" />
              Manuel URL
            </button>
          </div>

          {showManualFallback && (
            <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-sm text-slate-300">{manualLabel}</p>
              <input
                type="text"
                value={manualValue}
                placeholder={manualPlaceholder}
                onChange={(event) => setManualValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleScan(manualValue);
                  }
                }}
                className="w-full rounded-lg border border-slate-700 bg-[#07100f] px-3 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#e4fc55]"
              />
              <button
                type="button"
                onClick={() => handleScan(manualValue)}
                disabled={!manualValue.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#e4fc55] px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                <CheckCircle className="h-4 w-4" />
                {manualButtonLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
