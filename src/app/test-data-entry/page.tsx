"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  ScanLine,
} from "lucide-react";
import { mvpTestSessionApi } from "@/lib/api";
import QRScanner from "@/components/QRScanner";
import {
  getSportTestConfig,
  MeasurementKey,
  MeasurementFieldConfig,
} from "@/lib/sportTestConfig";
import {
  DEFAULT_VALD_SESSION_CONFIG,
  normalizeValdSessionConfig,
  ValdSessionConfig,
} from "@/lib/valdConfig";
import {
  getQueuedMeasurementCount,
  getQueuedMeasurementSaves,
  getQueuedXOneQrImportCount,
  getQueuedXOneQrImports,
  queueMeasurementSave,
  queueXOneQrImport,
  removeQueuedMeasurementSave,
  removeQueuedXOneQrImport,
  updateQueuedXOneQrImport,
} from "@/lib/offlineMeasurements";

type Measurements = Partial<Record<MeasurementKey, number>>;

interface ParsedAthlete {
  fullName: string;
  birthDate: string;
  birthYear: number;
  athleteId?: string;
  athleteTestId?: string;
  measurements?: Measurements;
  source?: "backend" | "local";
  status?: "active" | "absent" | "skipped";
  xOneQrImported?: boolean;
  xOneReportId?: string;
  xOneImportedAt?: string;
}

interface SessionAthleteResponseItem {
  athleteTestId: string;
  athleteId?: string;
  fullName: string;
  birthDate?: string | null;
  birthYear: number;
  measurement?: Measurements | null;
  status?: "active" | "absent" | "skipped";
  xOneQrImported?: boolean;
  xOneReportId?: string | null;
  xOneImportedAt?: string | null;
}

type ViewState = "list" | "detail";

const getCompletionStatus = (
  fields: MeasurementFieldConfig[],
  measurements?: Measurements
): "not_started" | "partial" | "completed" => {
  if (!measurements) return "not_started";
  const requiredFields = fields.filter((field) => field.required);
  const filledCount = requiredFields.filter(
    (f) => measurements[f.key] !== undefined && measurements[f.key] !== null
  ).length;
  if (filledCount === 0) return "not_started";
  if (filledCount === requiredFields.length) return "completed";
  return "partial";
};

const getMissingFields = (
  fields: MeasurementFieldConfig[],
  measurements?: Measurements
): string[] => {
  const requiredFields = fields.filter((field) => field.required);
  if (!measurements) return requiredFields.map((f) => f.label);
  return requiredFields.filter(
    (f) => measurements[f.key] === undefined || measurements[f.key] === null
  ).map((f) => f.label);
};

const normalizeSearchValue = (value: unknown) =>
  String(value ?? "").trim().toLocaleLowerCase("tr");

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
  const [saveStatus, setSaveStatus] = useState<"idle" | "synced" | "queued">(
    "idle"
  );
  const [athleteChangeAnim, setAthleteChangeAnim] = useState(false);
  const [isTestCompleted, setIsTestCompleted] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [testSessionName, setTestSessionName] = useState("");
  const [testSessionDate, setTestSessionDate] = useState("");
  const [testSessionSportType, setTestSessionSportType] = useState("");
  const [testSessionValdEnabled, setTestSessionValdEnabled] = useState(false);
  const [testSessionValdConfig, setTestSessionValdConfig] =
    useState<ValdSessionConfig>(DEFAULT_VALD_SESSION_CONFIG);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [exportProgress, setExportProgress] = useState({
    current: 0,
    total: 0,
  });
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [absentAthleteKeys, setAbsentAthleteKeys] = useState<string[]>([]);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    fullName: "",
    birthDate: "",
  });
  const [xOneQrUrl, setXOneQrUrl] = useState("");
  const [isImportingXOne, setIsImportingXOne] = useState(false);
  const [showXOneScanner, setShowXOneScanner] = useState(false);
  const [showXOneUrlFallback, setShowXOneUrlFallback] = useState(false);
  const dirtyMeasurementKeysRef = useRef<Set<MeasurementKey>>(new Set());
  const sportConfig = useMemo(
    () => getSportTestConfig(testSessionSportType),
    [testSessionSportType]
  );
  const testFields = sportConfig.fields;
  const valdDisabledFieldSet = useMemo(
    () =>
      new Set<MeasurementKey>([
        ...testSessionValdConfig.disabledManualFields,
        ...(testSessionValdEnabled ? (["verticalJump"] as MeasurementKey[]) : []),
      ]),
    [testSessionValdConfig.disabledManualFields, testSessionValdEnabled]
  );
  const manualTestFields = useMemo(
    () =>
      testSessionValdEnabled
        ? testFields.filter((field) => !valdDisabledFieldSet.has(field.key))
        : testFields,
    [testFields, testSessionValdEnabled, valdDisabledFieldSet]
  );
  const sessionGender: "male" | "female" =
    sportConfig.id === "volleyball_girls" ? "female" : "male";

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
            xOneQrImported?: boolean;
            xOneReportId?: string;
            xOneImportedAt?: string;
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
    const sessionSportType = localStorage.getItem("testSessionSportType");
    if (sessionSportType) setTestSessionSportType(sessionSportType);
    setTestSessionValdEnabled(
      localStorage.getItem("testSessionValdEnabled") === "true"
    );
    const storedValdConfig = localStorage.getItem("testSessionValdConfig");
    if (storedValdConfig) {
      try {
        setTestSessionValdConfig(
          normalizeValdSessionConfig(JSON.parse(storedValdConfig))
        );
      } catch {
        setTestSessionValdConfig(DEFAULT_VALD_SESSION_CONFIG);
      }
    }
    const sessionId = localStorage.getItem("testSessionId");
    if (sessionId) {
      setTestSessionId(sessionId);
      loadSessionAthletes(sessionId);
    }
    const absentKeys = localStorage.getItem("absentAthleteKeys");
    if (absentKeys) setAbsentAthleteKeys(JSON.parse(absentKeys));
    refreshPendingSyncCount();
  }, []);

  useEffect(() => {
    const syncQueuedSaves = async () => {
      if (!navigator.onLine) return;

      const queuedSaves = await getQueuedMeasurementSaves();
      for (const queuedSave of queuedSaves) {
        try {
          await mvpTestSessionApi.saveMeasurements(
            queuedSave.athleteTestId,
            queuedSave.measurements
          );
          await removeQueuedMeasurementSave(queuedSave.id);
        } catch (error) {
          console.error("Bekleyen ölçüm senkronlanamadı:", error);
          break;
        }
      }

      const queuedXOneImports = await getQueuedXOneQrImports();
      const refreshedSessionIds = new Set<string>();
      for (const queuedImport of queuedXOneImports) {
        try {
          const response = await mvpTestSessionApi.importXOneQr(
            queuedImport.testSessionId,
            {
              athleteId: queuedImport.athleteId,
              qrUrl: queuedImport.qrUrl,
            }
          );
          logYoujiuDeviceData(response.data);
          await removeQueuedXOneQrImport(queuedImport.id);
          refreshedSessionIds.add(queuedImport.testSessionId);
        } catch (error) {
          const nextQueuedImport = {
            ...queuedImport,
            attempts: queuedImport.attempts + 1,
            lastError:
              error instanceof Error
                ? error.message
                : "Youjiu QR senkronlanamadı",
          };
          await updateQueuedXOneQrImport(nextQueuedImport);
          console.error("Bekleyen Youjiu QR senkronlanamadı:", error);
          break;
        }
      }
      for (const refreshedSessionId of refreshedSessionIds) {
        try {
          await refreshAthletesFromBackend(refreshedSessionId);
        } catch (error) {
          console.error("Senkron sonrası sporcu listesi yenilenemedi:", error);
        }
      }
      refreshPendingSyncCount();
    };

    syncQueuedSaves();
    window.addEventListener("online", syncQueuedSaves);
    return () => window.removeEventListener("online", syncQueuedSaves);
  }, []);

  const extractBirthYear = (birthDate: string): number => {
    const parts = birthDate.split(/[./-]/);
    const yearPart =
      parts.find((part) => part.length === 4) || parts.at(-1) || "";
    const year = parseInt(yearPart, 10);
    return isNaN(year) ? 0 : year;
  };

  const mapBackendAthlete = (
    athlete: SessionAthleteResponseItem
  ): ParsedAthlete => ({
    fullName: athlete.fullName,
    birthDate:
      athlete.birthDate?.slice(0, 10) || `${athlete.birthYear || 0}-01-01`,
    birthYear: athlete.birthYear,
    athleteId: athlete.athleteId,
    athleteTestId: athlete.athleteTestId,
    measurements: athlete.measurement || {},
    source: "backend",
    status: athlete.status || "active",
    xOneQrImported: athlete.xOneQrImported || Boolean(athlete.xOneReportId),
    xOneReportId: athlete.xOneReportId || undefined,
    xOneImportedAt: athlete.xOneImportedAt || undefined,
  });

  const refreshAthletesFromBackend = async (sessionId: string) => {
    const response = await mvpTestSessionApi.getAthletes(sessionId);
    const mappedAthletes = response.data.data.athletes.map(
      (athlete: SessionAthleteResponseItem) => mapBackendAthlete(athlete)
    );
    persistAthletes(mappedAthletes);
  };

  const persistAthletes = (nextAthletes: ParsedAthlete[]) => {
    setAthletes(nextAthletes);
    localStorage.setItem("parsedAthletes", JSON.stringify(nextAthletes));
  };

  const getAthleteKey = (athlete: ParsedAthlete) =>
    athlete.athleteTestId || `${athlete.fullName}-${athlete.birthDate}`;

  const persistAbsentAthleteKeys = (keys: string[]) => {
    setAbsentAthleteKeys(keys);
    localStorage.setItem("absentAthleteKeys", JSON.stringify(keys));
  };

  const refreshPendingSyncCount = async () => {
    if (typeof window === "undefined") return;
    const [measurementCount, xOneImportCount] = await Promise.all([
      getQueuedMeasurementCount(),
      getQueuedXOneQrImportCount(),
    ]);
    setPendingSyncCount(measurementCount + xOneImportCount);
  };

  const loadSessionAthletes = async (sessionId: string) => {
    try {
      const response = await mvpTestSessionApi.getAthletes(sessionId);
      const backendAthletes = response.data?.data?.athletes;
      if (!Array.isArray(backendAthletes)) return;

      const mappedAthletes = backendAthletes.map((athlete) =>
        mapBackendAthlete(athlete as SessionAthleteResponseItem)
      );
      persistAthletes(mappedAthletes);
    } catch (error) {
      console.error("Backend sporcu listesi yüklenemedi:", error);
    }
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
    let result = athletes.filter(
      (athlete) => !absentAthleteKeys.includes(getAthleteKey(athlete))
    );
    if (selectedYear)
      result = result.filter((a) => a.birthYear === selectedYear);
    if (searchQuery.trim()) {
      const query = normalizeSearchValue(searchQuery);
      result = result.filter((athlete) =>
        normalizeSearchValue(
          `${athlete.fullName} ${athlete.birthDate} ${athlete.birthYear}`
        ).includes(query)
      );
    }
    result.sort((a, b) => {
      if (a.birthYear !== b.birthYear) return a.birthYear - b.birthYear;
      return a.fullName.localeCompare(b.fullName, "tr");
    });
    return result;
  }, [absentAthleteKeys, athletes, selectedYear, searchQuery]);

  const absentAthletes = useMemo(() => {
    let result = athletes.filter((athlete) =>
      absentAthleteKeys.includes(getAthleteKey(athlete))
    );
    if (selectedYear)
      result = result.filter((a) => a.birthYear === selectedYear);
    if (searchQuery.trim()) {
      const query = normalizeSearchValue(searchQuery);
      result = result.filter((athlete) =>
        normalizeSearchValue(
          `${athlete.fullName} ${athlete.birthDate} ${athlete.birthYear}`
        ).includes(query)
      );
    }
    result.sort((a, b) => {
      if (a.birthYear !== b.birthYear) return a.birthYear - b.birthYear;
      return a.fullName.localeCompare(b.fullName, "tr");
    });
    return result;
  }, [absentAthleteKeys, athletes, selectedYear, searchQuery]);

  const selectedAthlete = filteredAthletes[selectedAthleteIndex];

  const activeAthletes = athletes.filter(
    (athlete) => !absentAthleteKeys.includes(getAthleteKey(athlete))
  );
  const incompleteAthletes = activeAthletes.filter(
    (a) => getCompletionStatus(manualTestFields, a.measurements) !== "completed"
  );
  const allCompleted =
    incompleteAthletes.length === 0 && activeAthletes.length > 0;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Çıkış yapılırken hata:", error);
    }
  };

  const refreshFocusedAthlete = async (athleteTestId: string) => {
    if (!navigator.onLine) return;
    const response = await mvpTestSessionApi.getMeasurements(athleteTestId);
    const fresh = response.data?.data;
    if (!fresh) return;
    const backendMeasurements = (fresh.measurement || {}) as Measurements;

    setCurrentMeasurements((current) => {
      const merged = { ...backendMeasurements };
      dirtyMeasurementKeysRef.current.forEach((key) => {
        if (current[key] !== undefined) merged[key] = current[key];
      });
      return merged;
    });
    setAthletes((currentAthletes) => {
      const nextAthletes = currentAthletes.map((athlete) =>
        athlete.athleteTestId === athleteTestId
          ? {
              ...athlete,
              measurements: backendMeasurements,
              status: fresh.status || athlete.status,
              xOneQrImported: Boolean(fresh.xOneQrImported),
              xOneReportId: fresh.xOneReportId || undefined,
              xOneImportedAt: fresh.xOneImportedAt || undefined,
            }
          : athlete
      );
      localStorage.setItem("parsedAthletes", JSON.stringify(nextAthletes));
      return nextAthletes;
    });
  };

  useEffect(() => {
    const athleteTestId =
      viewState === "detail" ? selectedAthlete?.athleteTestId : undefined;
    if (!athleteTestId || showXOneScanner) return;

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      refreshFocusedAthlete(athleteTestId).catch((error) =>
        console.error("Canlı ölçüm senkronizasyonu başarısız:", error)
      );
    };
    const intervalId = window.setInterval(refresh, 2500);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
    };
  }, [
    viewState,
    selectedAthlete?.athleteTestId,
    testSessionId,
    showXOneScanner,
  ]);

  const openAthlete = (index: number) => {
    const athlete = filteredAthletes[index];
    if (!athlete) return;
    dirtyMeasurementKeysRef.current.clear();
    setSelectedAthleteIndex(index);
    setCurrentMeasurements(athlete.measurements || {});
    setViewState("detail");
    if (athlete.athleteTestId) {
      refreshFocusedAthlete(athlete.athleteTestId).catch((error) =>
        console.error("Sporcu ölçümleri yenilenemedi:", error)
      );
    }
  };

  const handleAthleteClick = (index: number) => openAthlete(index);

  const handleMeasurementChange = (key: string, value: string) => {
    dirtyMeasurementKeysRef.current.add(key as MeasurementKey);
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

    const changedMeasurements = Object.fromEntries(
      [...dirtyMeasurementKeysRef.current]
        .map((key) => [key, currentMeasurements[key]])
        .filter(([, value]) => value !== undefined)
    ) as Measurements;

    if (Object.keys(changedMeasurements).length === 0) {
      await refreshFocusedAthlete(selectedAthlete.athleteTestId);
      setSaveStatus("synced");
      return;
    }

    try {
      const queuedSave = await queueMeasurementSave(
        selectedAthlete.athleteTestId,
        changedMeasurements
      );
      const response = await mvpTestSessionApi.saveMeasurements(
        selectedAthlete.athleteTestId,
        changedMeasurements
      );
      await removeQueuedMeasurementSave(queuedSave.id);
      dirtyMeasurementKeysRef.current.clear();
      const savedMeasurements = response.data?.data || currentMeasurements;
      setCurrentMeasurements(savedMeasurements);
      const updatedAthletes = athletes.map((athlete) =>
        getAthleteKey(athlete) === getAthleteKey(selectedAthlete)
          ? { ...athlete, measurements: savedMeasurements }
          : athlete
      );
      persistAthletes(updatedAthletes);
      console.log("Sporcu backend'e kaydedildi:", {
        ...selectedAthlete,
        measurements: savedMeasurements,
      });
      setSaveStatus("synced");
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
      refreshPendingSyncCount();
    } catch (error: unknown) {
      console.error("Ölçüm kaydetme hatası:", error);
      setSaveStatus("queued");
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2500);
      refreshPendingSyncCount();
    }
  };

  const handlePrevAthlete = () => {
    if (selectedAthleteIndex > 0) {
      const newIndex = selectedAthleteIndex - 1;
      openAthlete(newIndex);
      triggerAthleteChangeAnim();
    }
  };

  const handleNextAthlete = () => {
    if (selectedAthleteIndex < filteredAthletes.length - 1) {
      const newIndex = selectedAthleteIndex + 1;
      openAthlete(newIndex);
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

  const handleDownloadExcel = async () => {
    if (!testSessionId) {
      alert("Test oturumu bulunamadı.");
      return;
    }

    const measurementCount = await getQueuedMeasurementCount();
    const xOneImportCount = await getQueuedXOneQrImportCount();
    const currentPendingCount = measurementCount + xOneImportCount;
    setPendingSyncCount(currentPendingCount);

    if (currentPendingCount > 0) {
      alert(
        `${currentPendingCount} kayıt henüz merkezi sisteme aktarılmadı. İnternet bağlantısını kontrol edin ve senkron tamamlandıktan sonra Excel yedeğini indirin.`
      );
      return;
    }

    setIsDownloadingExcel(true);
    try {
      const response = await mvpTestSessionApi.downloadFieldData(testSessionId);
      const disposition = response.headers["content-disposition"] || "";
      const encodedFileName = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const fileName = encodedFileName?.[1]
        ? decodeURIComponent(encodedFileName[1])
        : `${testSessionName || "test"}_saha_verileri.xlsx`;
      const downloadUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Excel saha yedeği indirilemedi:", error);
      alert("Excel yedeği oluşturulamadı. Bağlantıyı kontrol edip tekrar deneyin.");
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const completeTest = async () => {
    setIsExporting(true);
    setExportProgress({ current: 0, total: activeAthletes.length });

    try {
      // Import export utility dynamically
      const { exportReportsToZip } = await import("@/utils/reportExport");
      if (!testSessionId) {
        throw new Error(
          "Test session ID bulunamadı. Lütfen yeni bir test oturumu başlatın."
        );
      }

      const athletesWithMeasurements = activeAthletes.filter(
        (athlete) =>
          athlete.athleteTestId &&
          athlete.measurements &&
          Object.keys(athlete.measurements).length > 0
      );

      for (let i = 0; i < athletesWithMeasurements.length; i++) {
        const athlete = athletesWithMeasurements[i];
        await mvpTestSessionApi.saveMeasurements(
          athlete.athleteTestId!,
          athlete.measurements!
        );
        setExportProgress({
          current: i + 1,
          total: athletesWithMeasurements.length,
        });
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
        measurements: {
          ...report.measurements,
          ...measurementByAthleteId.get(report.athleteId),
        },
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

  const handleMarkAbsent = async (athlete: ParsedAthlete) => {
    const athleteKey = getAthleteKey(athlete);
    if (!absentAthleteKeys.includes(athleteKey)) {
      persistAbsentAthleteKeys([...absentAthleteKeys, athleteKey]);
    }
    persistAthletes(
      athletes.map((item) =>
        getAthleteKey(item) === athleteKey
          ? { ...item, status: "absent" }
          : item
      )
    );

    if (athlete.athleteTestId) {
      try {
        await mvpTestSessionApi.updateAthleteStatus(athlete.athleteTestId, {
          status: "absent",
        });
      } catch (error) {
        console.error("Gelmedi durumu backend'e yazılamadı:", error);
      }
    }
  };

  const handleRestoreAbsent = async (athlete: ParsedAthlete) => {
    const athleteKey = getAthleteKey(athlete);
    persistAbsentAthleteKeys(
      absentAthleteKeys.filter((key) => key !== athleteKey)
    );
    persistAthletes(
      athletes.map((item) =>
        getAthleteKey(item) === athleteKey
          ? { ...item, status: "active" }
          : item
      )
    );

    if (athlete.athleteTestId) {
      try {
        await mvpTestSessionApi.updateAthleteStatus(athlete.athleteTestId, {
          status: "active",
        });
      } catch (error) {
        console.error("Gelmedi listesine alınan sporcu geri yazılamadı:", error);
      }
    }
  };

  const handleQuickAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testSessionId || !quickAddForm.fullName || !quickAddForm.birthDate) {
      return;
    }

    const birthYear = extractBirthYear(quickAddForm.birthDate);
    const response = await mvpTestSessionApi.importAthletes(testSessionId, [
      {
        fullName: quickAddForm.fullName.trim(),
        birthDate: quickAddForm.birthDate,
        birthYear,
        gender: sessionGender,
      },
    ]);
    const importedAthlete = response.data?.data?.athletes?.[0];
    if (importedAthlete) {
      const nextAthlete: ParsedAthlete = {
        fullName: importedAthlete.fullName || quickAddForm.fullName.trim(),
        birthDate: quickAddForm.birthDate,
        birthYear: importedAthlete.birthYear || birthYear,
        athleteId: importedAthlete.athleteId,
        athleteTestId: importedAthlete.athleteTestId,
        measurements: {},
        source: "backend",
      };
      persistAthletes([...athletes, nextAthlete]);
      setSelectedYear(nextAthlete.birthYear);
      setQuickAddForm({ fullName: "", birthDate: "" });
      setShowQuickAddModal(false);
    }
  };

  const extractUrlFromQrData = (qrData: string): string => {
    try {
      const parsed = JSON.parse(qrData) as {
        url?: string;
        qrUrl?: string;
        link?: string;
      };
      return parsed.url || parsed.qrUrl || parsed.link || qrData;
    } catch {
      return qrData;
    }
  };

  const logYoujiuDeviceData = (payload: unknown) => {
    const responsePayload =
      typeof payload === "object" && payload !== null
        ? (payload as {
            data?: {
              deviceData?: {
                rawPayload?: unknown;
                result?: unknown;
                composition?: unknown;
                measurement?: unknown;
                posture?: unknown;
                balance?: unknown;
              };
              normalized?: Record<string, unknown>;
              importSource?: string;
              importSourceLabel?: string;
              officialMeasurementId?: string | null;
              requestedMeasurementId?: string | null;
            };
          })
        : null;
    const deviceData = responsePayload?.data?.deviceData;
    const normalized = responsePayload?.data?.normalized;
    const sourceLabel =
      responsePayload?.data?.importSourceLabel ||
      responsePayload?.data?.importSource ||
      "Bilinmiyor";

    if (!deviceData) {
      console.info("Youjiu cihaz verisi response içinde yok:", payload);
      return;
    }

    const rows: Array<{ alan: string; deger: unknown }> = [];
    const walk = (value: unknown, path: string) => {
      if (value === null || value === undefined) {
        rows.push({ alan: path, deger: value });
        return;
      }
      if (typeof value !== "object") {
        rows.push({ alan: path, deger: value });
        return;
      }
      if (Array.isArray(value)) {
        if (value.length === 0) rows.push({ alan: path, deger: "[]" });
        value.forEach((item, index) => walk(item, `${path}[${index}]`));
        return;
      }
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        rows.push({ alan: path, deger: "{}" });
        return;
      }
      entries.forEach(([key, nestedValue]) =>
        walk(nestedValue, path ? `${path}.${key}` : key)
      );
    };

    console.group("Youjiu cihaz verileri");
    console.info("Youjiu veri kaynağı:", sourceLabel);
    console.table([
      {
        alan: "veri_kaynagi",
        deger: sourceLabel,
      },
      {
        alan: "import_source",
        deger: responsePayload?.data?.importSource || null,
      },
      {
        alan: "official_measurement_id",
        deger: responsePayload?.data?.officialMeasurementId || null,
      },
      {
        alan: "requested_measurement_id",
        deger: responsePayload?.data?.requestedMeasurementId || null,
      },
    ]);
    console.log("Normalize edilen değerler:", normalized);
    console.table(
      Object.entries(normalized || {}).map(([alan, deger]) => ({ alan, deger }))
    );
    console.log("Ayrıştırılmış cihaz bölümleri:", {
      composition: deviceData.composition,
      measurement: deviceData.measurement,
      posture: deviceData.posture,
      balance: deviceData.balance,
    });
    walk(deviceData.result || deviceData.rawPayload, "");
    console.table(rows);
    console.log("Ham Youjiu JSON:", deviceData.rawPayload);
    console.groupEnd();
  };

  const isNetworkImportError = (error: unknown) => {
    if (!navigator.onLine) return true;
    if (typeof error !== "object" || error === null) return false;
    const maybeAxiosError = error as {
      code?: string;
      message?: string;
      response?: unknown;
      request?: unknown;
    };
    return (
      !maybeAxiosError.response &&
      Boolean(maybeAxiosError.request) &&
      ["ERR_NETWORK", "ECONNABORTED"].includes(maybeAxiosError.code || "")
    );
  };

  const queueXOneQrForRetry = async (qrUrl: string, error?: unknown) => {
    if (!testSessionId || !selectedAthlete?.athleteId) return;
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : undefined;
    await queueXOneQrImport(
      testSessionId,
      selectedAthlete.athleteId,
      qrUrl,
      errorMessage
    );
    await refreshPendingSyncCount();
    setSaveStatus("queued");
    setShowXOneScanner(false);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2500);
  };

  const handleImportXOneQr = async (qrUrl = xOneQrUrl) => {
    if (!testSessionId || !selectedAthlete?.athleteId || !qrUrl.trim()) {
      return;
    }

    const cleanQrUrl = qrUrl.trim();
    if (!navigator.onLine) {
      await queueXOneQrForRetry(cleanQrUrl, "Cihaz çevrimdışı");
      alert(
        "İnternet yok. Youjiu QR bağlantısı kaydedildi; internet gelince otomatik içe aktarılacak."
      );
      return;
    }

    setIsImportingXOne(true);
    try {
      const response = await mvpTestSessionApi.importXOneQr(testSessionId, {
        athleteId: selectedAthlete.athleteId,
        qrUrl: cleanQrUrl,
      });
      logYoujiuDeviceData(response.data);
      const importData = response.data?.data || {};
      const normalized = response.data?.data?.normalized || {};
      const nextMeasurements: Measurements = {
        ...currentMeasurements,
        ...(normalized.height !== undefined && normalized.height !== null
          ? { height: normalized.height }
          : {}),
        ...(normalized.weight !== undefined && normalized.weight !== null
          ? { weight: normalized.weight }
          : {}),
        ...(normalized.flexibility !== undefined &&
        normalized.flexibility !== null
          ? { flexibility: normalized.flexibility }
          : {}),
        ...(normalized.sprint30m !== undefined && normalized.sprint30m !== null
          ? { sprint30m: normalized.sprint30m }
          : {}),
        ...(normalized.sprint30mSecond !== undefined &&
        normalized.sprint30mSecond !== null
          ? { sprint30mSecond: normalized.sprint30mSecond }
          : {}),
        ...(normalized.agility !== undefined && normalized.agility !== null
          ? { agility: normalized.agility }
          : {}),
        ...(normalized.verticalJump !== undefined &&
        normalized.verticalJump !== null
          ? { verticalJump: normalized.verticalJump }
          : {}),
        ...(normalized.passCount !== undefined && normalized.passCount !== null
          ? { passCount: normalized.passCount }
          : {}),
      };

      setCurrentMeasurements(nextMeasurements);
      const updatedAthletes = athletes.map((athlete) =>
        getAthleteKey(athlete) === getAthleteKey(selectedAthlete)
          ? {
              ...athlete,
              measurements: nextMeasurements,
              xOneQrImported: true,
              xOneReportId:
                importData.officialMeasurementId ||
                importData.requestedMeasurementId ||
                importData.reportId,
              xOneImportedAt: new Date().toISOString(),
            }
          : athlete
      );
      persistAthletes(updatedAthletes);
      setXOneQrUrl("");
      setShowXOneScanner(false);
      setSaveStatus("synced");
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (error) {
      console.error("X-One QR import hatası:", error);
      if (isNetworkImportError(error)) {
        await queueXOneQrForRetry(cleanQrUrl, error);
        alert(
          "Youjiu verisi şu an alınamadı. QR bağlantısı kaydedildi; internet/API geri gelince otomatik tekrar denenecek."
        );
        return;
      }
      const apiError =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { data?: { code?: string; message?: string; error?: string } } })
              .response?.data
          : undefined;
      console.error("X-One QR API yanıtı:", apiError);
      alert(
        [apiError?.code, apiError?.error || apiError?.message]
          .filter(Boolean)
          .join(" - ") ||
          "X-One QR verisi alınamadı. QR URL veya cihaz API yanıtını kontrol edin."
      );
    } finally {
      setIsImportingXOne(false);
    }
  };

  const handleXOneQrScan = (qrData: string) => {
    const qrUrl = extractUrlFromQrData(qrData);
    setXOneQrUrl(qrUrl);
    handleImportXOneQr(qrUrl);
  };

  const handleBack = () => {
    if (viewState === "detail") setViewState("list");
    else router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#07100f] text-slate-100">
      {/* Header */}
      <header className="bg-[#0d1716]/90 backdrop-blur-sm shadow-sm border-b border-[#263632] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-slate-300 hover:text-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Geri</span>
            </button>
            <h1 className="text-lg font-bold text-slate-100">
              {viewState === "list" ? "Test Verisi Girişi" : "Ölçüm Girişi"}
            </h1>
            <button
              onClick={handleLogout}
              className="text-slate-300 hover:text-slate-100"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {athletes.length === 0 ? (
          <div className="text-center py-16 bg-[#0d1716] rounded-2xl shadow-lg">
            <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-4">
              Henüz sporcu verisi yüklenmemiş
            </p>
            <button
              onClick={() => setShowQuickAddModal(true)}
              className="rounded-xl bg-[#e4fc55] px-5 py-3 font-semibold text-[#070e0e] hover:bg-white"
            >
              Sporcu Ekle
            </button>
            <p className="mt-3 text-sm text-slate-500">
              Listeyi sahada tek tek ekleyebilir veya ana ekrandan Excel
              yükleyebilirsiniz.
            </p>
          </div>
        ) : viewState === "list" ? (
          <div className="space-y-4">
            {/* Compact Filters Row */}
            <div className="bg-[#0d1716] rounded-xl shadow-sm border border-[#263632] p-3">
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
                            ? "bg-[#e4fc55] text-[#070e0e] border-[#e4fc55] shadow-sm"
                            : "bg-[#0d1716] text-slate-200 border-[#2f403b] hover:border-[#e4fc55] hover:bg-[#e4fc55]/10"
                        }`}
                      >
                        {year}{" "}
                        <span
                          className={
                            isSelected ? "text-[#070e0e]/70" : "text-slate-500"
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Sporcu ara..."
                      className="w-full bg-slate-950 pl-9 pr-3 py-2 border border-[#2f403b] rounded-lg focus:ring-2 focus:ring-[#e4fc55] focus:border-[#d7f33d]/70 text-slate-100 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(true)}
                  className="rounded-lg bg-[#e4fc55] px-4 py-2 text-sm font-semibold text-[#070e0e] hover:bg-white"
                >
                  Sporcu Ekle
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={isDownloadingExcel}
                className="w-full rounded-xl border border-[#d7f33d]/50 bg-[#d7f33d]/10 py-3 font-semibold text-[#e4fc55] transition-colors hover:bg-[#d7f33d]/20 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Download
                  className={`h-5 w-5 ${
                    isDownloadingExcel ? "animate-bounce" : ""
                  }`}
                />
                <span>
                  {isDownloadingExcel
                    ? "Excel Yedeği Hazırlanıyor..."
                    : "Excel Yedeğini İndir"}
                </span>
              </button>
              <p className="px-1 text-center text-xs text-slate-400">
                Tüm tabletlerden senkronlanan en güncel saha verilerini ve VALD
                eşleştirme sütunlarını indirir.
              </p>

              {/* Complete Test Button */}
              <button
                onClick={handleCompleteTest}
                disabled={isExporting}
                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all ${
                  !isExporting
                     ? "bg-[#e4fc55] text-[#070e0e] shadow-lg hover:bg-white"
                    : "bg-slate-800 text-slate-400 border-2 border-dashed border-slate-600 cursor-not-allowed"
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
                      {isTestCompleted
                        ? "Karneleri Yeniden Oluştur ve İndir"
                        : allCompleted
                        ? "Testi Tamamla ve Raporları İndir"
                        : `Eksikleri Gör ve Rapor Al (${incompleteAthletes.length} eksik)`}
                    </span>
                  </>
                )}
              </button>

              {/* Export Progress */}
              {isExporting && exportProgress.total > 0 && (
                <div className="bg-slate-900/80 border border-[#2f403b] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-200 font-medium text-sm">
                      Rapor {exportProgress.current} / {exportProgress.total}
                    </span>
                    <span className="text-[#e4fc55] text-sm">
                      {Math.round(
                        (exportProgress.current / exportProgress.total) * 100
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-[#e4fc55] h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (exportProgress.current / exportProgress.total) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Test Completed Banner */}
            {isTestCompleted && (
              <div className="bg-[#e4fc55]/10 border border-[#e4fc55]/30 rounded-xl p-4 flex items-center space-x-3">
                <Trophy className="h-8 w-8 text-[#e4fc55]" />
                <div>
                  <p className="font-semibold text-white">
                    Test Tamamlandı!
                  </p>
                  <p className="text-sm text-[#e4fc55]">
                    Verileri düzeltebilir ve karneleri yeniden oluşturabilirsiniz
                  </p>
                </div>
              </div>
            )}

            {/* Count */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300 px-1">
              <span>{selectedYear} doğumlu</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium">
                  Aktif: {filteredAthletes.length}
                </span>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium">
                  Gelmedi: {absentAthletes.length}
                </span>
                {pendingSyncCount > 0 && (
                  <span className="rounded-full bg-[#f7d65b]/15 px-3 py-1 text-xs font-medium text-[#f7d65b]">
                    {pendingSyncCount} senkron bekliyor
                  </span>
                )}
              </div>
            </div>

            {/* Athlete List */}
            {filteredAthletes.length === 0 ? (
              <div className="text-center py-12 bg-[#0d1716] rounded-xl shadow-sm border border-[#263632]">
                <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">
                  {searchQuery
                    ? "Arama sonucu bulunamadı"
                    : "Sporcu bulunamadı"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredAthletes.map((athlete, index) => {
                  const status = getCompletionStatus(
                    manualTestFields,
                    athlete.measurements
                  );
                  return (
                    <div
                      key={getAthleteKey(athlete)}
                      className={`bg-[#0d1716] rounded-lg shadow-sm border p-3 transition-all ${
                        status === "completed"
                          ? "border-[#e4fc55]/50 bg-[#e4fc55]/10"
                          : "border-[#263632]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleAthleteClick(index)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div
                            className={`h-10 w-10 flex-none rounded-full flex items-center justify-center text-[#070e0e] font-bold text-sm ${
                              status === "completed"
                                ? "bg-[#e4fc55]"
                                : status === "partial"
                                ? "bg-[#f7d65b]"
                                : "bg-[#d6d6d8]"
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
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-100 text-sm">
                              {athlete.fullName}
                            </p>
                            <p className="text-xs text-slate-400">
                              {athlete.birthYear}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkAbsent(athlete)}
                          className="flex-none rounded-md border border-[#2f403b] px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:border-red-200 hover:text-red-600"
                        >
                          Gelmedi
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAthleteClick(index)}
                          className="flex-none rounded-md p-1 text-slate-500 hover:bg-slate-900/60 hover:text-slate-200"
                          aria-label={`${athlete.fullName} ölçümlerini aç`}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {absentAthletes.length > 0 && (
              <section className="rounded-xl border border-[#2f403b] bg-[#0d1716] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Gelmeyenler
                    </h3>
                    <p className="text-xs text-slate-400">
                      Yanlış işaretlenen sporcuları tekrar aktif listeye alın.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300">
                    {absentAthletes.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {absentAthletes.map((athlete) => (
                    <div
                      key={getAthleteKey(athlete)}
                      className="flex items-center gap-3 rounded-lg border border-[#263632] bg-slate-900/50 p-3"
                    >
                      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#d6d6d8] text-sm font-bold text-[#070e0e]">
                        {athlete.fullName
                          .split(" ")
                          .map((n) => n.charAt(0))
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {athlete.fullName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {athlete.birthYear}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreAbsent(athlete)}
                        className="flex-none rounded-md bg-[#e4fc55] px-3 py-2 text-xs font-bold text-[#070e0e] hover:bg-white"
                      >
                        Listeye Al
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          /* ATHLETE DETAIL */
          <div className="space-y-4">
            {/* Athlete Header */}
            <div
              className={`bg-[#0d1716] rounded-xl shadow-sm border border-[#263632] p-4 transition-all ${
                athleteChangeAnim ? "ring-2 ring-[#e4fc55]" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-[#070e0e] font-bold ${
                      getCompletionStatus(manualTestFields, currentMeasurements) ===
                      "completed"
                        ? "bg-[#e4fc55]"
                        : "bg-[#e4fc55] text-[#070e0e]"
                    }`}
                  >
                    {getCompletionStatus(manualTestFields, currentMeasurements) ===
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
                    <h2 className="text-lg font-bold text-slate-100">
                      {selectedAthlete?.fullName}
                    </h2>
                    <p className="text-sm text-slate-300">
                      {selectedAthlete?.birthYear} doğumlu
                    </p>
                  </div>
                </div>
                <div className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
                  {selectedAthleteIndex + 1}/{filteredAthletes.length}
                </div>
              </div>
            </div>

            {/* Measurement Inputs - Config Driven */}
            <div className="bg-[#0d1716] rounded-xl shadow-sm border border-[#263632] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {sportConfig.label} ölçüm alanları
                  </p>
                  {testSessionValdEnabled && (
                    <p className="mt-1 text-xs text-[#e4fc55]">
                      VALD modu aktif. Youji Health QR ölçümü devam eder.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {testSessionValdEnabled && (
                    <span className="rounded-full bg-[#e4fc55]/15 px-3 py-1 text-xs font-semibold text-[#e4fc55]">
                      VALD Var
                    </span>
                  )}
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                    {testFields.length} alan
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {testFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {field.label} ({field.unit})
                    </label>
                    <input
                      type="number"
                      step={field.step}
                      value={currentMeasurements[field.key] ?? ""}
                      onChange={(e) =>
                        handleMeasurementChange(field.key, e.target.value)
                      }
                      placeholder={
                        testSessionValdEnabled &&
                        valdDisabledFieldSet.has(field.key)
                          ? "VALD'dan alınacak"
                          : field.placeholder
                      }
                      className={`w-full rounded-lg border px-3 py-2.5 text-slate-100 ${
                        testSessionValdEnabled &&
                        valdDisabledFieldSet.has(field.key)
                          ? "cursor-not-allowed border-[#33443f] bg-[#15201d] text-slate-500"
                          : "border-[#2f403b] bg-slate-950 focus:border-[#d7f33d]/70 focus:ring-2 focus:ring-[#e4fc55]"
                      }`}
                      disabled={
                        testSessionValdEnabled &&
                        valdDisabledFieldSet.has(field.key)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0d1716] rounded-xl shadow-sm border border-[#263632] p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold text-slate-100">
                  Youjiu Health Cihaz Verisi
                </p>
                <p className="text-xs text-slate-400">
                  QR okutulduğunda report_id backend tarafından alınır ve
                  ölçümler forma işlenir.
                </p>
              </div>
              {selectedAthlete?.xOneQrImported && (
                <div className="mb-3 rounded-lg border border-[#e4fc55]/30 bg-[#e4fc55]/10 px-3 py-2 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#e4fc55] px-2.5 py-1 text-xs font-bold text-[#070e0e]">
                      QR girildi
                    </span>
                    {selectedAthlete.xOneReportId && (
                      <span className="text-xs text-slate-300">
                        Report ID: {selectedAthlete.xOneReportId}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Yanlış QR okutulduysa tekrar okutabilirsiniz.
                  </p>
                </div>
              )}
              <div className="rounded-xl border border-dashed border-[#3a4d47] bg-slate-900/60 p-5 text-center">
                <button
                  type="button"
                  onClick={() => setShowXOneScanner(true)}
                  disabled={
                    isImportingXOne || !selectedAthlete?.athleteId
                  }
                  className="mx-auto flex items-center justify-center gap-2 rounded-lg bg-[#e4fc55] px-5 py-3 text-sm font-semibold text-[#070e0e] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ScanLine className="h-5 w-5" />
                  {isImportingXOne ? "Alınıyor..." : "QR Okut"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowXOneUrlFallback((value) => !value)}
                  className="mt-3 text-xs font-medium text-slate-400 underline"
                >
                  QR okunmazsa URL ile ekle
                </button>
              </div>
              {showXOneUrlFallback && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="url"
                    value={xOneQrUrl}
                    onChange={(event) => setXOneQrUrl(event.target.value)}
                    placeholder="https://... report_id=..."
                    className="min-w-0 flex-1 rounded-lg border border-[#2f403b] bg-slate-950 px-3 py-2 text-slate-100 focus:ring-2 focus:ring-[#e4fc55] focus:border-[#d7f33d]/70"
                    disabled={isImportingXOne}
                  />
                  <button
                    type="button"
                    onClick={() => handleImportXOneQr()}
                    disabled={
                      isImportingXOne ||
                      !selectedAthlete?.athleteId ||
                      !xOneQrUrl.trim()
                    }
                    className="rounded-lg bg-[#e4fc55] px-4 py-2 text-sm font-semibold text-[#070e0e] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    URL ile Al
                  </button>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="w-full bg-[#e4fc55] text-[#070e0e] py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-lg hover:bg-white transition-all"
            >
              <Save className="h-5 w-5" />
              <span>Kaydet</span>
            </button>

            {/* Success Message */}
            {showSaveSuccess && (
              <div className="bg-[#e4fc55]/10 border border-[#e4fc55]/30 rounded-lg p-3 flex items-center space-x-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-white font-medium text-sm">
                  {saveStatus === "queued"
                    ? "Cihaza kaydedildi, internet gelince senkronlanacak."
                    : "Kaydedildi!"}
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
                    ? "bg-slate-800 text-slate-500"
                    : "bg-[#0d1716] text-slate-200 shadow-sm border border-[#263632] hover:shadow-md"
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
                    ? "bg-slate-800 text-slate-500"
                    : "bg-[#0d1716] text-slate-200 shadow-sm border border-[#263632] hover:shadow-md"
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
          <div className="bg-[#0d1716] rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
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
              <p className="text-slate-200 mb-4">
                Test tamamlanmadan önce aşağıdaki sporcuların eksik verilerini
                girmeniz gerekiyor:
              </p>
              <div className="space-y-3">
                {incompleteAthletes.map((athlete, idx) => {
                  const missing = getMissingFields(
                    manualTestFields,
                    athlete.measurements
                  );
                  return (
                    <div
                      key={idx}
                      className="bg-slate-900/60 rounded-lg p-3 border border-[#2f403b]"
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {athlete.fullName
                            .split(" ")
                            .map((n) => n.charAt(0))
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <span className="font-medium text-slate-100">
                          {athlete.fullName}
                        </span>
                        <span className="text-xs text-slate-400">
                          ({athlete.birthYear})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 ml-10">
                        {missing.map((field, fidx) => (
                          <span
                            key={fidx}
                            className="bg-red-500/15 text-red-200 text-xs px-2 py-0.5 rounded-full"
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
            <div className="p-5 border-t border-[#263632] bg-slate-900/60">
              <button
                onClick={() => {
                  setShowMissingModal(false);
                  completeTest();
                }}
                className="mb-3 w-full bg-[#e4fc55] text-[#070e0e] py-3 rounded-xl font-medium hover:bg-white transition-colors"
              >
                Uyarıları Gördüm, Raporları Oluştur
              </button>
              <button
                onClick={() => setShowMissingModal(false)}
                className="w-full bg-slate-800 text-slate-200 py-3 rounded-xl font-medium hover:bg-slate-700 transition-colors"
              >
                Geri Dön ve Eksikleri Tamamla
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuickAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleQuickAddAthlete}
            className="w-full max-w-md rounded-2xl bg-[#0d1716] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100">
                Sahada Sporcu Ekle
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(false)}
                className="text-slate-500 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">
                  Ad Soyad
                </label>
                <input
                  value={quickAddForm.fullName}
                  onChange={(event) =>
                    setQuickAddForm((prev) => ({
                      ...prev,
                      fullName: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#2f403b] bg-slate-950 px-3 py-2 text-slate-100 focus:ring-2 focus:ring-[#e4fc55] focus:border-[#d7f33d]/70"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">
                  Doğum Tarihi
                </label>
                <input
                  type="date"
                  value={quickAddForm.birthDate}
                  onChange={(event) =>
                    setQuickAddForm((prev) => ({
                      ...prev,
                      birthDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#2f403b] bg-slate-950 px-3 py-2 text-slate-100 focus:ring-2 focus:ring-[#e4fc55] focus:border-[#d7f33d]/70"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-5 w-full rounded-xl bg-[#e4fc55] py-3 font-semibold text-[#070e0e] hover:bg-white"
            >
              Listeye Ekle
            </button>
          </form>
        </div>
      )}

      <QRScanner
        isOpen={showXOneScanner}
        onClose={() => setShowXOneScanner(false)}
        onScan={handleXOneQrScan}
        title="Youjiu Health QR Okut"
        description="Cihaz ekranındaki QR kodu kameraya gösterin; okutulunca ölçümler otomatik forma işlenir."
        manualLabel="QR okunmazsa cihazdaki bağlantıyı buraya yapıştırın:"
        manualPlaceholder="https://... report_id=..."
        manualButtonLabel="Cihaz Verisini Al"
      />
    </div>
  );
}
