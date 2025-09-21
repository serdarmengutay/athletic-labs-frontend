"use client";

import { useState, useRef, useEffect } from "react";
import { X, Camera, AlertCircle, CheckCircle } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/library";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function QRScanner({ onScan, onClose, isOpen }: QRScannerProps) {
  const [error, setError] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkCameraAvailability();
    }
    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const checkCameraAvailability = async () => {
    try {
      console.log("Kamera kontrolü başlatılıyor...");

      // Önce cihazları listele (izin olmadan)
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log("Tüm cihazlar:", devices);

      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      console.log("Video cihazları:", videoDevices);

      if (videoDevices.length === 0) {
        setHasCamera(false);
        setError("Kamera bulunamadı");
        return;
      }

      // Kamera iznini iste
      console.log("Kamera izni isteniyor...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: videoDevices[0].deviceId,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      console.log("Kamera stream alındı:", stream);

      // Stream'i kapat
      stream.getTracks().forEach((track) => {
        console.log("Track kapatılıyor:", track.label);
        track.stop();
      });

      setDevices(videoDevices);
      setHasCamera(true);
      setSelectedDevice(videoDevices[0].deviceId);
      console.log("Kamera başarıyla ayarlandı:", videoDevices[0].label);
    } catch (err: any) {
      console.error("Kamera kontrolü hatası:", err);
      setHasCamera(false);

      if (err.name === "NotAllowedError") {
        setError(
          "Kamera erişimi reddedildi. Lütfen tarayıcı ayarlarından kamera iznini verin."
        );
      } else if (err.name === "NotFoundError") {
        setError("Kamera bulunamadı. Bu cihazda kamera yok.");
      } else if (err.name === "NotSupportedError") {
        setError("Bu tarayıcı kamera özelliğini desteklemiyor.");
      } else if (err.name === "NotReadableError") {
        setError(
          "Kamera kullanımda. Başka bir uygulama kamera kullanıyor olabilir."
        );
      } else {
        setError("Kamera erişimi hatası: " + err.message);
      }
    }
  };

  const startScanning = async () => {
    if (!hasCamera || !selectedDevice) {
      setError("Kamera seçilmedi");
      return;
    }

    try {
      setError("");
      setIsScanning(true);

      console.log("QR tarama başlatılıyor...");
      console.log("Seçilen cihaz:", selectedDevice);

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // Video element'ini kontrol et
      if (!videoRef.current) {
        throw new Error("Video element bulunamadı");
      }

      console.log("Video element bulundu, kamera başlatılıyor...");

      // ZXing reader'ı yapılandır
      const hints = new Map();
      hints.set(2, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]); // Barcode formats

      const result = await reader.decodeFromVideoDevice(
        selectedDevice,
        videoRef.current,
        (result, error) => {
          if (result) {
            console.log("QR kod okundu:", result.getText());
            handleScan(result.getText());
          }
          if (error && error.name !== "NotFoundException") {
            console.error("QR tarama hatası:", error);
            setError("QR kod okunamadı: " + error.message);
          }
        }
      );

      console.log("QR tarama başarıyla başlatıldı");
    } catch (err: any) {
      console.error("Kamera başlatma hatası:", err);
      setError("Kamera başlatılamadı: " + err.message);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScan = (data: string) => {
    if (data) {
      stopScanning();
      onScan(data);
    }
  };

  const handleError = (error: Error) => {
    setError(error.message);
    setIsScanning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            QR Kod Tarayıcı
          </h2>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4">
          {!hasCamera ? (
            <div className="text-center py-8">
              <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Kamera Bulunamadı
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {error || "Bu cihazda kamera bulunamadı veya erişim reddedildi"}
              </p>
              <button
                onClick={checkCameraAvailability}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Tekrar Dene
              </button>
            </div>
          ) : !isScanning ? (
            <div className="text-center py-8">
              <Camera className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                QR Kod Taramaya Hazır
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Sporcu QR kodunu kameraya gösterin
              </p>

              {devices.length > 1 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kamera Seçin:
                  </label>
                  <select
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label ||
                          `Kamera ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={startScanning}
                className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
              >
                <Camera className="h-5 w-5" />
                <span>Tarayıcıyı Başlat</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg h-64 overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white border-dashed w-48 h-48 rounded-lg flex items-center justify-center">
                    <Camera className="h-12 w-12 text-white opacity-50" />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                </div>
              )}

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  QR kodu kameraya doğru tutun
                </p>
                <button
                  onClick={stopScanning}
                  className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                >
                  Taramayı Durdur
                </button>
              </div>
            </div>
          )}

          {/* Manuel QR Data Input - Fallback */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3 text-center">
              Veya QR kod verisini manuel olarak girin:
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="QR kod verisini buraya yapıştırın..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    const value = (e.target as HTMLInputElement).value.trim();
                    if (value) {
                      handleScan(value);
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector(
                    'input[type="text"]'
                  ) as HTMLInputElement;
                  if (input && input.value.trim()) {
                    handleScan(input.value.trim());
                  }
                }}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>QR Verisini İşle</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
