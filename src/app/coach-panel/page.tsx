"use client";

import { useState, useEffect } from "react";
import {
  User,
  Clock,
  CheckCircle,
  Save,
  ArrowLeft,
  QrCode,
  Camera,
} from "lucide-react";
import { Athlete, TestStation, TestSessionStatus, Coach } from "@/types";
import { TEST_STATIONS } from "@/lib/testStations";

export default function CoachPanel() {
  const [currentCoach, setCurrentCoach] = useState<Coach | null>(null);
  const [currentStation, setCurrentStation] = useState<TestStation | null>(
    null
  );
  const [currentAthlete, setCurrentAthlete] = useState<Athlete | null>(null);
  const [testValue, setTestValue] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [recentTests, setRecentTests] = useState<TestSessionStatus[]>([]);

  // Mock data - gerçek uygulamada API'den gelecek
  useEffect(() => {
    // Mock coach data
    setCurrentCoach({
      id: "coach-1",
      name: "Ahmet Yılmaz",
      email: "ahmet@example.com",
      role: "station_coach",
      assigned_stations: ["ffmi-station", "sprint-30m-station"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Mock station data
    setCurrentStation(TEST_STATIONS[0]); // FFMI station

    // Mock recent tests
    setRecentTests([
      {
        id: "test-1",
        test_session_id: "session-1",
        athlete_id: "athlete-1",
        station_id: "ffmi-station",
        status: "completed",
        value: 25.5,
        coach_id: "coach-1",
        completed_at: new Date().toISOString(),
        notes: "İyi performans",
      },
    ]);
  }, []);

  const handleQRScan = () => {
    setIsScanning(true);
    // QR kod tarama simülasyonu
    setTimeout(() => {
      // Mock athlete data
      setCurrentAthlete({
        id: "athlete-1",
        uuid: "ATH001",
        first_name: "Mehmet",
        last_name: "Kaya",
        birth_date: "2000-01-01",
        height: 180,
        weight: 75,
        bmi: 23.1,
        club_id: "club-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setIsScanning(false);
    }, 2000);
  };

  const handleValueSubmit = () => {
    if (!currentAthlete || !currentStation || !testValue) {
      alert("Lütfen tüm alanları doldurun!");
      return;
    }

    const newTest: TestSessionStatus = {
      id: `test-${Date.now()}`,
      test_session_id: "session-1",
      athlete_id: currentAthlete.id,
      station_id: currentStation.id,
      status: "completed",
      value: parseFloat(testValue),
      coach_id: currentCoach?.id,
      completed_at: new Date().toISOString(),
      notes: notes || undefined,
    };

    setRecentTests((prev) => [newTest, ...prev]);

    // Reset form
    setCurrentAthlete(null);
    setTestValue("");
    setNotes("");

    alert("Test değeri başarıyla kaydedildi!");
  };

  const getStationIcon = (stationType: string) => {
    const station = TEST_STATIONS.find((s) => s.type === stationType);
    return station?.icon || "📊";
  };

  const getStationName = (stationType: string) => {
    const station = TEST_STATIONS.find((s) => s.type === stationType);
    return station?.name || "Bilinmeyen İstasyon";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Antrenör Paneli
                </h1>
                <p className="text-gray-600">
                  {currentCoach?.name} - {currentStation?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{new Date().toLocaleTimeString("tr-TR")}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-8">
          {/* Sol Panel - Test Girişi */}
          <div className="space-y-6">
            {/* Sporcu Tarama */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Sporcu Tarama
              </h2>

              {!currentAthlete ? (
                <div className="text-center">
                  <div className="mb-4">
                    <QrCode className="h-16 w-16 text-gray-400 mx-auto" />
                  </div>
                  <button
                    onClick={handleQRScan}
                    disabled={isScanning}
                    className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
                  >
                    {isScanning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Taranıyor...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        <span>QR Kodu Tara</span>
                      </>
                    )}
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Sporcu QR kodunu tarayın
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="font-medium text-green-900">
                        {currentAthlete.first_name} {currentAthlete.last_name}
                      </h3>
                      <p className="text-sm text-green-700">
                        {currentAthlete.uuid}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentAthlete(null)}
                    className="mt-2 text-sm text-green-600 hover:text-green-800"
                  >
                    Değiştir
                  </button>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İstasyon
                    </label>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-2xl">{currentStation?.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {currentStation?.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {currentStation?.description}
                        </p>
                      </div>
                    </div>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Değer girin (${currentStation?.unit})`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notlar (Opsiyonel)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Test hakkında notlar..."
                    />
                  </div>

                  <button
                    onClick={handleValueSubmit}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Değeri Kaydet</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sağ Panel - Geçmiş ve İstatistikler */}
          <div className="space-y-6">
            {/* Antrenör Bilgileri */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Antrenör Bilgileri
              </h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {currentCoach?.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {currentCoach?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{currentStation?.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {currentStation?.name}
                    </p>
                    <p className="text-sm text-gray-600">Atanan İstasyon</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Son Testler */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Son Testler
              </h2>
              <div className="space-y-3">
                {recentTests.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Henüz test yapılmamış
                  </p>
                ) : (
                  recentTests.map((test) => (
                    <div
                      key={test.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">
                          {getStationIcon(test.station_id)}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {getStationName(test.station_id)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {test.value} {currentStation?.unit}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-gray-500">
                          {test.completed_at
                            ? new Date(test.completed_at).toLocaleTimeString(
                                "tr-TR"
                              )
                            : "Bilinmiyor"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* İstatistikler */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Bugünkü İstatistikler
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {recentTests.length}
                  </p>
                  <p className="text-sm text-gray-600">Toplam Test</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {recentTests.filter((t) => t.status === "completed").length}
                  </p>
                  <p className="text-sm text-gray-600">Tamamlanan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
