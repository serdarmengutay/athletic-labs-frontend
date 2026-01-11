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
  FileText,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  Upload,
  Download,
  Printer,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import { Club, Athlete, Coach, AdvancedTestSession } from "@/types";
import BulkQRPrintModal from "@/components/BulkQRPrintModal";
import ExcelImportModal from "@/components/ExcelImportModal";
import { TEST_STATIONS } from "@/lib/testStations";
import { clubApi, athleteApi, testApi } from "@/lib/api";
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
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionData, setSessionData] = useState({
    test_date: "",
    notes: "",
    contact_person_name: "",
    contact_person_phone: "",
    contact_person_email: "",
  });

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

  const startTestSession = async () => {
    if (
      !selectedClub ||
      selectedAthletes.length === 0 ||
      !sessionData.test_date ||
      !sessionData.contact_person_name ||
      !sessionData.contact_person_phone
    ) {
      alert("Lütfen tüm gerekli bilgileri doldurunuz!");
      return;
    }

    try {
      setLoading(true);

      // Backend'e test oturumu oluşturma isteği gönder
      const sessionResponse = await testApi.createSession({
        club_id: selectedClub.id,
        test_date: sessionData.test_date,
        notes:
          sessionData.notes ||
          `İletişim: ${sessionData.contact_person_name} - ${
            sessionData.contact_person_phone
          }${
            sessionData.contact_person_email
              ? ` - ${sessionData.contact_person_email}`
              : ""
          }`,
      });

      const createdSession = sessionResponse.data.data;

      // Frontend state'ini güncelle
      const newSession: AdvancedTestSession = {
        id: createdSession.id,
        club_id: selectedClub.id,
        test_date: sessionData.test_date,
        notes: sessionData.notes,
        status: "preparing",
        stations: TEST_STATIONS,
        coaches: [], // Antrenörler test günü sahada belirlenecek
        athletes: selectedAthletes,
        session_statuses: [],
        created_at: createdSession.created_at,
        updated_at: createdSession.updated_at,
        club: selectedClub,
      };

      setCurrentSession(newSession);

      // Başarı mesajı
      alert("Test oturumu başarıyla oluşturuldu!");
    } catch (error) {
      console.error("Test oturumu oluşturulurken hata:", error);
      alert(
        "Test oturumu oluşturulurken bir hata oluştu. Lütfen tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
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

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSessionDataChange = (field: string, value: string) => {
    setSessionData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Test Oturumu Oluştur
              </h1>
              <p className="text-gray-600">
                Yeni test oturumu için adım adım rehber
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Geri</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentSession ? (
          /* Test Oturumu Hazırlığı - Adım Adım Rehber */
          <div className="space-y-8">
            {/* Adım Göstergesi */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Test Oturumu Oluşturma Rehberi
                </h2>
                <div className="text-sm text-gray-600">
                  Adım {currentStep} / 4
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                ></div>
              </div>

              {/* Adım Butonları */}
              <div className="flex justify-between">
                {[1, 2, 3, 4].map((step) => (
                  <button
                    key={step}
                    onClick={() => setCurrentStep(step)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      currentStep === step
                        ? "bg-blue-600 text-white"
                        : currentStep > step
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                        currentStep === step
                          ? "bg-white text-blue-600"
                          : currentStep > step
                          ? "bg-green-600 text-white"
                          : "bg-gray-400 text-white"
                      }`}
                    >
                      {currentStep > step ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        step
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {step === 1 && "Kulüp Seçimi"}
                      {step === 2 && "Test Bilgileri"}
                      {step === 3 && "Sporcu Import"}
                      {step === 4 && "QR Kodlar"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Adım 1: Kulüp Seçimi */}
            {currentStep === 1 && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    1. Kulüp Seçimi
                  </h3>
                  <p className="text-gray-600">Test yapılacak kulübü seçin</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clubs.map((club) => (
                    <div
                      key={club.id}
                      onClick={() => handleClubSelect(club)}
                      className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        selectedClub?.id === club.id
                          ? "border-blue-500 bg-blue-50 shadow-lg"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Trophy className="h-6 w-6 text-blue-600" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">
                          {club.name}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {club.city}
                        </p>
                        <p className="text-xs text-gray-500">
                          {athletes.filter((a) => a.club_id === club.id).length}{" "}
                          sporcu
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedClub && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">
                            {selectedClub.name} seçildi
                          </p>
                          <p className="text-sm text-green-700">
                            {
                              athletes.filter(
                                (a) => a.club_id === selectedClub.id
                              ).length
                            }{" "}
                            sporcu mevcut
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleNextStep}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                      >
                        <span>Devam Et</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Adım 2: Test Bilgileri */}
            {currentStep === 2 && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    2. Test Bilgileri
                  </h3>
                  <p className="text-gray-600">
                    Test tarihi ve iletişim bilgilerini girin
                  </p>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Test Tarihi *
                    </label>
                    <input
                      type="date"
                      value={sessionData.test_date}
                      onChange={(e) =>
                        handleSessionDataChange("test_date", e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İletişim Kişisi *
                    </label>
                    <input
                      type="text"
                      value={sessionData.contact_person_name}
                      onChange={(e) =>
                        handleSessionDataChange(
                          "contact_person_name",
                          e.target.value
                        )
                      }
                      placeholder="Kulüp başkanı veya sorumlu kişi"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İletişim Telefonu *
                    </label>
                    <input
                      type="tel"
                      value={sessionData.contact_person_phone}
                      onChange={(e) =>
                        handleSessionDataChange(
                          "contact_person_phone",
                          e.target.value
                        )
                      }
                      placeholder="+90 5XX XXX XX XX"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İletişim E-postası
                    </label>
                    <input
                      type="email"
                      value={sessionData.contact_person_email}
                      onChange={(e) =>
                        handleSessionDataChange(
                          "contact_person_email",
                          e.target.value
                        )
                      }
                      placeholder="ornek@kulup.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notlar
                    </label>
                    <textarea
                      value={sessionData.notes}
                      onChange={(e) =>
                        handleSessionDataChange("notes", e.target.value)
                      }
                      placeholder="Test hakkında özel notlar..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    onClick={handlePrevStep}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Geri</span>
                  </button>
                  <button
                    onClick={handleNextStep}
                    disabled={
                      !sessionData.test_date ||
                      !sessionData.contact_person_name ||
                      !sessionData.contact_person_phone
                    }
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <span>Devam Et</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Adım 3: Sporcu Import */}
            {currentStep === 3 && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    3. Sporcu Verilerini İçe Aktar
                  </h3>
                  <p className="text-gray-600">
                    Excel dosyasından sporcu verilerini yükleyin
                  </p>
                </div>

                <div className="max-w-2xl mx-auto">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Excel Dosyası Yükleyin
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Sporcu adı, soyadı, doğum tarihi ve veli telefon numarası
                      içeren Excel dosyası
                    </p>
                    <button
                      onClick={async () => {
                        if (!selectedClub) {
                          alert("Lütfen önce bir kulüp seçin!");
                          return;
                        }

                        try {
                          // Geçici test session oluştur
                          const tempSessionResponse =
                            await testApi.createSession({
                              club_id: selectedClub.id,
                              test_date: new Date().toISOString().split("T")[0],
                              notes: "Geçici session - Sporcu import için",
                            });

                          const tempSession = tempSessionResponse.data.data;

                          setCurrentSession({
                            id: tempSession.id,
                            club_id: selectedClub.id,
                            test_date: tempSession.test_date,
                            notes: tempSession.notes,
                            status: "preparing",
                            stations: TEST_STATIONS,
                            coaches: [],
                            athletes: [],
                            session_statuses: [],
                            created_at: tempSession.created_at,
                            updated_at: tempSession.updated_at,
                            club: selectedClub,
                          });

                          setSelectedClubForImport(selectedClub);
                          setShowImportModal(true);
                        } catch (error) {
                          console.error(
                            "Geçici session oluşturulurken hata:",
                            error
                          );
                          alert(
                            "Geçici session oluşturulurken hata oluştu. Lütfen tekrar deneyin."
                          );
                        }
                      }}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center space-x-2 mx-auto"
                    >
                      <FileText className="h-5 w-5" />
                      <span>Dosya Seç</span>
                    </button>
                  </div>

                  {selectedAthletes.length > 0 && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-green-900">
                              {selectedAthletes.length} sporcu yüklendi
                            </p>
                            <p className="text-sm text-green-700">
                              QR kodları oluşturulmaya hazır
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleNextStep}
                          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                        >
                          <span>Devam Et</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    onClick={handlePrevStep}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Geri</span>
                  </button>
                </div>
              </div>
            )}

            {/* Adım 4: QR Kodlar */}
            {currentStep === 4 && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <QrCode className="h-8 w-8 text-orange-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    4. QR Kodları Oluştur ve Yazdır
                  </h3>
                  <p className="text-gray-600">
                    Sporcular için QR kodları oluşturun ve yazdırın
                  </p>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Test Oturumu Özeti
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700">Kulüp:</span>
                        <p className="font-medium text-blue-900">
                          {selectedClub?.name}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-700">Test Tarihi:</span>
                        <p className="font-medium text-blue-900">
                          {new Date(sessionData.test_date).toLocaleDateString(
                            "tr-TR"
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-700">Sporcu Sayısı:</span>
                        <p className="font-medium text-blue-900">
                          {selectedAthletes.length}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-700">İletişim:</span>
                        <p className="font-medium text-blue-900">
                          {sessionData.contact_person_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => setShowQRModal(true)}
                      className="w-full bg-orange-600 text-white px-6 py-4 rounded-lg hover:bg-orange-700 flex items-center justify-center space-x-3 text-lg font-semibold"
                    >
                      <QrCode className="h-6 w-6" />
                      <span>QR Kodları Oluştur</span>
                    </button>

                    <button
                      onClick={() => setShowQRModal(true)}
                      className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-3 text-lg font-semibold"
                    >
                      <Printer className="h-6 w-6" />
                      <span>QR Kodları Yazdır</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    onClick={handlePrevStep}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Geri</span>
                  </button>
                  <button
                    onClick={startTestSession}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 flex items-center space-x-2 text-lg font-semibold"
                  >
                    <Play className="h-5 w-5" />
                    <span>Test Oturumunu Başlat</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Aktif Test Oturumu - Sadeleştirilmiş */
          <div className="space-y-8">
            {/* Oturum Durumu */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Test Oturumu Hazır!
                </h2>
                <p className="text-lg text-gray-600">
                  {currentSession.club?.name} -{" "}
                  {new Date(currentSession.test_date).toLocaleDateString(
                    "tr-TR"
                  )}
                </p>
              </div>

              {/* İstatistikler */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-blue-50 rounded-xl p-6 text-center">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-900">
                    {currentSession.athletes.length}
                  </p>
                  <p className="text-sm text-blue-700">Sporcu</p>
                </div>
                <div className="bg-green-50 rounded-xl p-6 text-center">
                  <MapPin className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-900">
                    {currentSession.stations.length}
                  </p>
                  <p className="text-sm text-green-700">İstasyon</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-6 text-center">
                  <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-900">
                    {currentSession.coaches.length}
                  </p>
                  <p className="text-sm text-purple-700">Antrenör</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-6 text-center">
                  <QrCode className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-900">
                    {currentSession.athletes.length}
                  </p>
                  <p className="text-sm text-orange-700">QR Kod</p>
                </div>
              </div>

              {/* Hızlı Erişim */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => router.push("/station")}
                  className="bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 flex items-center justify-center space-x-3 text-lg font-semibold"
                >
                  <MapPin className="h-6 w-6" />
                  <span>İstasyon Yönetimi</span>
                </button>
                <button
                  onClick={() => setShowQRModal(true)}
                  className="bg-green-600 text-white px-6 py-4 rounded-xl hover:bg-green-700 flex items-center justify-center space-x-3 text-lg font-semibold"
                >
                  <Printer className="h-6 w-6" />
                  <span>QR Kodları Yazdır</span>
                </button>
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

      {/* Excel Import Modal */}
      {showImportModal && selectedClubForImport && currentSession && (
        <ExcelImportModal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setSelectedClubForImport(null);
          }}
          clubId={selectedClubForImport.id}
          sessionId={currentSession.id}
          onImportSuccess={async (result) => {
            try {
              setLoading(true);
              console.log("Import sonucu:", result);

              if (result.success && result.athletes) {
                // Import edilen sporcuları state'e ekle
                const importedAthletes = result.athletes.map(
                  (athlete: any) => ({
                    id: athlete.id,
                    athlete_code: athlete.athlete_code,
                    first_name: athlete.name.split(" ")[0],
                    last_name: athlete.name.split(" ").slice(1).join(" "),
                    birth_year: athlete.birth_year,
                    height: 0,
                    weight: 0,
                    bmi: 0,
                    club_id: selectedClubForImport.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    club: selectedClubForImport,
                  })
                );

                setAthletes((prev) => [...prev, ...importedAthletes]);
                setSelectedAthletes((prev) => [...prev, ...importedAthletes]);
                setShowImportModal(false);
                setSelectedClubForImport(null);

                alert(
                  `${result.imported_count} sporcu başarıyla import edildi!`
                );
              } else {
                alert("Sporcu import işlemi başarısız oldu.");
              }
            } catch (error) {
              console.error("Import sonrası hata:", error);
              alert("Sporcu verileri işlenirken bir hata oluştu.");
            } finally {
              setLoading(false);
            }
          }}
        />
      )}

      {/* QR Print Modal */}
      {showQRModal && selectedAthletes.length > 0 && currentSession && (
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
          sessionId={currentSession.id}
        />
      )}
    </div>
  );
}
