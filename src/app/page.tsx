"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Users,
  Trophy,
  BarChart3,
  // QrCode, // MVP: QR özelliği devre dışı
  FileText,
  Calendar,
  ArrowRight,
  CheckCircle,
  // Clock,
  ClipboardList,
} from "lucide-react";
import { clubApi, athleteApi, testApi } from "@/lib/api";
import { Club, Athlete, TestSession } from "@/types";

export default function Home() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clubsRes, athletesRes, testSessionsRes] = await Promise.all([
        clubApi.getAll(),
        athleteApi.getAll(),
        testApi.getAllSessions(),
      ]);

      setClubs(clubsRes.data.data);
      setAthletes(athletesRes.data.data);
      setTestSessions(testSessionsRes.data.data);
    } catch (error) {
      console.error("Veri yüklenirken hata:", error);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Athletic Labs
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Sporcu Performans Takip Sistemi
          </p>

          {/* Ana İstatistikler */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-center space-x-3">
                <Trophy className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {clubs.length}
                  </p>
                  <p className="text-sm text-gray-600">Kulüp</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-center space-x-3">
                <Users className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {athletes.length}
                  </p>
                  <p className="text-sm text-gray-600">Sporcu</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-center space-x-3">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {testSessions.length}
                  </p>
                  <p className="text-sm text-gray-600">Test Oturumu</p>
                </div>
              </div>
            </div>
            {/* MVP: QR İstatistiği kaldırıldı */}
          </div>
        </div>

        {/* Ana İşlemler - Basitleştirilmiş */}
        <div className="space-y-8">
          {/* Test Oturumu Oluştur - Ana Akış */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Test Oturumu Oluştur
              </h2>
              <p className="text-lg text-gray-600">
                Yeni bir test oturumu başlatmak için aşağıdaki adımları takip
                edin
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Adım 1: Kulüp Seçimi */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  1. Kulüp Seçimi
                </h3>
                <p className="text-gray-600 mb-4">
                  Test yapılacak kulübü seçin
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <Trophy className="h-5 w-5" />
                  <span>Kulüp Seç</span>
                </button>
              </div>

              {/* Adım 2: Sporcu Import */}
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  2. Sporcu Verilerini İçe Aktar
                </h3>
                <p className="text-gray-600 mb-4">
                  Excel dosyasından sporcu verilerini yükleyin
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <FileText className="h-5 w-5" />
                  <span>Excel İçe Aktar</span>
                </button>
              </div>

              {/* MVP: Adım 3 QR yerine Veri Girişi */}
              {/* 
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <QrCode className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  3. QR Kodları Oluştur
                </h3>
                <p className="text-gray-600 mb-4">
                  Sporcular için QR kodları oluşturun ve yazdırın
                </p>
                <button
                  onClick={() => router.push("/test-session")}
                  className="w-full bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <QrCode className="h-5 w-5" />
                  <span>QR Oluştur</span>
                </button>
              </div>
              */}
            </div>

            {/* Hızlı Başlatma */}
            <div className="mt-8 text-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 flex items-center justify-center space-x-3 mx-auto transition-all duration-200 text-lg font-semibold"
              >
                <Play className="h-6 w-6" />
                <span>Test Oturumu Başlat</span>
                <ArrowRight className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Hızlı Erişim */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Veri Girişi (Tablet) */}
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <ClipboardList className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Test Veri Girişi
                  </h3>
                  <p className="text-gray-600">Tablet ile veri girişi yapın</p>
                </div>
                <button
                  onClick={() => router.push("/data-entry")}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
                >
                  <span>Giriş</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Dashboard */}
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Dashboard
                  </h3>
                  <p className="text-gray-600">Test sonuçlarını analiz edin</p>
                </div>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center space-x-2"
                >
                  <span>Görüntüle</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* MVP: Antrenör Paneli devre dışı
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Antrenör Paneli
                  </h3>
                  <p className="text-gray-600">Saha test süreçlerini yönetin</p>
                </div>
                <button
                  onClick={() => router.push("/coach-panel")}
                  className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center space-x-2"
                >
                  <span>Giriş</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            */}
          </div>

          {/* Son Test Oturumları */}
          {testSessions.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Son Test Oturumları
              </h3>
              <div className="space-y-3">
                {testSessions.slice(0, 3).map((session) => {
                  const club = clubs.find((c) => c.id === session.club_id);
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {club?.name || "Bilinmeyen Kulüp"}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {new Date(session.test_date).toLocaleDateString(
                              "tr-TR"
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-gray-600">
                          Tamamlandı
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
