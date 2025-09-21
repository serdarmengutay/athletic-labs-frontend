"use client";

import { useState, useEffect } from "react";
import {
  Users,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Plus,
  FileText,
  QrCode,
  Play,
  Download,
  Camera,
  Settings,
  Activity,
} from "lucide-react";
import {
  AdvancedTestSession,
  TestSessionStatus,
  Club,
  Athlete,
  TestSession,
} from "@/types";
import { TEST_STATIONS } from "@/lib/testStations";
import ClubModal from "@/components/ClubModal";
import ExcelImportModal from "@/components/ExcelImportModal";
import TestSessionModal from "@/components/TestSessionModal";
import QRPrintModal from "@/components/QRPrintModal";
import BulkQRPrintModal from "@/components/BulkQRPrintModal";
import QRScanner from "@/components/QRScanner";
import StationSelection from "@/components/StationSelection";
import { clubApi, athleteApi, testApi, qrApi } from "@/lib/api";

export default function Dashboard() {
  const [currentSession, setCurrentSession] =
    useState<AdvancedTestSession | null>(null);
  const [sessionStatuses, setSessionStatuses] = useState<TestSessionStatus[]>(
    []
  );
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [showClubModal, setShowClubModal] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showTestSessionModal, setShowTestSessionModal] = useState(false);
  const [showQRPrint, setShowQRPrint] = useState(false);
  const [showBulkQRPrint, setShowBulkQRPrint] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showStationSelection, setShowStationSelection] = useState(false);

  // Data states
  const [clubs, setClubs] = useState<Club[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [clubsRes, athletesRes] = await Promise.all([
        clubApi.getAll(),
        athleteApi.getAll(),
      ]);

      setClubs(clubsRes.data.data || []);
      setAthletes(athletesRes.data.data || []);
      setTestSessions([]); // Test oturumları şimdilik boş
    } catch (error) {
      console.error("Veri yüklenirken hata:", error);
    }
  };

  const handleClubSuccess = () => {
    loadInitialData(); // Verileri yeniden yükle
    setShowClubModal(false);
  };

  const handleExcelImportSuccess = (result: any) => {
    console.log("Excel import başarılı:", result);
    loadInitialData(); // Verileri yeniden yükle
    setShowExcelImport(false);
  };

  const handleTestSessionSuccess = (newSession: TestSession) => {
    setTestSessions((prev) => [...prev, newSession]);
    setShowTestSessionModal(false);
  };

  const handleQRPrint = (athlete: Athlete) => {
    setSelectedAthlete(athlete);
    setShowQRPrint(true);
  };

  const handleBulkQRPrint = (club: Club) => {
    setSelectedClub(club);
    setShowBulkQRPrint(true);
  };

  const handleStartTest = () => {
    setShowStationSelection(true);
  };

  const handleQRScan = (qrData: string) => {
    console.log("QR kod okundu:", qrData);
    // QR kod verisini işle - burada sporcu bilgilerini çıkarabilirsiniz
    try {
      const data = JSON.parse(qrData);
      console.log("QR kod verisi:", data);
      // Sporcu bilgilerini göster veya işle
      alert(
        `QR kod okundu!\nSporcu: ${data.first_name} ${data.last_name}\nKulüp: ${data.club_name}`
      );
    } catch (error) {
      console.error("QR kod verisi parse edilemedi:", error);
      alert(`QR kod okundu: ${qrData}`);
    }
    setShowQRScanner(false);
  };

  const calculateAge = (birthYear: number) => {
    if (!birthYear) return "Bilinmiyor";
    const today = new Date();
    const currentYear = today.getFullYear();
    return currentYear - birthYear;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Athletic Labs
          </h1>
          <p className="text-xl text-gray-600">
            Sporcu Performans Takip Sistemi
          </p>
          <div className="mt-4 flex justify-center">
            <div className="bg-white rounded-full px-6 py-2 shadow-lg">
              <span className="text-sm text-gray-600">
                Son güncelleme: {lastUpdate.toLocaleTimeString("tr-TR")}
              </span>
            </div>
          </div>
        </div>

        {/* Ana İşlemler - Daha Büyük ve Görsel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Kulüp Yönetimi */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Kulüp Yönetimi
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowClubModal(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <Plus className="h-5 w-5" />
                  <span>Yeni Kulüp</span>
                </button>
                <button
                  onClick={() => setShowExcelImport(true)}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-800 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <FileText className="h-5 w-5" />
                  <span>Sporcu İçe Aktar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Test Yönetimi */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Test Yönetimi
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowTestSessionModal(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-purple-800 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <Clock className="h-5 w-5" />
                  <span>Test Oturumu</span>
                </button>
                <button
                  onClick={handleStartTest}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-xl hover:from-orange-700 hover:to-orange-800 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <Play className="h-5 w-5" />
                  <span>Teste Başla</span>
                </button>
              </div>
            </div>
          </div>

          {/* QR Kod İşlemleri */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                QR Kodlar
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowBulkQRPrint(true)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-800 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <Download className="h-5 w-5" />
                  <span>Toplu QR Yazdır</span>
                </button>
                <button
                  onClick={() => setShowQRScanner(true)}
                  className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-teal-800 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <Camera className="h-5 w-5" />
                  <span>QR Okut</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sistem Durumu */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Sistem Durumu
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sporcular:</span>
                  <span className="font-bold text-blue-600">
                    {athletes.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Kulüpler:</span>
                  <span className="font-bold text-green-600">
                    {clubs.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Testler:</span>
                  <span className="font-bold text-purple-600">
                    {testSessions.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* İstatistik Kartları - Daha Büyük ve Renkli */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">
                  Toplam Sporcu
                </p>
                <p className="text-3xl font-bold">{athletes.length}</p>
              </div>
              <Users className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Kulüpler</p>
                <p className="text-3xl font-bold">{clubs.length}</p>
              </div>
              <MapPin className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">
                  Test Oturumları
                </p>
                <p className="text-3xl font-bold">{testSessions.length}</p>
              </div>
              <Clock className="h-12 w-12 text-yellow-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">QR Kodlar</p>
                <p className="text-3xl font-bold">{athletes.length}</p>
              </div>
              <QrCode className="h-12 w-12 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Kulüpler ve Sporcular - Daha Modern Tasarım */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Kulüpler */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Kulüpler</h2>
                <button
                  onClick={() => setShowClubModal(true)}
                  className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-all duration-200 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Yeni Kulüp</span>
                </button>
              </div>
            </div>
            <div className="p-6">
              {clubs.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    Henüz kulüp eklenmemiş
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Yeni kulüp eklemek için yukarıdaki butonu kullanın
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clubs.map((club) => (
                    <div
                      key={club.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:border-blue-300"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg">
                            {club.name}
                          </h3>
                          <p className="text-gray-600 flex items-center mt-1">
                            <MapPin className="h-4 w-4 mr-1" />
                            {club.city}
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            İletişim: {club.contact_person_name} -{" "}
                            {club.contact_person_phone}
                          </p>
                          <div className="mt-2 flex items-center space-x-4">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                              {
                                athletes.filter((a) => a.club_id === club.id)
                                  .length
                              }{" "}
                              sporcu
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleBulkQRPrint(club)}
                            className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-200 transition-colors duration-200 flex items-center space-x-1"
                          >
                            <QrCode className="h-4 w-4" />
                            <span className="text-sm">QR Yazdır</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sporcular */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Sporcular</h2>
                <button
                  onClick={() => setShowExcelImport(true)}
                  className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-all duration-200 flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Sporcu Ekle</span>
                </button>
              </div>
            </div>
            <div className="p-6">
              {athletes.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    Henüz sporcu eklenmemiş
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Excel ile sporcu import edin veya manuel ekleyin
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {athletes.slice(0, 10).map((athlete) => (
                    <div
                      key={athlete.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:border-green-300"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg">
                            {athlete.first_name} {athlete.last_name}
                          </h3>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-600 flex items-center">
                              <span className="font-medium">Kod:</span>
                              <span className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                                {athlete.athlete_code || "Yok"}
                              </span>
                            </p>
                            <p className="text-sm text-gray-600 flex items-center">
                              <span className="font-medium">Yaş:</span>
                              <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                {calculateAge(athlete.birth_year)}
                              </span>
                            </p>
                            <p className="text-sm text-gray-600 flex items-center">
                              <span className="font-medium">Kulüp:</span>
                              <span className="ml-2">{athlete.club?.name}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleQRPrint(athlete)}
                            className="bg-green-100 text-green-700 px-3 py-2 rounded-lg hover:bg-green-200 transition-colors duration-200 flex items-center space-x-1"
                          >
                            <QrCode className="h-4 w-4" />
                            <span className="text-sm">QR Yazdır</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {athletes.length > 10 && (
                    <div className="text-center text-gray-500 text-sm py-4">
                      ... ve {athletes.length - 10} sporcu daha
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Oturumları */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Test Oturumları</h2>
              <button
                onClick={() => setShowTestSessionModal(true)}
                className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-all duration-200 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Yeni Oturum</span>
              </button>
            </div>
          </div>
          <div className="p-6">
            {testSessions.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  Henüz test oturumu oluşturulmamış
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Test oturumu oluşturup teste başlayın
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {testSessions.map((session) => (
                  <div
                    key={session.id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:border-purple-300"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {session.club?.name || "Bilinmeyen Kulüp"}
                        </h3>
                        <p className="text-gray-600 flex items-center mt-1">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(session.test_date).toLocaleDateString(
                            "tr-TR"
                          )}
                        </p>
                        {session.notes && (
                          <p className="text-sm text-gray-500 mt-2">
                            {session.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleStartTest}
                          className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors duration-200 flex items-center space-x-2"
                        >
                          <Play className="h-4 w-4" />
                          <span>Teste Başla</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showClubModal && (
        <ClubModal
          onClose={() => setShowClubModal(false)}
          onSuccess={handleClubSuccess}
        />
      )}

      {showExcelImport && (
        <ExcelImportModal
          isOpen={showExcelImport}
          onClose={() => setShowExcelImport(false)}
          clubId={selectedClub?.id || ""}
          onImportSuccess={handleExcelImportSuccess}
        />
      )}

      {showTestSessionModal && (
        <TestSessionModal
          isOpen={showTestSessionModal}
          onClose={() => setShowTestSessionModal(false)}
          onSuccess={handleTestSessionSuccess}
        />
      )}

      {showQRPrint && selectedAthlete && (
        <QRPrintModal
          isOpen={showQRPrint}
          onClose={() => setShowQRPrint(false)}
          athleteData={{
            athlete_id: selectedAthlete.id,
            first_name: selectedAthlete.first_name,
            last_name: selectedAthlete.last_name,
            birth_date: `${selectedAthlete.birth_year}-01-01`,
            club_name: selectedAthlete.club?.name || "",
          }}
        />
      )}

      {showBulkQRPrint && selectedClub && (
        <BulkQRPrintModal
          isOpen={showBulkQRPrint}
          onClose={() => setShowBulkQRPrint(false)}
          athletes={athletes
            .filter((a) => a.club_id === selectedClub.id)
            .map((athlete) => ({
              athlete_id: athlete.id,
              first_name: athlete.first_name,
              last_name: athlete.last_name,
              birth_date: `${athlete.birth_year}-01-01`,
              club_name: athlete.club?.name || "",
            }))}
          clubName={selectedClub.name}
        />
      )}

      {showQRScanner && (
        <QRScanner
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScan}
        />
      )}

      {showStationSelection && (
        <StationSelection onBack={() => setShowStationSelection(false)} />
      )}
    </div>
  );
}
