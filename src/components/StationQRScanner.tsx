"use client";

import React, { useState, useEffect } from "react";
import { QrScanner } from "@yudiel/react-qr-scanner";
import { Athlete, TestStationData } from "@/types";
import { stationApi, athleteApi } from "@/lib/api";
import StationDataEntry from "./StationDataEntry";

interface StationQRScannerProps {
  stationId: string;
  stationName: string;
  onBack: () => void;
}

const StationQRScanner: React.FC<StationQRScannerProps> = ({
  stationId,
  stationName,
  onBack,
}) => {
  const [isScanning, setIsScanning] = useState(true);
  const [scannedAthlete, setScannedAthlete] = useState<Athlete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showDataEntry, setShowDataEntry] = useState(false);

  const handleScan = async (result: string) => {
    if (!result || isLoading) return;

    setIsLoading(true);
    setError("");
    setIsScanning(false);

    try {
      // QR kod verisini parse et
      const qrData = JSON.parse(result);

      if (!qrData.athlete_id) {
        throw new Error("Geçersiz QR kod formatı");
      }

      // Sporcu verilerini getir
      const response = await athleteApi.getById(qrData.athlete_id);
      const athlete = response.data.data;

      setScannedAthlete(athlete);
      setShowDataEntry(true);
    } catch (error) {
      console.error("QR kod okunurken hata:", error);
      setError("QR kod okunamadı. Lütfen tekrar deneyin.");
      setIsScanning(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataSubmit = (data: Record<string, number>) => {
    console.log("Veri gönderildi:", data);
    // Veri gönderildikten sonra QR okutma ekranına dön
    setShowDataEntry(false);
    setScannedAthlete(null);
    setIsScanning(true);
    setError("");
  };

  const handleCancel = () => {
    setShowDataEntry(false);
    setScannedAthlete(null);
    setIsScanning(true);
    setError("");
  };

  const handleBack = () => {
    setShowDataEntry(false);
    setScannedAthlete(null);
    setIsScanning(true);
    setError("");
    onBack();
  };

  if (showDataEntry && scannedAthlete) {
    return (
      <StationDataEntry
        stationId={stationId}
        stationName={stationName}
        athlete={scannedAthlete}
        onDataSubmit={handleDataSubmit}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {stationName} - QR Okutma
              </h1>
              <p className="text-gray-600">Sporcu QR kodunu kameraya tutun</p>
            </div>
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Geri Dön
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {isScanning ? (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* QR Scanner */}
              <div className="relative">
                <QrScanner
                  onDecode={handleScan}
                  onError={(error) => {
                    console.error("QR Scanner Error:", error);
                    setError("Kamera erişiminde hata oluştu");
                  }}
                  constraints={{
                    facingMode: "environment", // Arka kamera
                  }}
                  containerStyle={{
                    width: "100%",
                    height: "400px",
                  }}
                />

                {/* Scanning Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-blue-500 rounded-lg bg-transparent">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">📱</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    QR Kodu Okutun
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Sporcu QR kodunu kameraya tutun. QR kod otomatik olarak
                    okunacaktır.
                  </p>

                  {isLoading && (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      <span className="ml-2 text-gray-600">
                        QR kod okunuyor...
                      </span>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                      <p className="text-red-800 text-sm">{error}</p>
                      <button
                        onClick={() => {
                          setError("");
                          setIsScanning(true);
                        }}
                        className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                      >
                        Tekrar Dene
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">QR kod işleniyor...</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Instructions */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <span>QR kodu kameraya tutun</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <span>Sporcu bilgileri otomatik yüklenecek</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <span>Test verilerini girin ve kaydedin</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationQRScanner;
