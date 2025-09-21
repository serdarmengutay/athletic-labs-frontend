"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Trophy, BarChart3, Play, QrCode } from "lucide-react";
import { clubApi, athleteApi, testApi } from "@/lib/api";
import { Club, Athlete, TestSession } from "@/types";
import ClubModal from "@/components/ClubModal";
import AthleteModal from "@/components/AthleteModal";
import TestModal from "@/components/TestModal";

export default function Home() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClubModal, setShowClubModal] = useState(false);
  const [showAthleteModal, setShowAthleteModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

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

  const handleClubCreated = () => {
    setShowClubModal(false);
    fetchData();
  };

  const handleAthleteCreated = () => {
    setShowAthleteModal(false);
    fetchData();
  };

  const handleTestCreated = () => {
    setShowTestModal(false);
    fetchData();
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Athletic Labs
          </h1>
          <p className="text-xl text-gray-600">
            Sporcu Performans Takip Sistemi
          </p>
        </div>

        {/* Ana İşlemler - Daha Büyük ve Görsel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Kulüp Yönetimi */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-blue-600" />
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
                  onClick={() => setShowAthleteModal(true)}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-800 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <Users className="h-5 w-5" />
                  <span>Sporcu Ekle</span>
                </button>
              </div>
            </div>
          </div>

          {/* Test Yönetimi */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Test Yönetimi
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowTestModal(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-purple-800 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <Trophy className="h-5 w-5" />
                  <span>Test Ekle</span>
                </button>
                <a
                  href="/test-session"
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-xl hover:from-orange-700 hover:to-orange-800 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <Play className="h-5 w-5" />
                  <span>Test Oturumu</span>
                </a>
              </div>
            </div>
          </div>

          {/* Dashboard */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Dashboard
              </h3>
              <div className="space-y-3">
                <a
                  href="/dashboard"
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-800 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <BarChart3 className="h-5 w-5" />
                  <span>Dashboard</span>
                </a>
              </div>
            </div>
          </div>

          {/* Hoca Paneli */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Hoca Paneli
              </h3>
              <div className="space-y-3">
                <a
                  href="/coach-panel"
                  className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-teal-800 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <Users className="h-5 w-5" />
                  <span>Hoca Paneli</span>
                </a>
                <a
                  href="/login"
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-purple-800 flex items-center justify-center space-x-2 transition-all duration-200"
                >
                  <QrCode className="h-5 w-5" />
                  <span>Hoca Girişi</span>
                </a>
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
                  Toplam Kulüp
                </p>
                <p className="text-3xl font-bold">{clubs.length}</p>
              </div>
              <Trophy className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">
                  Toplam Sporcu
                </p>
                <p className="text-3xl font-bold">{athletes.length}</p>
              </div>
              <Users className="h-12 w-12 text-green-200" />
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
              <BarChart3 className="h-12 w-12 text-yellow-200" />
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

        {/* Clubs List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Kulüpler</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {clubs.map((club) => (
              <div key={club.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {club.name}
                    </h3>
                    <p className="text-sm text-gray-600">{club.city}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {
                      athletes.filter((athlete) => athlete.club_id === club.id)
                        .length
                    }{" "}
                    sporcu
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Athletes List */}
        <div className="bg-white rounded-lg shadow mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Sporcular</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sporcu Kodu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ad Soyad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kulüp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Yaş
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Sayısı
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {athletes.map((athlete) => {
                  const age = athlete.birth_year
                    ? new Date().getFullYear() - athlete.birth_year
                    : 0;
                  const club = clubs.find((c) => c.id === athlete.club_id);

                  return (
                    <tr key={athlete.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {athlete.athlete_code || "Yok"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {athlete.first_name} {athlete.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {club?.name || "Bilinmiyor"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {age}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {athlete.testResults?.length || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Test Sessions List */}
        <div className="bg-white rounded-lg shadow mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Test Oturumları
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {testSessions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                Henüz test oturumu bulunmuyor
              </div>
            ) : (
              testSessions.map((session) => {
                const club = clubs.find((c) => c.id === session.club_id);
                const testCount = session.testResults?.length || 0;

                return (
                  <div key={session.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {club?.name || "Bilinmeyen Kulüp"}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {new Date(session.test_date).toLocaleDateString(
                                "tr-TR"
                              )}
                            </p>
                            {session.notes && (
                              <p className="text-sm text-gray-500 mt-1">
                                {session.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="text-center">
                          <div className="font-medium text-gray-900">
                            {testCount}
                          </div>
                          <div>Test</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-900">
                            {new Date(session.created_at).toLocaleDateString(
                              "tr-TR"
                            )}
                          </div>
                          <div>Oluşturuldu</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showClubModal && (
        <ClubModal
          onClose={() => setShowClubModal(false)}
          onSuccess={handleClubCreated}
        />
      )}

      {showAthleteModal && (
        <AthleteModal
          clubs={clubs}
          onClose={() => setShowAthleteModal(false)}
          onSuccess={handleAthleteCreated}
        />
      )}

      {showTestModal && (
        <TestModal
          clubs={clubs}
          athletes={athletes}
          onClose={() => setShowTestModal(false)}
          onSuccess={handleTestCreated}
        />
      )}
    </div>
  );
}
