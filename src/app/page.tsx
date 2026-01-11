"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  Play,
  Users,
  Trophy,
  BarChart3,
  FileText,
  Calendar,
  ArrowRight,
  CheckCircle,
  ClipboardList,
  LogOut,
  Upload,
} from "lucide-react";
import { clubApi, athleteApi, testApi } from "@/lib/api";
import { Club, Athlete, TestSession } from "@/types";
import * as XLSX from "xlsx";

interface ParsedAthlete {
  fullName: string;
  birthDate: string;
}

export default function Home() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Test Oturumu Form State
  const [formData, setFormData] = useState({
    clubName: "",
    clubResponsible: "",
    city: "",
    email: "",
    phone: "",
    sportType: "",
    testDate: "",
  });

  // Sporcu Import State
  const [parsedAthletes, setParsedAthletes] = useState<ParsedAthlete[]>([]);

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Çıkış yapılırken hata:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitTestSession = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Test Oturumu Verileri:", formData);
    console.log("İçe Aktarılan Sporcular:", parsedAthletes);

    if (parsedAthletes.length === 0) {
      alert("Lütfen önce sporcu verilerini yükleyin!");
      return;
    }

    let sessionId: string | null = null;

    try {
      // Backend'de test session oluştur
      const sessionResponse = await testApi.createSession({
        club_id: formData.clubName || "default-club",
        test_date: new Date().toISOString().split("T")[0],
        notes: `Test oturumu - ${parsedAthletes.length} sporcu`,
      });

      sessionId = sessionResponse.data?.id || sessionResponse.data?.data?.id;
      console.log("Backend'den alınan Session ID:", sessionId);
    } catch (error: any) {
      console.error("Backend session oluşturma hatası:", error);
      // Fallback: Geçici UUID oluştur
      sessionId = crypto.randomUUID();
      console.log("Fallback Session ID oluşturuldu:", sessionId);
    }

    // Verileri localStorage'a kaydet
    localStorage.setItem("parsedAthletes", JSON.stringify(parsedAthletes));
    localStorage.setItem(
      "testSessionName",
      formData.clubName || "Test Oturumu"
    );
    localStorage.setItem("testSessionId", sessionId || crypto.randomUUID());
    localStorage.removeItem("testCompleted");

    router.push("/test-data-entry");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

      // Skip header row if exists, parse rows
      const athletes: ParsedAthlete[] = jsonData
        .slice(1) // Skip header
        .filter((row) => row.length >= 2 && row[0]) // Filter empty rows
        .map((row) => ({
          fullName: String(row[0] || "").trim(),
          birthDate: String(row[1] || "").trim(),
        }));

      setParsedAthletes(athletes);
      console.log("Parsed Athletes:", athletes);
    };
    reader.readAsBinaryString(file);
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
      {/* Logout Button - Top Right */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-lg shadow hover:bg-gray-50 transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          <span>Çıkış Yap</span>
        </button>
      </div>

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
          </div>
        </div>

        {/* Ana İşlemler */}
        <div className="space-y-8">
          {/* Test Oturumu Oluştur - Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Test Oturumu Oluştur
              </h2>
              <p className="text-lg text-gray-600">
                Yeni bir test oturumu başlatmak için bilgileri doldurun
              </p>
            </div>

            <form onSubmit={handleSubmitTestSession} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Club Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kulüp Adı
                  </label>
                  <input
                    type="text"
                    name="clubName"
                    value={formData.clubName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    placeholder="Örn: Galatasaray SK"
                  />
                </div>

                {/* Club Responsible */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kulüp Yetkilisi
                  </label>
                  <input
                    type="text"
                    name="clubResponsible"
                    value={formData.clubResponsible}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    placeholder="Ad Soyad"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Şehir
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    placeholder="Örn: İstanbul"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-posta
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    placeholder="yetkili@kulup.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    placeholder="0532 XXX XX XX"
                  />
                </div>

                {/* Sport Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Spor Dalı
                  </label>
                  <input
                    type="text"
                    name="sportType"
                    value={formData.sportType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    placeholder="Örn: Futbol"
                  />
                </div>

                {/* Test Date */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Tarihi
                  </label>
                  <input
                    type="date"
                    name="testDate"
                    value={formData.testDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="text-center pt-4">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 flex items-center justify-center space-x-3 mx-auto transition-all duration-200 text-lg font-semibold"
                >
                  <Play className="h-6 w-6" />
                  <span>Test Oturumu Başlat</span>
                  <ArrowRight className="h-6 w-6" />
                </button>
              </div>
            </form>
          </div>

          {/* Sporcu Verilerini İçe Aktar */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Sporcu Verilerini İçe Aktar
              </h2>
              <p className="text-gray-600">
                Excel veya CSV dosyasından sporcu listesini yükleyin
              </p>
            </div>

            {/* File Upload */}
            <div className="flex justify-center mb-6">
              <label className="cursor-pointer">
                <div className="flex items-center space-x-3 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-200">
                  <Upload className="h-5 w-5" />
                  <span>Excel/CSV Dosyası Seç</span>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preview Table */}
            {parsedAthletes.length > 0 && (
              <div className="overflow-x-auto">
                <p className="text-sm text-gray-600 mb-3">
                  {parsedAthletes.length} sporcu bulundu
                </p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b">
                        #
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b">
                        Ad Soyad
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b">
                        Doğum Tarihi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedAthletes.map((athlete, index) => (
                      <tr
                        key={index}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                        <td className="px-4 py-3 text-gray-900">
                          {athlete.fullName}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {athlete.birthDate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
