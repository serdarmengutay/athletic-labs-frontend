"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  Search,
  Users,
  LogOut,
  ArrowLeft,
  Save,
  ChevronLeft,
  ChevronRight,
  Check,
  Trophy,
  AlertTriangle,
  X,
  Download,
} from "lucide-react";
import { mvpTestSessionApi } from "@/lib/api";

interface Measurements {
  height?: number;
  weight?: number;
  flexibility?: number;
  sprint30m?: number;
  sprint30mSecond?: number;
  agility?: number;
  verticalJump?: number;
  passCount?: number;
}

interface ParsedAthlete {
  fullName: string;
  birthDate: string;
  birthYear: number;
  athleteId?: string;
  athleteTestId?: string;
  measurements?: Measurements;
}

type ViewState = "list" | "detail";

const REQUIRED_FIELDS: { key: keyof Measurements; label: string }[] = [
  { key: "height", label: "Boy" },
  { key: "weight", label: "Kilo" },
  { key: "flexibility", label: "Esneklik" },
  { key: "sprint30m", label: "30m Sprint 1" },
  { key: "sprint30mSecond", label: "30m Sprint 2" },
  { key: "agility", label: "Çeviklik" },
  { key: "verticalJump", label: "Dikey Sıçrama" },
  { key: "passCount", label: "Pas" },
];

const getCompletionStatus = (
  measurements?: Measurements
): "not_started" | "partial" | "completed" => {
  if (!measurements) return "not_started";
  const filledCount = REQUIRED_FIELDS.filter(
    (f) => measurements[f.key] !== undefined && measurements[f.key] !== null
  ).length;
  if (filledCount === 0) return "not_started";
  if (filledCount === REQUIRED_FIELDS.length) return "completed";
  return "partial";
};

const getMissingFields = (measurements?: Measurements): string[] => {
  if (!measurements) return REQUIRED_FIELDS.map((f) => f.label);
  return REQUIRED_FIELDS.filter(
    (f) => measurements[f.key] === undefined || measurements[f.key] === null
  ).map((f) => f.label);
};

export default function TestDataEntryPage() {
  const router = useRouter();
  const [athletes, setAthletes] = useState<ParsedAthlete[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewState, setViewState] = useState<ViewState>("list");
  const [selectedAthleteIndex, setSelectedAthleteIndex] = useState<number>(0);
  const [currentMeasurements, setCurrentMeasurements] = useState<Measurements>(
    {}
  );
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [athleteChangeAnim, setAthleteChangeAnim] = useState(false);
  const [isTestCompleted, setIsTestCompleted] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [testSessionName, setTestSessionName] = useState("");
  const [testSessionDate, setTestSessionDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({
    current: 0,
    total: 0,
  });
  const [testSessionId, setTestSessionId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("parsedAthletes");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const athletesWithYear = parsed.map(
          (a: {
            fullName: string;
            birthDate: string;
            athleteId?: string;
            athleteTestId?: string;
            birthYear?: number;
            measurements?: Measurements;
          }) => ({
            ...a,
            birthYear: a.birthYear || extractBirthYear(a.birthDate),
            measurements: a.measurements || {},
          })
        );
        setAthletes(athletesWithYear);
      } catch (e) {
        console.error("Sporcu verileri yüklenirken hata:", e);
      }
    }
    const sessionName = localStorage.getItem("testSessionName");
    if (sessionName) setTestSessionName(sessionName);
    const sessionDate = localStorage.getItem("testSessionDate");
    if (sessionDate) setTestSessionDate(sessionDate);
    const sessionId = localStorage.getItem("testSessionId");
    if (sessionId) setTestSessionId(sessionId);
    const completed = localStorage.getItem("testCompleted");
    if (completed === "true") setIsTestCompleted(true);
  }, []);

  const extractBirthYear = (birthDate: string): number => {
    const parts = birthDate.split("/");
    const yearPart = parts[parts.length - 1];
    const year = parseInt(yearPart, 10);
    return isNaN(year) ? 0 : year;
  };

  const availableYears = useMemo(() => {
    const years = [...new Set(athletes.map((a) => a.birthYear))].filter(
      (y) => y > 0
    );
    return years.sort((a, b) => b - a);
  }, [athletes]);

  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === null) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const filteredAthletes = useMemo(() => {
    let result = athletes;
    if (selectedYear)
      result = result.filter((a) => a.birthYear === selectedYear);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((a) => a.fullName.toLowerCase().includes(query));
    }
    result.sort((a, b) => {
      if (a.birthYear !== b.birthYear) return a.birthYear - b.birthYear;
      return a.fullName.localeCompare(b.fullName, "tr");
    });
    return result;
  }, [athletes, selectedYear, searchQuery]);

  const selectedAthlete = filteredAthletes[selectedAthleteIndex];

  const completedAthletes = athletes.filter(
    (a) => getCompletionStatus(a.measurements) === "completed"
  );
  const incompleteAthletes = athletes.filter(
    (a) => getCompletionStatus(a.measurements) !== "completed"
  );
  const allCompleted = incompleteAthletes.length === 0 && athletes.length > 0;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Çıkış yapılırken hata:", error);
    }
  };

  const handleAthleteClick = (index: number) => {
    setSelectedAthleteIndex(index);
    setCurrentMeasurements(filteredAthletes[index].measurements || {});
    setViewState("detail");
  };

  const handleMeasurementChange = (key: string, value: string) => {
    const numValue = value === "" ? undefined : parseFloat(value);
    setCurrentMeasurements((prev) => ({ ...prev, [key]: numValue }));
  };

  const handleSave = async () => {
    if (!selectedAthlete) return;

    if (!selectedAthlete.athleteTestId) {
      alert(
        "Bu sporcu backend oturumuna bağlı değil. Lütfen ana ekrandan yeni bir test oturumu başlatın."
      );
      return;
    }

    const updatedAthletes = athletes.map((a) => {
      if (
        a.fullName === selectedAthlete.fullName &&
        a.birthDate === selectedAthlete.birthDate
      ) {
        return { ...a, measurements: currentMeasurements };
      }
      return a;
    });
    setAthletes(updatedAthletes);
    localStorage.setItem("parsedAthletes", JSON.stringify(updatedAthletes));

    try {
      await mvpTestSessionApi.saveMeasurements(
        selectedAthlete.athleteTestId,
        currentMeasurements
      );
      console.log("Sporcu backend'e kaydedildi:", {
        ...selectedAthlete,
        measurements: currentMeasurements,
      });
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (error: unknown) {
      console.error("Ölçüm kaydetme hatası:", error);
      const apiMessage =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      alert(
        apiMessage ||
          "Ölçümler backend'e kaydedilemedi. Lütfen tekrar deneyin."
      );
    }
  };

  const handlePrevAthlete = () => {
    if (selectedAthleteIndex > 0) {
      const newIndex = selectedAthleteIndex - 1;
      setSelectedAthleteIndex(newIndex);
      setCurrentMeasurements(filteredAthletes[newIndex].measurements || {});
      triggerAthleteChangeAnim();
    }
  };

  const handleNextAthlete = () => {
    if (selectedAthleteIndex < filteredAthletes.length - 1) {
      const newIndex = selectedAthleteIndex + 1;
      setSelectedAthleteIndex(newIndex);
      setCurrentMeasurements(filteredAthletes[newIndex].measurements || {});
      triggerAthleteChangeAnim();
    }
  };

  const triggerAthleteChangeAnim = () => {
    setAthleteChangeAnim(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setAthleteChangeAnim(false), 500);
  };

  const handleCompleteTest = () => {
    if (!allCompleted) {
      setShowMissingModal(true);
      return;
    }
    completeTest();
  };

  const completeTest = async () => {
    setIsExporting(true);
    setExportProgress({ current: 0, total: athletes.length });

    try {
      // Import export utility dynamically
      const { exportReportsToZip } = await import("@/utils/reportExport");
      if (!testSessionId) {
        throw new Error(
          "Test session ID bulunamadı. Lütfen yeni bir test oturumu başlatın."
        );
      }

      for (let i = 0; i < athletes.length; i++) {
        const athlete = athletes[i];
        if (!athlete.athleteTestId || !athlete.measurements) {
          throw new Error(`${athlete.fullName} backend oturumuna bağlı değil.`);
        }

        await mvpTestSessionApi.saveMeasurements(
          athlete.athleteTestId,
          athlete.measurements
        );
        setExportProgress({ current: i + 1, total: athletes.length });
      }

      const response = await mvpTestSessionApi.calculateReport(testSessionId);
      const reportSession = response.data;

      if (!reportSession.athletes?.length) {
        throw new Error("Backend rapor içinde sporcu döndürmedi.");
      }
      if (!reportSession.testDate && testSessionDate) {
        reportSession.testDate = testSessionDate;
      }

      const measurementByAthleteId = new Map(
        athletes
          .filter((athlete) => athlete.athleteId)
          .map((athlete) => [athlete.athleteId, athlete.measurements])
      );
      reportSession.athletes = reportSession.athletes.map((report) => ({
        ...report,
        measurements: measurementByAthleteId.get(report.athleteId),
      }));

      // Export to ZIP with progress callback
      await exportReportsToZip(
        reportSession,
        testSessionName || "Test_Oturumu",
        (current, total) => {
          setExportProgress({ current, total });
        }
      );

      // Mark as completed
      setIsTestCompleted(true);
      localStorage.setItem("testCompleted", "true");

      // Console log for debugging
      console.log("========================================");
      console.log("TEST OTURUMU TAMAMLANDI - RAPORLAR İNDİRİLDİ");
      console.log("========================================");
      console.log(`Toplam ${reportSession.athletes.length} rapor export edildi`);
    } catch (error) {
      console.error("Export error:", error);
      alert("Raporlar export edilirken hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  const handleBack = () => {
    if (viewState === "detail") setViewState("list");
    else router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Floating Status Card */}
      <div className="fixed top-4 right-4 z-40 bg-white rounded-xl shadow-xl border p-4 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
            {testSessionName || "Test Oturumu"}
          </span>
          {isTestCompleted ? (
            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
              ✓
            </span>
          ) : (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              Aktif
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{athletes.length} sporcu</span>
          <span
            className={`font-bold ${
              allCompleted ? "text-green-600" : "text-blue-600"
            }`}
          >
            {completedAthletes.length}/{athletes.length}
          </span>
        </div>
        {isTestCompleted && (
          <div className="mt-2 pt-2 border-t text-center">
            <span className="text-green-600 font-semibold text-sm">
              Test Tamamlandı
            </span>
          </div>
        )}
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Geri</span>
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              {viewState === "list" ? "Test Verisi Girişi" : "Ölçüm Girişi"}
            </h1>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {athletes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">
              Henüz sporcu verisi yüklenmemiş
            </p>
            <button
              onClick={() => router.push("/")}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Ana sayfaya git ve Excel yükle
            </button>
          </div>
        ) : viewState === "list" ? (
          <div className="space-y-4">
            {/* Compact Filters Row */}
            <div className="bg-white rounded-xl shadow-sm border p-3">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                {/* Birth Year Tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {availableYears.map((year) => {
                    const count = athletes.filter(
                      (a) => a.birthYear === year
                    ).length;
                    const isSelected = selectedYear === year;
                    return (
                      <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        {year}{" "}
                        <span
                          className={
                            isSelected ? "text-blue-100" : "text-gray-400"
                          }
                        >
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* Search */}
                <div className="flex-1 lg:max-w-xs">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Sporcu ara..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Test Button */}
            {!isTestCompleted && (
              <div className="space-y-3">
                <button
                  onClick={handleCompleteTest}
                  disabled={isExporting}
                  className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all ${
                    allCompleted && !isExporting
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl"
                      : "bg-gray-100 text-gray-500 border-2 border-dashed border-gray-300 cursor-not-allowed"
                  }`}
                >
                  {isExporting ? (
                    <>
                      <Download className="h-5 w-5 animate-bounce" />
                      <span>Raporlar Hazırlanıyor...</span>
                    </>
                  ) : (
                    <>
                      <Trophy className="h-5 w-5" />
                      <span>
                        {allCompleted
                          ? "Testi Tamamla ve Raporları İndir"
                          : `Testi Tamamla (${incompleteAthletes.length} eksik)`}
                      </span>
                    </>
                  )}
                </button>

                {/* Export Progress */}
                {isExporting && exportProgress.total > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-800 font-medium text-sm">
                        Rapor {exportProgress.current} / {exportProgress.total}
                      </span>
                      <span className="text-blue-600 text-sm">
                        {Math.round(
                          (exportProgress.current / exportProgress.total) * 100
                        )}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            (exportProgress.current / exportProgress.total) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Test Completed Banner */}
            {isTestCompleted && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
                <Trophy className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">
                    Test Tamamlandı!
                  </p>
                  <p className="text-sm text-green-600">
                    Tüm veriler konsola yazdırıldı
                  </p>
                </div>
              </div>
            )}

            {/* Count */}
            <div className="flex items-center justify-between text-sm text-gray-600 px-1">
              <span>{selectedYear} doğumlu</span>
              <span>{filteredAthletes.length} sporcu</span>
            </div>

            {/* Athlete List */}
            {filteredAthletes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {searchQuery
                    ? "Arama sonucu bulunamadı"
                    : "Sporcu bulunamadı"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredAthletes.map((athlete, index) => {
                  const status = getCompletionStatus(athlete.measurements);
                  return (
                    <button
                      key={index}
                      onClick={() => handleAthleteClick(index)}
                      className={`bg-white rounded-lg shadow-sm border p-3 flex items-center justify-between hover:shadow-md transition-all ${
                        status === "completed"
                          ? "border-green-300 bg-green-50/50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            status === "completed"
                              ? "bg-green-500"
                              : status === "partial"
                              ? "bg-yellow-500"
                              : "bg-gray-400"
                          }`}
                        >
                          {status === "completed" ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            athlete.fullName
                              .split(" ")
                              .map((n) => n.charAt(0))
                              .slice(0, 2)
                              .join("")
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 text-sm">
                            {athlete.fullName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {athlete.birthYear}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ATHLETE DETAIL */
          <div className="space-y-4">
            {/* Athlete Header */}
            <div
              className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${
                athleteChangeAnim ? "ring-2 ring-blue-400" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                      getCompletionStatus(currentMeasurements) === "completed"
                        ? "bg-green-500"
                        : "bg-blue-500"
                    }`}
                  >
                    {getCompletionStatus(currentMeasurements) ===
                    "completed" ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      selectedAthlete?.fullName
                        .split(" ")
                        .map((n) => n.charAt(0))
                        .slice(0, 2)
                        .join("")
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {selectedAthlete?.fullName}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {selectedAthlete?.birthYear} doğumlu
                    </p>
                  </div>
                </div>
                <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {selectedAthleteIndex + 1}/{filteredAthletes.length}
                </div>
              </div>
            </div>

            {/* Measurement Inputs - Grouped Rows */}
            <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
              {/* Row 1: Height, Weight, Flexibility */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    📏 Boy (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentMeasurements.height ?? ""}
                    onChange={(e) =>
                      handleMeasurementChange("height", e.target.value)
                    }
                    placeholder="Boy"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={isTestCompleted}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    ⚖️ Kilo (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentMeasurements.weight ?? ""}
                    onChange={(e) =>
                      handleMeasurementChange("weight", e.target.value)
                    }
                    placeholder="Kilo"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={isTestCompleted}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🤸 Esneklik (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentMeasurements.flexibility ?? ""}
                    onChange={(e) =>
                      handleMeasurementChange("flexibility", e.target.value)
                    }
                    placeholder="Esneklik"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={isTestCompleted}
                  />
                </div>
              </div>
              {/* Row 2: Sprint 1, Sprint 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🏃 30m Sprint 1 (sn)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentMeasurements.sprint30m ?? ""}
                    onChange={(e) =>
                      handleMeasurementChange("sprint30m", e.target.value)
                    }
                    placeholder="1. Koşu"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={isTestCompleted}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🏃 30m Sprint 2 (sn)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentMeasurements.sprint30mSecond ?? ""}
                    onChange={(e) =>
                      handleMeasurementChange("sprint30mSecond", e.target.value)
                    }
                    placeholder="2. Koşu"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={isTestCompleted}
                  />
                </div>
              </div>
              {/* Row 3: Agility, Vertical Jump, Pass */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🔄 Çeviklik (sn)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentMeasurements.agility ?? ""}
                    onChange={(e) =>
                      handleMeasurementChange("agility", e.target.value)
                    }
                    placeholder="Çeviklik"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={isTestCompleted}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    ⬆️ Dikey Sıçrama (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentMeasurements.verticalJump ?? ""}
                    onChange={(e) =>
                      handleMeasurementChange("verticalJump", e.target.value)
                    }
                    placeholder="Dikey Sıçrama"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={isTestCompleted}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    ⚽ Pas (30 sn)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={currentMeasurements.passCount ?? ""}
                    onChange={(e) =>
                      handleMeasurementChange("passCount", e.target.value)
                    }
                    placeholder="Pas adedi"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={isTestCompleted}
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            {!isTestCompleted && (
              <button
                onClick={handleSave}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-lg hover:bg-blue-700 transition-all"
              >
                <Save className="h-5 w-5" />
                <span>Kaydet</span>
              </button>
            )}

            {/* Success Message */}
            {showSaveSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-green-700 font-medium text-sm">
                  Kaydedildi!
                </span>
              </div>
            )}

            {/* Nav Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePrevAthlete}
                disabled={selectedAthleteIndex === 0}
                className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all ${
                  selectedAthleteIndex === 0
                    ? "bg-gray-100 text-gray-400"
                    : "bg-white text-gray-700 shadow-sm border hover:shadow-md"
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
                <span>Önceki</span>
              </button>
              <button
                onClick={handleNextAthlete}
                disabled={selectedAthleteIndex === filteredAthletes.length - 1}
                className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all ${
                  selectedAthleteIndex === filteredAthletes.length - 1
                    ? "bg-gray-100 text-gray-400"
                    : "bg-white text-gray-700 shadow-sm border hover:shadow-md"
                }`}
              >
                <span>Sonraki</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Missing Data Modal */}
      {showMissingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="bg-red-500 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-white" />
                <h3 className="text-lg font-bold text-white">Eksik Veriler</h3>
              </div>
              <button
                onClick={() => setShowMissingModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              <p className="text-gray-700 mb-4">
                Test tamamlanmadan önce aşağıdaki sporcuların eksik verilerini
                girmeniz gerekiyor:
              </p>
              <div className="space-y-3">
                {incompleteAthletes.map((athlete, idx) => {
                  const missing = getMissingFields(athlete.measurements);
                  return (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {athlete.fullName
                            .split(" ")
                            .map((n) => n.charAt(0))
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <span className="font-medium text-gray-900">
                          {athlete.fullName}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({athlete.birthYear})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 ml-10">
                        {missing.map((field, fidx) => (
                          <span
                            key={fidx}
                            className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-5 border-t bg-gray-50">
              <button
                onClick={() => setShowMissingModal(false)}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                Anladım, Devam Et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
