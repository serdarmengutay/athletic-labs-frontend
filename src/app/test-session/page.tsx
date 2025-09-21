"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  QrCode,
  Settings,
  UserPlus,
} from "lucide-react";
import { Club, Athlete, Coach, AdvancedTestSession } from "@/types";
import BulkQRPrintModal from "@/components/BulkQRPrintModal";
import { TEST_STATIONS } from "@/lib/testStations";
import { clubApi, athleteApi } from "@/lib/api";
import CoachModal from "@/components/CoachModal";
import AthleteImportModal from "@/components/AthleteImportModal";
import QRPrintModal from "@/components/QRPrintModal";

export default function TestSessionPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<Athlete[]>([]);
  const [selectedCoaches, setSelectedCoaches] = useState<Coach[]>([]);
  const [currentSession, setCurrentSession] =
    useState<AdvancedTestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedClubForImport, setSelectedClubForImport] =
    useState<Club | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clubsRes, athletesRes] = await Promise.all([
        clubApi.getAll(),
        athleteApi.getAll(),
      ]);

      setClubs(clubsRes.data.data);
      setAthletes(athletesRes.data.data);

      // Mock coaches data - gerçek uygulamada API'den gelecek
      setCoaches([
        {
          id: "coach-1",
          name: "Ahmet Yılmaz",
          email: "ahmet@example.com",
          role: "supervisor",
          assigned_stations: ["ffmi-station", "sprint-30m-station"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "coach-2",
          name: "Mehmet Kaya",
          email: "mehmet@example.com",
          role: "station_coach",
          assigned_stations: ["agility-station"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Veri yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClubSelect = (club: Club) => {
    setSelectedClub(club);
    const clubAthletes = athletes.filter(
      (athlete) => athlete.club_id === club.id
    );
    setSelectedAthletes(clubAthletes);
  };

  const handleAthleteToggle = (athlete: Athlete) => {
    setSelectedAthletes((prev) =>
      prev.find((a) => a.id === athlete.id)
        ? prev.filter((a) => a.id !== athlete.id)
        : [...prev, athlete]
    );
  };

  const handleCoachToggle = (coach: Coach) => {
    setSelectedCoaches((prev) =>
      prev.find((c) => c.id === coach.id)
        ? prev.filter((c) => c.id !== coach.id)
        : [...prev, coach]
    );
  };

  const startTestSession = () => {
    if (
      !selectedClub ||
      selectedAthletes.length === 0 ||
      selectedCoaches.length === 0
    ) {
      alert("Lütfen kulüp, sporcu ve hoca seçiniz!");
      return;
    }

    const newSession: AdvancedTestSession = {
      id: `session-${Date.now()}`,
      club_id: selectedClub.id,
      test_date: new Date().toISOString(),
      status: "preparing",
      stations: TEST_STATIONS,
      coaches: selectedCoaches,
      athletes: selectedAthletes,
      session_statuses: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      club: selectedClub,
    };

    setCurrentSession(newSession);
  };

  const activateSession = () => {
    if (currentSession) {
      setCurrentSession((prev) =>
        prev ? { ...prev, status: "active" } : null
      );
    }
  };

  const completeSession = () => {
    if (currentSession) {
      setCurrentSession((prev) =>
        prev ? { ...prev, status: "completed" } : null
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "preparing":
        return "bg-yellow-100 text-yellow-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "preparing":
        return "Hazırlanıyor";
      case "active":
        return "Aktif";
      case "completed":
        return "Tamamlandı";
      case "cancelled":
        return "İptal Edildi";
      default:
        return "Bilinmiyor";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Test Oturumu Yönetimi
              </h1>
              <p className="text-gray-600">Saha test süreçlerini yönetin</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowCoachModal(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <UserPlus className="h-4 w-4" />
                <span>Hoca Ekle</span>
              </button>
              <button
                onClick={() => router.back()}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <Settings className="h-4 w-4" />
                <span>Geri</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentSession ? (
          /* Test Oturumu Hazırlığı */
          <div className="space-y-8">
            {/* Kulüp Seçimi */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  1. Kulüp Seçimi
                </h2>
                {selectedClub && (
                  <button
                    onClick={() => {
                      setSelectedClubForImport(selectedClub);
                      setShowImportModal(true);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Sporcu İçe Aktar</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {clubs.map((club) => (
                  <div
                    key={club.id}
                    onClick={() => handleClubSelect(club)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedClub?.id === club.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <h3 className="font-medium text-gray-900">{club.name}</h3>
                    <p className="text-sm text-gray-600">{club.city}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {athletes.filter((a) => a.club_id === club.id).length}{" "}
                      sporcu
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sporcu Seçimi */}
            {selectedClub && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  2. Sporcu Seçimi ({selectedAthletes.length} seçildi)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {athletes
                    .filter((athlete) => athlete.club_id === selectedClub.id)
                    .map((athlete) => (
                      <div
                        key={athlete.id}
                        onClick={() => handleAthleteToggle(athlete)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedAthletes.find((a) => a.id === athlete.id)
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {athlete.first_name} {athlete.last_name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {athlete.athlete_code}
                            </p>
                          </div>
                          {selectedAthletes.find(
                            (a) => a.id === athlete.id
                          ) && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Hoca Seçimi */}
            {selectedClub && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  3. Hoca Seçimi ({selectedCoaches.length} seçildi)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {coaches.map((coach) => (
                    <div
                      key={coach.id}
                      onClick={() => handleCoachToggle(coach)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedCoaches.find((c) => c.id === coach.id)
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {coach.name}
                          </h4>
                          <p className="text-sm text-gray-600">{coach.email}</p>
                          <p className="text-xs text-gray-500">
                            {coach.role === "admin"
                              ? "Yönetici"
                              : coach.role === "supervisor"
                              ? "Saha Sorumlusu"
                              : "İstasyon Hocası"}
                          </p>
                        </div>
                        {selectedCoaches.find((c) => c.id === coach.id) && (
                          <CheckCircle className="h-5 w-5 text-purple-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Oturumu Başlatma */}
            {selectedClub &&
              selectedAthletes.length > 0 &&
              selectedCoaches.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    4. Test Oturumu Başlat
                  </h2>
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h3 className="font-medium text-blue-900 mb-2">
                      Test Oturumu Özeti
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
                      <div>
                        <span className="text-blue-700">Kulüp:</span>
                        <p className="font-medium text-blue-900">
                          {selectedClub.name}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-700">Sporcu Sayısı:</span>
                        <p className="font-medium text-blue-900">
                          {selectedAthletes.length}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-700">Hoca Sayısı:</span>
                        <p className="font-medium text-blue-900">
                          {selectedCoaches.length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={startTestSession}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                    >
                      <Play className="h-5 w-5" />
                      <span>Test Oturumunu Başlat</span>
                    </button>
                    <button
                      onClick={() => setShowQRModal(true)}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                    >
                      <QrCode className="h-5 w-5" />
                      <span>QR Kodlarını Yazdır</span>
                    </button>
                  </div>
                </div>
              )}
          </div>
        ) : (
          /* Aktif Test Oturumu */
          <div className="space-y-6">
            {/* Oturum Durumu */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Test Oturumu - {currentSession.club?.name}
                  </h2>
                  <p className="text-gray-600">
                    {new Date(currentSession.test_date).toLocaleDateString(
                      "tr-TR"
                    )}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      currentSession.status
                    )}`}
                  >
                    {getStatusText(currentSession.status)}
                  </span>
                  {currentSession.status === "preparing" && (
                    <button
                      onClick={activateSession}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                    >
                      <Play className="h-4 w-4" />
                      <span>Aktifleştir</span>
                    </button>
                  )}
                  {currentSession.status === "active" && (
                    <button
                      onClick={completeSession}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Tamamla</span>
                    </button>
                  )}
                </div>
              </div>

              {/* İstatistikler */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Sporcular
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {currentSession.athletes.length}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      İstasyonlar
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {currentSession.stations.length}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Hocalar
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {currentSession.coaches.length}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <QrCode className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">
                      QR Kodlar
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {currentSession.athletes.length}
                  </p>
                </div>
              </div>
            </div>

            {/* İstasyonlar */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Test İstasyonları
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {currentSession.stations.map((station) => (
                  <div key={station.id} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{station.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {station.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {station.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {station.required_coaches} hoca gerekli • {station.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sporcu Listesi */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Sporcu Listesi
              </h3>
              <div className="space-y-2">
                {currentSession.athletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {athlete.first_name} {athlete.last_name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {athlete.athlete_code}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <QrCode className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-500">QR Kod</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Coach Modal */}
      {showCoachModal && (
        <CoachModal
          onClose={() => setShowCoachModal(false)}
          onSuccess={(coach) => {
            setCoaches((prev) => [...prev, coach]);
            setShowCoachModal(false);
          }}
        />
      )}

      {/* Athlete Import Modal */}
      {showImportModal && selectedClubForImport && (
        <AthleteImportModal
          onClose={() => {
            setShowImportModal(false);
            setSelectedClubForImport(null);
          }}
          onSuccess={(importedAthletes) => {
            // Convert ImportedAthlete to Athlete format
            const convertedAthletes: Athlete[] = importedAthletes.map(
              (athlete, index) => ({
                id: `imported-${Date.now()}-${index}`,
                athlete_code: `IMP${String(index + 1).padStart(3, "0")}`,
                first_name: athlete.first_name,
                last_name: athlete.last_name,
                birth_year: new Date(athlete.birth_date).getFullYear(),
                birth_date: athlete.birth_date,
                height: athlete.height || 0,
                weight: athlete.weight || 0,
                bmi:
                  athlete.height && athlete.weight
                    ? athlete.weight / Math.pow(athlete.height / 100, 2)
                    : 0,
                club_id: selectedClubForImport?.id || "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
            );

            setAthletes((prev) => [...prev, ...convertedAthletes]);
            setShowImportModal(false);
            setSelectedClubForImport(null);
            // Refresh selected athletes
            if (selectedClub) {
              const clubAthletes = [...athletes, ...convertedAthletes].filter(
                (athlete) => athlete.club_id === selectedClub.id
              );
              setSelectedAthletes(clubAthletes);
            }
          }}
          club={selectedClubForImport}
        />
      )}

      {/* QR Print Modal */}
      {showQRModal && selectedAthletes.length > 0 && (
        <BulkQRPrintModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          athletes={selectedAthletes.map((athlete) => ({
            athlete_id: athlete.id,
            first_name: athlete.first_name,
            last_name: athlete.last_name,
            birth_date: `${athlete.birth_year}-01-01`,
            club_name: athlete.club?.name || "",
          }))}
          clubName={currentSession?.club?.name || "Test Oturumu"}
        />
      )}
    </div>
  );
}
