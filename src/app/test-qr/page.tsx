"use client";

import { useState } from "react";
import QRScanner from "@/components/QRScanner";

export default function TestQRPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState<string>("");

  const handleScan = (data: string) => {
    console.log("QR kod okundu:", data);
    setScannedData(data);
    setShowScanner(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          QR Kamera Test Sayfası
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Butonları</h2>
          <div className="space-y-4">
            <button
              onClick={() => setShowScanner(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              QR Tarayıcıyı Aç
            </button>

            <button
              onClick={() => {
                // Test QR verisi
                handleScan(
                  JSON.stringify({
                    athlete_id: "test-123",
                    first_name: "Test",
                    last_name: "Sporcu",
                    birth_date: "2000-01-01",
                    club_name: "Test Kulübü",
                  })
                );
              }}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
              Test QR Verisi Gönder
            </button>
          </div>
        </div>

        {scannedData && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Okunan QR Verisi</h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
              {scannedData}
            </pre>
            <button
              onClick={() => setScannedData("")}
              className="mt-4 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Temizle
            </button>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">
            Kamera Test Talimatları:
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>1. "QR Tarayıcıyı Aç" butonuna tıklayın</li>
            <li>2. Tarayıcı kamera izni isteyecek - "İzin Ver" deyin</li>
            <li>3. Kamera açılırsa QR kod tarama çalışıyor demektir</li>
            <li>
              4. Kamera açılmazsa console'da hata mesajlarını kontrol edin
            </li>
            <li>5. "Test QR Verisi Gönder" ile manuel test yapabilirsiniz</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <h3 className="font-semibold text-blue-800 mb-2">
            Mac Kamera İpuçları:
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Safari veya Chrome kullanın (Firefox'ta sorun olabilir)</li>
            <li>• HTTPS gerekiyor - localhost:3000 kullanın</li>
            <li>
              • Sistem Tercihleri {">"} Güvenlik {">"} Kamera iznini kontrol
              edin
            </li>
            <li>• Tarayıcı ayarlarından kamera iznini sıfırlayın</li>
          </ul>
        </div>
      </div>

      {showScanner && (
        <QRScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleScan}
        />
      )}
    </div>
  );
}
