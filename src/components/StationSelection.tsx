"use client";

import React, { useState, useEffect } from "react";
import { TestStationData, StationCoach } from "@/types";
import { stationApi } from "@/lib/api";
import StationQRScanner from "./StationQRScanner";

interface StationSelectionProps {
  onBack: () => void;
}

const StationSelection: React.FC<StationSelectionProps> = ({ onBack }) => {
  const [stations, setStations] = useState<TestStationData[]>([]);
  const [selectedStation, setSelectedStation] =
    useState<TestStationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    setLoading(true);
    try {
      // Örnek istasyon verileri - gerçek uygulamada API'den gelecek
      const mockStations: TestStationData[] = [
        {
          id: "ffmi-station",
          name: "Boy-Kilo-FFMI-Esneklik İstasyonu",
          type: "ffmi",
          description:
            "Sporcunun boy, kilo, FFMI ve esneklik ölçümlerini yapın",
          required_coaches: 2,
          unit: "cm/kg",
          icon: "📏",
          fields: [
            {
              id: "height",
              name: "Boy",
              type: "number",
              unit: "cm",
              required: true,
              min: 100,
              max: 250,
            },
            {
              id: "weight",
              name: "Kilo",
              type: "number",
              unit: "kg",
              required: true,
              min: 30,
              max: 200,
            },
            {
              id: "ffmi",
              name: "FFMI",
              type: "number",
              unit: "kg/m²",
              required: true,
              min: 10,
              max: 30,
            },
            {
              id: "flexibility",
              name: "Esneklik",
              type: "number",
              unit: "cm",
              required: true,
              min: 0,
              max: 50,
            },
          ],
        },
        {
          id: "sprint-30m-station",
          name: "30 Metre Koşu İstasyonu",
          type: "sprint_30m",
          description: "Sporcunun 30 metre koşu sürelerini ölçün",
          required_coaches: 1,
          unit: "saniye",
          icon: "🏃",
          fields: [
            {
              id: "sprint_30m_first",
              name: "1. 30m Koşu",
              type: "number",
              unit: "saniye",
              required: true,
              min: 3,
              max: 10,
            },
            {
              id: "sprint_30m_second",
              name: "2. 30m Koşu",
              type: "number",
              unit: "saniye",
              required: true,
              min: 3,
              max: 10,
            },
          ],
        },
        {
          id: "agility-station",
          name: "Çeviklik İstasyonu",
          type: "agility",
          description: "Sporcunun çeviklik testini yapın",
          required_coaches: 1,
          unit: "saniye",
          icon: "🔄",
          fields: [
            {
              id: "agility",
              name: "Çeviklik Süresi",
              type: "number",
              unit: "saniye",
              required: true,
              min: 5,
              max: 30,
            },
          ],
        },
        {
          id: "vertical-jump-station",
          name: "Dikey Sıçrama İstasyonu",
          type: "vertical_jump",
          description: "Sporcunun dikey sıçrama yüksekliğini ölçün",
          required_coaches: 1,
          unit: "cm",
          icon: "⬆️",
          fields: [
            {
              id: "vertical_jump",
              name: "Dikey Sıçrama",
              type: "number",
              unit: "cm",
              required: true,
              min: 10,
              max: 100,
            },
          ],
        },
      ];

      setStations(mockStations);
    } catch (error) {
      console.error("İstasyonlar yüklenirken hata:", error);
      setError("İstasyonlar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleStationSelect = (station: TestStationData) => {
    setSelectedStation(station);
  };

  const handleBack = () => {
    setSelectedStation(null);
    onBack();
  };

  if (selectedStation) {
    return (
      <StationQRScanner
        stationId={selectedStation.id}
        stationName={selectedStation.name}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Test İstasyonu Seçin
              </h1>
              <p className="text-gray-600 mt-2">
                Hangi istasyonda görev yapıyorsunuz?
              </p>
            </div>
            <button
              onClick={onBack}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Geri Dön
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-gray-600">
              İstasyonlar yükleniyor...
            </span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadStations}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Tekrar Dene
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stations.map((station) => (
              <div
                key={station.id}
                onClick={() => handleStationSelect(station)}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-6 border-2 border-transparent hover:border-blue-500"
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">{station.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {station.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {station.description}
                  </p>

                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Gerekli Hoca:</span>
                      <span className="font-medium">
                        {station.required_coaches} kişi
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Birim:</span>
                      <span className="font-medium">{station.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Test Sayısı:</span>
                      <span className="font-medium">
                        {station.fields.length} adet
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      İstasyonu Aç
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">
            İstasyon Kullanım Talimatları
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-700 mb-2">
                Genel Kurallar:
              </h4>
              <ul className="text-sm text-blue-600 space-y-1 list-disc list-inside">
                <li>İstasyonunuzu seçin ve QR okutma ekranına geçin</li>
                <li>Sporcu QR kodunu kameraya tutun</li>
                <li>Test verilerini girin ve kaydedin</li>
                <li>Bir sonraki sporcu için QR okutma ekranına dönün</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Önemli Notlar:</h4>
              <ul className="text-sm text-blue-600 space-y-1 list-disc list-inside">
                <li>QR kod okutma sırası önemli değil</li>
                <li>Her sporcu için tüm testleri tamamlayın</li>
                <li>Veri girişi sırasında dikkatli olun</li>
                <li>Hata durumunda geri dönüp tekrar deneyin</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationSelection;
