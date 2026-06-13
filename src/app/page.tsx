"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  Search,
  Upload,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import AppShell from "@/components/AppShell";
import { athleteApi, clubApi, mvpTestSessionApi } from "@/lib/api";
import { DEFAULT_VALD_SESSION_CONFIG } from "@/lib/valdConfig";

interface ParsedAthlete {
  fullName: string;
  birthDate: string;
  birthYear?: number;
  athleteId?: string;
  athleteTestId?: string;
}

interface MvpSession {
  id: string;
  clubName: string;
  clubResponsibleName: string;
  city: string;
  sportType: string;
  valdEnabled: boolean;
  valdConfig: typeof DEFAULT_VALD_SESSION_CONFIG;
  testDate: string;
  status: "draft" | "in_progress" | "completed";
  totalAthletes: number;
  completedAthletes: number;
}

export default function Home() {
  const router = useRouter();
  const [clubCount, setClubCount] = useState(0);
  const [athleteCount, setAthleteCount] = useState(0);
  const [sessions, setSessions] = useState<MvpSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [parsedAthletes, setParsedAthletes] = useState<ParsedAthlete[]>([]);
  const [formData, setFormData] = useState({
    clubName: "",
    clubResponsible: "",
    city: "",
    email: "",
    phone: "",
    sportType: "",
    valdEnabled: false,
    testDate: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clubsRes, athletesRes, sessionsRes] = await Promise.all([
          clubApi.getAll(),
          athleteApi.getAll(),
          mvpTestSessionApi.getAll(),
        ]);
        setClubCount(clubsRes.data?.data?.length || 0);
        setAthleteCount(athletesRes.data?.data?.length || 0);
        setSessions(sessionsRes.data?.data || []);
      } catch (error) {
        console.error("Ana ekran verileri yüklenemedi:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeSessionCount = sessions.filter(
    (session) => session.status !== "completed"
  ).length;

  const selectedBirthYears = useMemo(() => {
    const years = parsedAthletes
      .map((athlete) => athlete.birthYear)
      .filter((year): year is number => Boolean(year));
    return [...new Set(years)].sort((a, b) => b - a);
  }, [parsedAthletes]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const extractBirthYear = (birthDate: string): number | undefined => {
    const parts = birthDate.split(/[./-]/).filter(Boolean);
    const yearPart = parts.find((part) => part.length === 4) || parts.at(-1);
    const year = Number.parseInt(String(yearPart || ""), 10);
    return Number.isFinite(year) && year > 1900 ? year : undefined;
  };

  const normalizeBirthDate = (birthDate: string): string | undefined => {
    const parts = birthDate.split(/[./-]/).filter(Boolean);
    if (parts.length !== 3) return undefined;
    const [day, month, year] = parts;
    if (year.length !== 4) return undefined;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const workbook = XLSX.read(readerEvent.target?.result, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
      const athletes = rows
        .slice(1)
        .filter((row) => row.length >= 2 && row[0])
        .map((row) => {
          const birthDate = String(row[1] || "").trim();
          return {
            fullName: String(row[0] || "").trim(),
            birthDate,
            birthYear: extractBirthYear(birthDate),
          };
        });
      setParsedAthletes(athletes);
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmitTestSession = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !formData.clubName ||
      !formData.clubResponsible ||
      !formData.city ||
      !formData.sportType ||
      !formData.testDate
    ) {
      alert("Kulüp, yetkili, şehir, spor dalı ve test tarihini doldurun.");
      return;
    }

    setSubmitting(true);
    try {
      const sessionResponse = await mvpTestSessionApi.create({
        clubName: formData.clubName,
        clubResponsibleName: formData.clubResponsible,
        clubResponsibleEmail: formData.email || undefined,
        clubResponsiblePhone: formData.phone || undefined,
        city: formData.city,
        sportType: formData.sportType,
        valdEnabled: formData.valdEnabled,
        valdConfig: DEFAULT_VALD_SESSION_CONFIG,
        testDate: formData.testDate,
        notes:
          parsedAthletes.length > 0
            ? `Test oturumu - ${parsedAthletes.length} sporcu`
            : "Test oturumu - sporcu listesi sonradan eklenecek",
      });
      const sessionId = sessionResponse.data?.data?.id;
      if (!sessionId) throw new Error("Backend session ID döndürmedi.");

      const sessionGender = formData.sportType
        .toLocaleLowerCase("tr")
        .includes("kız")
        ? "female"
        : "male";
      let athletesWithBackendIds: ParsedAthlete[] = [];

      if (parsedAthletes.length > 0) {
        const importResponse = await mvpTestSessionApi.importAthletes(
          sessionId,
          parsedAthletes.map((athlete) => ({
            fullName: athlete.fullName,
            birthDate: normalizeBirthDate(athlete.birthDate),
            birthYear: athlete.birthYear,
            gender: sessionGender as "male" | "female",
          }))
        );
        const importedAthletes = importResponse.data?.data?.athletes || [];
        athletesWithBackendIds = parsedAthletes.map((athlete, index) => ({
          ...athlete,
          athleteId: importedAthletes[index]?.athleteId,
          athleteTestId: importedAthletes[index]?.athleteTestId,
        }));
      }

      localStorage.setItem("parsedAthletes", JSON.stringify(athletesWithBackendIds));
      localStorage.setItem("testSessionName", formData.clubName);
      localStorage.setItem("testSessionId", sessionId);
      localStorage.setItem("testSessionDate", formData.testDate);
      localStorage.setItem("testSessionSportType", formData.sportType);
      localStorage.setItem(
        "testSessionValdEnabled",
        String(formData.valdEnabled)
      );
      localStorage.setItem(
        "testSessionValdConfig",
        JSON.stringify(DEFAULT_VALD_SESSION_CONFIG)
      );
      localStorage.removeItem("testCompleted");
      router.push("/test-data-entry");
    } catch (error) {
      console.error("Test oturumu oluşturulamadı:", error);
      alert("Test oturumu oluşturulamadı. Backend loglarını kontrol edin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Test Oturumu Oluştur"
      subtitle="Kulüp bilgisini girin; sporcu listesini şimdi veya saha günü sonradan ekleyin."
      action={
        <button
          onClick={() => router.push("/dashboard")}
          className="hidden rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#e4fc55]/70 hover:bg-[#e4fc55]/10 sm:inline-flex"
        >
          Oturumları Gör
        </button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Kulüp", value: clubCount, icon: ClipboardList },
              { label: "Sporcu", value: athleteCount, icon: Users },
              { label: "Aktif Oturum", value: activeSessionCount, icon: CalendarDays },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#b8b8bd]">{item.label}</p>
                      <p className="mt-2 text-3xl font-semibold">{item.value}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e4fc55]/12 text-[#e4fc55]">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleSubmitTestSession}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-6 flex flex-col gap-2">
              <h2 className="text-xl font-semibold">Kulüp ve Oturum Bilgileri</h2>
              <p className="text-sm text-[#b8b8bd]">
                Bu bilgiler test günü ekiplerin aynı oturuma doğru şekilde girmesi için kullanılır.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {[
                ["clubName", "Kulüp Adı", "Gençsaray Akademi", "text"],
                ["clubResponsible", "Kulüp Yetkilisi", "Ad Soyad", "text"],
                ["city", "Şehir", "İstanbul", "text"],
                ["email", "İletişim E-postası", "yetkili@kulup.com", "email"],
                ["phone", "Telefon", "0532 XXX XX XX", "tel"],
              ].map(([name, label, placeholder, type]) => (
                <label key={name} className="block">
                  <span className="text-sm font-medium text-[#d6d6d8]">{label}</span>
                  <input
                    type={type}
                    name={name}
                    value={String(formData[name as keyof typeof formData])}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#091312] px-4 py-4 text-white outline-none transition placeholder:text-[#6f6f73] focus:border-[#e4fc55]/80"
                  />
                </label>
              ))}

              <label className="block">
                <span className="text-sm font-medium text-[#d6d6d8]">Spor Dalı</span>
                <select
                  name="sportType"
                  value={formData.sportType}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#091312] px-4 py-4 text-white outline-none transition focus:border-[#e4fc55]/80"
                >
                  <option value="">Spor dalı seçin</option>
                  <option value="Futbol">Futbol</option>
                  <option value="Kız Voleybol">Kız Voleybol</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-[#d6d6d8]">Test Tarihi</span>
                <input
                  type="date"
                  name="testDate"
                  value={formData.testDate}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#091312] px-4 py-4 text-white outline-none transition focus:border-[#e4fc55]/80"
                />
              </label>

              <div className="md:col-span-2">
                <span className="text-sm font-medium text-[#d6d6d8]">
                  VALD Performance
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#091312] p-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, valdEnabled: false }))
                    }
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      !formData.valdEnabled
                        ? "bg-[#d6d6d8] text-[#070e0e]"
                        : "text-[#b8b8bd] hover:bg-white/5"
                    }`}
                  >
                    VALD Yok
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, valdEnabled: true }))
                    }
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      formData.valdEnabled
                        ? "bg-[#e4fc55] text-[#070e0e]"
                        : "text-[#b8b8bd] hover:bg-white/5"
                    }`}
                  >
                    VALD Var
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#8f9996]">
                  VALD raporu ayrı hazırlanır. VALD açık testte dikey sıçrama
                  Athletic Labs formundan ve karnesinden kaldırılır; Youji Health
                  QR ölçümü devam eder.
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[#b8b8bd]">
                {parsedAthletes.length > 0
                  ? `${parsedAthletes.length} sporcu hazır`
                  : "Sporcu listesi olmadan da oturum oluşturabilirsiniz"}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#e4fc55] px-6 py-4 text-sm font-bold text-[#070e0e] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#6f6f73] disabled:text-[#070e0e]/70"
              >
                {submitting ? "Oluşturuluyor..." : "Oturumu Oluştur"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e4fc55]/12 text-[#e4fc55]">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Sporcu Listesi</h2>
                <p className="text-sm text-[#b8b8bd]">Opsiyonel: Ad Soyad, Doğum Tarihi</p>
              </div>
            </div>

            <label className="block cursor-pointer rounded-2xl border border-dashed border-[#e4fc55]/40 bg-[#e4fc55]/8 p-5 text-center transition hover:bg-[#e4fc55]/12">
              <Upload className="mx-auto h-7 w-7 text-[#e4fc55]" />
              <p className="mt-3 text-sm font-semibold">Excel/CSV Dosyası Seç</p>
              <p className="mt-1 text-xs text-[#b8b8bd]">İlk sütun ad soyad, ikinci sütun doğum tarihi</p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {parsedAthletes.length > 0 && (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {selectedBirthYears.map((year) => (
                    <span
                      key={year}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#d6d6d8]"
                    >
                      {year}
                    </span>
                  ))}
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {parsedAthletes.slice(0, 12).map((athlete, index) => (
                    <div
                      key={`${athlete.fullName}-${index}`}
                      className="rounded-xl border border-white/10 bg-[#091312] p-3"
                    >
                      <p className="truncate text-sm font-medium">{athlete.fullName}</p>
                      <p className="mt-1 text-xs text-[#b8b8bd]">{athlete.birthDate}</p>
                    </div>
                  ))}
                  {parsedAthletes.length > 12 && (
                    <p className="text-center text-xs text-[#b8b8bd]">
                      +{parsedAthletes.length - 12} sporcu daha
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Son Oturumlar</h2>
              <button
                onClick={() => router.push("/dashboard")}
                className="text-sm font-semibold text-[#e4fc55]"
              >
                Tümü
              </button>
            </div>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-[#b8b8bd]">Yükleniyor...</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-[#b8b8bd]">Henüz oturum yok.</p>
              ) : (
                sessions.slice(0, 4).map((session) => (
                  <button
                    key={session.id}
                    onClick={() => {
                      localStorage.setItem("testSessionId", session.id);
                      localStorage.setItem("testSessionName", session.clubName);
                      localStorage.setItem("testSessionDate", session.testDate);
                      localStorage.setItem("testSessionSportType", session.sportType);
                      localStorage.setItem(
                        "testSessionValdEnabled",
                        String(session.valdEnabled)
                      );
                      localStorage.setItem(
                        "testSessionValdConfig",
                        JSON.stringify(
                          session.valdConfig || DEFAULT_VALD_SESSION_CONFIG
                        )
                      );
                      router.push("/test-data-entry");
                    }}
                    className="block w-full rounded-2xl border border-white/10 bg-[#091312] p-4 text-left transition hover:border-[#e4fc55]/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{session.clubName}</p>
                        <p className="mt-1 text-xs text-[#b8b8bd]">
                          {session.sportType} • {new Date(session.testDate).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                      <span className="rounded-full bg-white/8 px-2 py-1 text-xs text-[#d6d6d8]">
                        {session.completedAthletes}/{session.totalAthletes}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      <button
        onClick={() => router.push("/scouting")}
        className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#091312] px-4 py-3 text-sm font-semibold text-white shadow-2xl transition hover:border-[#e4fc55]/60"
      >
        <Search className="h-4 w-4 text-[#e4fc55]" />
        Scouting
      </button>
    </AppShell>
  );
}
