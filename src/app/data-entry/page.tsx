"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Users,
  Search,
  CheckCircle,
  Clock,
  ClipboardList,
  Save,
  X,
  ChevronRight,
  AlertCircle,
  Download,
} from "lucide-react";
import { Club, Athlete, TestSession } from "@/types";
import { clubApi, athleteApi, testApi } from "@/lib/api";
import { TEST_STATIONS } from "@/lib/testStations";
import firebase from "firebase/compat/app";

// Test parametreleri tanımı
const TEST_PARAMETERS = [
  { id: "height", name: "Boy", unit: "cm", icon: "📏" },
  { id: "weight", name: "Kilo", unit: "kg", icon: "⚖️" },
  { id: "flexibility", name: "Esneklik", unit: "cm", icon: "🤸‍♂️" },
  {
    id: "sprint_30m_first",
    name: "30m Sprint (1. Koşu)",
    unit: "sn",
    icon: "🏃‍♂️",
  },
  {
    id: "sprint_30m_second",
    name: "30m Sprint (2. Koşu)",
    unit: "sn",
    icon: "🏃‍♂️",
  },
  { id: "agility", name: "Çeviklik", unit: "sn", icon: "🔄" },
  { id: "vertical_jump", name: "Dikey Sıçrama", unit: "cm", icon: "⬆️" },
];

// Görünüm durumları
type ViewState =
  | "session-select"
  | "birth-year-select"
  | "athlete-list"
  | "athlete-detail";

export default function DataEntryPage() {
  const router = useRouter();

  // Ana state'ler
  const [viewState, setViewState] = useState<ViewState>("session-select");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Veri state'leri
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);

  // Seçim state'leri
  const [selectedSession, setSelectedSession] = useState<TestSession | null>(
    null
  );
  const [selectedBirthYear, setSelectedBirthYear] = useState<number | null>(
    null
  );
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Parametre giriş state'leri
  const [showParameterModal, setShowParameterModal] = useState(false);
  const [activeParameter, setActiveParameter] = useState<
    (typeof TEST_PARAMETERS)[0] | null
  >(null);
  const [parameterValue, setParameterValue] = useState<string>("");
  const [athleteTestData, setAthleteTestData] = useState<
    Record<string, number>
  >({});
  const [savingParameter, setSavingParameter] = useState(false);

  // Sayfa yüklendiğinde verileri çek
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, clubsRes, athletesRes] = await Promise.all([
        testApi.getAllSessions(),
        clubApi.getAll(),
        athleteApi.getAll(),
      ]);

      setTestSessions(sessionsRes.data.data || []);
      setClubs(clubsRes.data.data || []);
      setAthletes(athletesRes.data.data || []);
    } catch (err) {
      console.error("Veri yüklenirken hata:", err);
      setError("Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Seçilen oturumdaki kulübe ait sporcuları filtrele
  const sessionAthletes = useMemo(() => {
    if (!selectedSession) return [];
    return athletes.filter((a) => a.club_id === selectedSession.club_id);
  }, [selectedSession, athletes]);

  // Doğum yılına ve arama sorgusuna göre sporcuları filtrele
  const filteredAthletes = useMemo(() => {
    let result = sessionAthletes;

    if (selectedBirthYear) {
      result = result.filter((a) => a.birth_year === selectedBirthYear);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.first_name.toLowerCase().includes(query) ||
          a.last_name.toLowerCase().includes(query) ||
          `${a.first_name} ${a.last_name}`.toLowerCase().includes(query)
      );
    }

    return result;
  }, [sessionAthletes, selectedBirthYear, searchQuery]);

  // Mevcut doğum yıllarını hesapla
  const availableBirthYears = useMemo(() => {
    const years = [...new Set(sessionAthletes.map((a) => a.birth_year))];
    return years.sort((a, b) => b - a);
  }, [sessionAthletes]);

  // Oturum seçimi
  const handleSessionSelect = (session: TestSession) => {
    setSelectedSession(session);
    setViewState("birth-year-select");
  };

  // Doğum yılı seçimi
  const handleBirthYearSelect = (year: number) => {
    setSelectedBirthYear(year);
    setViewState("athlete-list");
  };

  // Sporcu seçimi
  const handleAthleteSelect = async (athlete: Athlete) => {
    setSelectedAthlete(athlete);
    setAthleteTestData({});
    setViewState("athlete-detail");

    // Backend'den mevcut test verilerini çek
    try {
      // TODO: Backend hazır olunca bu endpoint kullanılacak
      // const response = await testApi.getAthleteTestData(athlete.id, selectedSession?.id);
      // setAthleteTestData(response.data.data || {});
    } catch (err) {
      console.error("Sporcu test verileri yüklenirken hata:", err);
    }
  };

  // Parametre modal'ını aç
  const handleOpenParameterModal = (param: (typeof TEST_PARAMETERS)[0]) => {
    setActiveParameter(param);
    setParameterValue(athleteTestData[param.id]?.toString() || "");
    setShowParameterModal(true);
  };

  // Parametre kaydet
  const handleSaveParameter = async () => {
    if (
      !activeParameter ||
      !parameterValue ||
      !selectedAthlete ||
      !selectedSession
    ) {
      return;
    }

    setSavingParameter(true);
    try {
      // Backend'e kaydet
      // TODO: Backend hazır olunca bu endpoint kullanılacak
      // await testApi.submitAthleteTestParam({
      //   athlete_id: selectedAthlete.id,
      //   session_id: selectedSession.id,
      //   parameter_id: activeParameter.id,
      //   value: parseFloat(parameterValue),
      // });

      // Local state'i güncelle
      setAthleteTestData((prev) => ({
        ...prev,
        [activeParameter.id]: parseFloat(parameterValue),
      }));

      setShowParameterModal(false);
      setActiveParameter(null);
      setParameterValue("");
    } catch (err) {
      console.error("Parametre kaydedilirken hata:", err);
      setError("Parametre kaydedilirken hata oluştu.");
    } finally {
      setSavingParameter(false);
    }
  };

  // Testi tamamla
  const handleCompleteTest = async () => {
    if (!selectedAthlete || !selectedSession) return;

    // Tüm parametreler dolu mu kontrol et
    const allFilled = TEST_PARAMETERS.every(
      (p) => athleteTestData[p.id] !== undefined
    );
    if (!allFilled) {
      setError("Lütfen tüm parametreleri doldurun.");
      return;
    }

    try {
      // Backend'e testi tamamla
      // TODO: Backend hazır olunca bu endpoint kullanılacak
      // await testApi.completeAthleteTest(selectedAthlete.id, selectedSession.id);

      alert("Test başarıyla tamamlandı! Karne oluşturulacak.");

      // Sporcu listesine geri dön
      setSelectedAthlete(null);
      setAthleteTestData({});
      setViewState("athlete-list");
    } catch (err) {
      console.error("Test tamamlanırken hata:", err);
      setError("Test tamamlanırken hata oluştu.");
    }
  };

  // Geri git
  const handleBack = () => {
    switch (viewState) {
      case "birth-year-select":
        setSelectedSession(null);
        setViewState("session-select");
        break;
      case "athlete-list":
        setSelectedBirthYear(null);
        setSearchQuery("");
        setViewState("birth-year-select");
        break;
      case "athlete-detail":
        setSelectedAthlete(null);
        setAthleteTestData({});
        setViewState("athlete-list");
        break;
      default:
        router.push("/dashboard");
    }
  };

  // Dolu parametre sayısı
  const filledParameterCount = Object.keys(athleteTestData).length;
  const allParametersFilled = filledParameterCount === TEST_PARAMETERS.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Geri</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {viewState === "session-select" && "Test Oturumu Seç"}
              {viewState === "birth-year-select" && "Doğum Yılı Seç"}
              {viewState === "athlete-list" && "Sporcu Seç"}
              {viewState === "athlete-detail" && "Test Verileri"}
            </h1>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Hata mesajı */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError("")} className="ml-auto">
              <X className="h-4 w-4 text-red-500" />
            </button>
          </div>
        )}

        {/* TEST OTURUMU SEÇİMİ */}
        {viewState === "session-select" && (
          <div className="space-y-4">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Test Oturumu Seçin
              </h2>
              <p className="text-gray-600">
                Veri girişi yapacağınız test oturumunu seçin
              </p>
            </div>

            {testSessions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  Henüz test oturumu oluşturulmamış
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Dashboard&apos;a git
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {testSessions.map((session) => {
                  const club = clubs.find((c) => c.id === session.club_id);
                  const athleteCount = athletes.filter(
                    (a) => a.club_id === session.club_id
                  ).length;

                  return (
                    <button
                      key={session.id}
                      onClick={() => handleSessionSelect(session)}
                      className="w-full bg-white rounded-xl shadow-lg p-6 flex items-center justify-between hover:shadow-xl transition-all duration-200 hover:border-blue-300 border-2 border-transparent"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-gray-900 text-lg">
                            {club?.name || "Bilinmeyen Kulüp"}
                          </h3>
                          <p className="text-gray-600">
                            {new Date(session.test_date).toLocaleDateString(
                              "tr-TR",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              }
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            {athleteCount} sporcu
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-6 w-6 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DOĞUM YILI SEÇİMİ */}
        {viewState === "birth-year-select" && (
          <div className="space-y-4">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Doğum Yılı Seçin
              </h2>
              <p className="text-gray-600">
                Hangi yaş grubundaki sporcuları görmek istiyorsunuz?
              </p>
            </div>

            {availableBirthYears.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  Bu kulüpte sporcu bulunamadı
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {availableBirthYears.map((year) => {
                  const count = sessionAthletes.filter(
                    (a) => a.birth_year === year
                  ).length;
                  const currentYear = new Date().getFullYear();
                  const age = currentYear - year;

                  return (
                    <button
                      key={year}
                      onClick={() => handleBirthYearSelect(year)}
                      className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-all duration-200 hover:border-green-300 border-2 border-transparent"
                    >
                      <p className="text-3xl font-bold text-gray-900">{year}</p>
                      <p className="text-gray-600 mt-1">{age} yaş</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {count} sporcu
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SPORCU LİSTESİ */}
        {viewState === "athlete-list" && (
          <div className="space-y-4">
            {/* Arama */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Sporcu ara (isim veya soyisim)"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-lg"
                />
              </div>
            </div>

            {/* Bilgi */}
            <div className="flex items-center justify-between text-sm text-gray-600 px-2">
              <span>{selectedBirthYear} doğumlu sporcular</span>
              <span>{filteredAthletes.length} sporcu</span>
            </div>

            {/* Sporcu Listesi */}
            {filteredAthletes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchQuery
                    ? "Arama sonucu bulunamadı"
                    : "Sporcu bulunamadı"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAthletes.map((athlete) => (
                  <button
                    key={athlete.id}
                    onClick={() => handleAthleteSelect(athlete)}
                    className="w-full bg-white rounded-xl shadow-lg p-5 flex items-center justify-between hover:shadow-xl transition-all duration-200 hover:border-blue-300 border-2 border-transparent"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {athlete.first_name.charAt(0)}
                        {athlete.last_name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-gray-900 text-lg">
                          {athlete.first_name} {athlete.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Kod: {athlete.athlete_code || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {/* TODO: Tamamlanma durumu backend'den gelecek */}
                      <div className="text-right">
                        <span className="text-sm text-gray-500">
                          0/{TEST_PARAMETERS.length}
                        </span>
                      </div>
                      <ChevronRight className="h-6 w-6 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SPORCU DETAY - TEST PARAMETRELERİ */}
        {viewState === "athlete-detail" && selectedAthlete && (
          <div className="space-y-6">
            {/* Sporcu Bilgisi */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {selectedAthlete.first_name.charAt(0)}
                  {selectedAthlete.last_name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedAthlete.first_name} {selectedAthlete.last_name}
                  </h2>
                  <p className="text-gray-600">
                    {selectedAthlete.birth_year} doğumlu • Kod:{" "}
                    {selectedAthlete.athlete_code || "-"}
                  </p>
                </div>
              </div>

              {/* İlerleme */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">İlerleme</span>
                  <span className="font-bold text-gray-900">
                    {filledParameterCount}/{TEST_PARAMETERS.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      allParametersFilled ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{
                      width: `${
                        (filledParameterCount / TEST_PARAMETERS.length) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Test Parametreleri */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <ClipboardList className="h-5 w-5" />
                  <span>Test Parametreleri</span>
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {TEST_PARAMETERS.map((param) => {
                  const value = athleteTestData[param.id];
                  const isFilled = value !== undefined;

                  return (
                    <button
                      key={param.id}
                      onClick={() => handleOpenParameterModal(param)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl">{param.icon}</span>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">
                            {param.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Birim: {param.unit}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {isFilled ? (
                          <>
                            <span className="text-lg font-bold text-green-600">
                              {value} {param.unit}
                            </span>
                            <CheckCircle className="h-6 w-6 text-green-500" />
                          </>
                        ) : (
                          <>
                            <span className="text-gray-400">Girilmedi</span>
                            <ChevronRight className="h-6 w-6 text-gray-400" />
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Testi Tamamla Butonu */}
            {allParametersFilled && (
              <button
                onClick={handleCompleteTest}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-3 shadow-lg hover:from-green-600 hover:to-green-700 transition-all"
              >
                <CheckCircle className="h-6 w-6" />
                <span>Testi Tamamla</span>
              </button>
            )}

            {/* Karne İndir (şimdilik disabled) */}
            <button
              disabled
              className="w-full bg-gray-200 text-gray-500 py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-3 cursor-not-allowed"
            >
              <Download className="h-6 w-6" />
              <span>Karne İndir (Test tamamlandıktan sonra)</span>
            </button>
          </div>
        )}
      </div>

      {/* PARAMETRE GİRİŞ MODAL */}
      {showParameterModal && activeParameter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{activeParameter.icon}</span>
                <h3 className="text-lg font-bold text-white">
                  {activeParameter.name}
                </h3>
              </div>
              <button
                onClick={() => {
                  if (!parameterValue && !savingParameter) {
                    setShowParameterModal(false);
                    setActiveParameter(null);
                  }
                }}
                disabled={!!parameterValue && !savingParameter}
                className={`${
                  parameterValue && !savingParameter
                    ? "text-white/50 cursor-not-allowed"
                    : "text-white hover:text-white/80"
                }`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Değer ({activeParameter.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={parameterValue}
                  onChange={(e) => setParameterValue(e.target.value)}
                  placeholder={`${activeParameter.name} değerini girin`}
                  className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-2xl text-center font-bold text-black"
                  autoFocus
                />
              </div>

              {/* Mevcut değer bilgisi */}
              {athleteTestData[activeParameter.id] !== undefined && (
                <p className="text-sm text-gray-500 mb-4 text-center">
                  Mevcut değer: {athleteTestData[activeParameter.id]}{" "}
                  {activeParameter.unit}
                </p>
              )}

              {/* Butonlar */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowParameterModal(false);
                    setActiveParameter(null);
                    setParameterValue("");
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveParameter}
                  disabled={!parameterValue || savingParameter}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {savingParameter ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
