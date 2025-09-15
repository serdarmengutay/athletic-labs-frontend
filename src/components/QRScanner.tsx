"use client";

import { useState } from "react";
import { X, Camera, AlertCircle } from "lucide-react";

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
              <div className="relative bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center w-full p-4">
                  <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">QR Kod Tarayıcı</p>
                  <p className="text-sm text-gray-500 mb-4">
                    QR kod verisini manuel olarak girin veya kamera ile tarayın
                  </p>

                  {/* Manual QR Data Input */}
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="QR kod verisini buraya yapıştırın..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          const value = (
                            e.target as HTMLInputElement
                          ).value.trim();
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
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      QR Verisini İşle
                    </button>
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
