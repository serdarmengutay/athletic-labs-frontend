"use client";

import { useState, useRef } from "react";
import { QrScanner } from "@yudiel/react-qr-scanner";
import { X, Camera, AlertCircle, CheckCircle } from "lucide-react";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function QRScanner({ onScan, onClose, isOpen }: QRScannerProps) {
  const [error, setError] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = (result: string) => {
    if (result) {
      setIsScanning(false);
      onScan(result);
    }
  };

  const handleError = (error: Error) => {
    setError(error.message);
    setIsScanning(false);
  };

  const startScanning = () => {
    setError("");
    setIsScanning(true);
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
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4">
          {!isScanning ? (
            <div className="text-center py-8">
              <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                QR Kod Taramaya Hazır
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Sporcu QR kodunu kameraya gösterin
              </p>
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
              <div className="relative">
                <QrScanner
                  onDecode={handleScan}
                  onError={handleError}
                  containerStyle={{
                    width: "100%",
                    height: "300px",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                />
                <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                  <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-blue-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-blue-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-blue-500 rounded-br-lg"></div>
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
                <p className="text-sm text-gray-600">
                  QR kodu kameraya doğru tutun
                </p>
                <button
                  onClick={() => setIsScanning(false)}
                  className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  İptal Et
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
