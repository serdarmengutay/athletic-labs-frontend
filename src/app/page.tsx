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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Athletic Labs
              </h1>
              <p className="text-gray-600">Sporcu Performans Takip Sistemi</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                onClick={() => setShowClubModal(true)}
                className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <Plus className="h-4 w-4" />
                <span>Kulüp Ekle</span>
              </button>
              <button
                onClick={() => setShowAthleteModal(true)}
                className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <Users className="h-4 w-4" />
                <span>Sporcu Ekle</span>
              </button>
              <button
                onClick={() => setShowTestModal(true)}
                className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <Trophy className="h-4 w-4" />
                <span>Test Ekle</span>
              </button>
              <a
                href="/test-session"
                className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <Play className="h-4 w-4" />
                <span>Test Oturumu</span>
              </a>
              <a
                href="/dashboard"
                className="bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard</span>
              </a>
              <a
                href="/coach-panel"
                className="bg-teal-600 text-white px-4 py-3 rounded-lg hover:bg-teal-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <Users className="h-4 w-4" />
                <span>Hoca Paneli</span>
              </a>
              <a
                href="/login"
                className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <QrCode className="h-4 w-4" />
                <span>Hoca Girişi</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Trophy className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Toplam Kulüp
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {clubs.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Toplam Sporcu
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {athletes.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Test Oturumu
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {testSessions.length}
                </p>
              </div>
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
                  const age =
                    new Date().getFullYear() -
                    new Date(athlete.birth_date).getFullYear();
                  const club = clubs.find((c) => c.id === athlete.club_id);

                  return (
                    <tr key={athlete.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {athlete.uuid}
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
