"use client";

import { useState, useEffect } from "react";
import {
  QrCode,
  CheckCircle,
  ArrowRight,
  Save,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { Athlete, TestStation, Coach } from "@/types";
import { TEST_STATIONS } from "@/lib/testStations";
import { authApi, stationApi, qrApi } from "@/lib/api";
import QRScanner from "@/components/QRScanner";

export default function StationPage() {
  const [currentCoach, setCurrentCoach] = useState<Coach | null>(null);
  const [currentStation, setCurrentStation] = useState<TestStation | null>(
    null
  );
  const [currentAthlete, setCurrentAthlete] = useState<Athlete | null>(null);
  const [testValue, setTestValue] = useState<string>("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [recentTests, setRecentTests] = useState<Array<{
    id: string;
    athlete: Athlete;
    station: TestStation;
    value: number;
    timestamp: string;
  }>>([]);
  const [stationQueue, setStationQueue] = useState<Athlete[]>([]);
  const [currentSession, setCurrentSession] = useState<{
    id: string;
    name: string;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Hoca girişi ve istasyon yükleme
  useEffect(() => {
    const initializeStation = async () => {
      try {
        setLoading(true);

        // Hoca profilini al
        const profileResponse = await authApi.getProfile();
        setCurrentCoach(profileResponse.data.data);

        // İstasyon bilgisini al (URL'den veya localStorage'dan)
        const stationId =
          new URLSearchParams(window.location.search).get("station") ||
          "ffmi-station";
        const station = TEST_STATIONS.find((s) => s.id === stationId);
        setCurrentStation(station || TEST_STATIONS[0]);

        // Aktif test oturumunu al
        const sessionId = localStorage.getItem("currentSessionId");
        if (sessionId) {
          const sessionResponse = await stationApi.getSessionStatus(sessionId);
          setCurrentSession(sessionResponse.data.data);

          // Sırayı yükle
          const queueResponse = await stationApi.getQueue(stationId, sessionId);
          setStationQueue(queueResponse.data.data);
        }
      } catch (err) {
        setError("İstasyon yüklenirken hata oluştu. Lütfen giriş yapın.");
        console.error("Station initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeStation();
  }, []);

  const handleQRScan = () => {
    setShowQRScanner(true);
  };

  const handleQRData = async (qrData: string) => {
    try {
      setError("");

      // QR verisini doğrula
      const validationResponse = await qrApi.validateQR(qrData);
      const athleteData = validationResponse.data.data;

      if (athleteData) {
        setCurrentAthlete(athleteData);
        setTestValue("");
        setShowQRScanner(false);
      } else {
        setError("Geçersiz QR kod. Lütfen sporcu QR kodunu kullanın.");
      }
    } catch (err) {
      setError("QR kod okunamadı. Lütfen tekrar deneyin.");
      console.error("QR validation error:", err);
    }
  };

  const handleNextAthlete = () => {
    if (stationQueue.length > 0) {
      const nextAthlete = stationQueue[0];
      setCurrentAthlete(nextAthlete);
      setStationQueue((prev) => prev.slice(1));
      setTestValue("");
    } else {
      setCurrentAthlete(null);
    }
  };

  const handleValueSubmit = async () => {
    if (!currentAthlete || !currentStation || !testValue || !currentSession) {
      alert("Lütfen tüm alanları doldurun!");
      return;
    }

    try {
      setError("");

      // Test değerini API'ye gönder
      await stationApi.submitTest({
        athlete_id: currentAthlete.id,
        station_id: currentStation.id,
        value: parseFloat(testValue),
        session_id: currentSession.id,
      });

      // Yerel state'i güncelle
      const newTest = {
        id: `test-${Date.now()}`,
        athlete: currentAthlete,
        station: currentStation,
        value: parseFloat(testValue),
        timestamp: new Date().toISOString(),
      };

      setRecentTests((prev) => [newTest, ...prev.slice(0, 4)]);

      // Sıradaki sporcuya geç
      handleNextAthlete();

      alert("Test değeri başarıyla kaydedildi!");
    } catch (err) {
      setError("Test değeri kaydedilemedi. Lütfen tekrar deneyin.");
      console.error("Test submission error:", err);
    }
  };

  const handleLogout = async () => {
    if (confirm("Çıkış yapmak istediğinizden emin misiniz?")) {
      try {
        await authApi.logout();
      } catch (err) {
        console.error("Logout error:", err);
      } finally {
        localStorage.removeItem("authToken");
        localStorage.removeItem("currentSessionId");
        window.location.href = "/";
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !currentCoach) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Giriş Gerekli
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-2xl">{currentStation?.icon}</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {currentStation?.name} İstasyonu
                </h1>
                <p className="text-sm text-gray-600">
                  {currentCoach?.name} • {stationQueue.length} sporcu sırada
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600"
            >
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ana Panel - Test Girişi */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sporcu Tarama */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Sporcu Tarama
              </h2>

              {!currentAthlete ? (
                <div className="text-center py-8">
                  <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <button
                    onClick={handleQRScan}
                    className="bg-blue-600 text-white py-4 px-8 rounded-lg hover:bg-blue-700 flex items-center space-x-3 mx-auto text-lg"
                  >
                    <QrCode className="h-6 w-6" />
                    <span>QR Kodu Tara</span>
                  </button>
                  <p className="text-sm text-gray-500 mt-3">
                    Sporcu QR kodunu tarayın veya sıradaki sporcuya geçin
                  </p>
                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span className="text-red-700 text-sm">{error}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <div>
                        <h3 className="font-medium text-green-900 text-lg">
                          {currentAthlete.first_name} {currentAthlete.last_name}
                        </h3>
                        <p className="text-sm text-green-700">
                          {currentAthlete.uuid} •{" "}
                          {new Date().getFullYear() -
                            new Date(
                              currentAthlete.birth_date
                            ).getFullYear()}{" "}
                          yaş
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentAthlete(null)}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      Değiştir
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Test Değeri Girişi */}
            {currentAthlete && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Test Değeri Girişi
                </h2>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">
                      {currentStation?.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {currentStation?.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Birim: {currentStation?.unit}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Değer ({currentStation?.unit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={testValue}
                      onChange={(e) => setTestValue(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      placeholder={`Değer girin (${currentStation?.unit})`}
                      autoFocus
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleValueSubmit}
                      className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 text-lg"
                    >
                      <Save className="h-5 w-5" />
                      <span>Kaydet ve Devam Et</span>
                    </button>
                    <button
                      onClick={handleNextAthlete}
                      className="bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <ArrowRight className="h-5 w-5" />
                      <span>Sıradaki</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Yan Panel - Sıra ve Geçmiş */}
          <div className="space-y-6">
            {/* Sıra Durumu */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Sıra Durumu
              </h3>

              {stationQueue.length === 0 ? (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Sırada sporcu yok</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stationQueue.slice(0, 5).map((athlete, index) => (
                    <div
                      key={athlete.id}
                      className={`p-3 rounded-lg border ${
                        index === 0
                          ? "bg-blue-50 border-blue-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {athlete.first_name} {athlete.last_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {athlete.uuid}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          #{index + 1}
                        </div>
                      </div>
                    </div>
                  ))}
                  {stationQueue.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">
                      ... ve {stationQueue.length - 5} sporcu daha
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Son Testler */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Son Testler
              </h3>

              {recentTests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Henüz test yapılmamış
                </p>
              ) : (
                <div className="space-y-3">
                  {recentTests.map((test) => (
                    <div
                      key={test.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {test.athlete.first_name} {test.athlete.last_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {test.value} {test.station.unit}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(test.timestamp).toLocaleTimeString("tr-TR")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* İstatistikler */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Bugünkü İstatistikler
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {recentTests.length}
                  </p>
                  <p className="text-sm text-gray-600">Toplam Test</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {stationQueue.length}
                  </p>
                  <p className="text-sm text-gray-600">Sırada</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRData}
      />
    </div>
  );
}
