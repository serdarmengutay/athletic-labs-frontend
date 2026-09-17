"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  ListTodo,
  MapPin,
  NotebookPen,
  Plus,
  Upload,
  Users,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import SessionAthleteImportModal from "@/components/SessionAthleteImportModal";
import {
  AddNoteToggle,
  NoteItem,
  NoteDraft,
} from "@/components/calendar/CalendarNotes";
import { mvpTestSessionApi } from "@/lib/api";
import { DEFAULT_VALD_SESSION_CONFIG } from "@/lib/valdConfig";
import {
  CalendarNote,
  compareNotes,
  NOTE_CATEGORIES,
  useCalendarNotes,
} from "@/lib/calendarNotes";

interface CalendarSession {
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
  createdAt: string;
}

type ViewMode = "month" | "year";

const VIEW_MODE_STORAGE_KEY = "calendarViewMode";
const UPCOMING_DAYS = 30;
const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const WEEKDAYS_MINI = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

const statusLabel: Record<CalendarSession["status"], string> = {
  draft: "Hazırlık",
  in_progress: "Aktif",
  completed: "Tamamlandı",
};

const statusClassName: Record<CalendarSession["status"], string> = {
  draft: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  in_progress: "border-[#e4fc55]/40 bg-[#e4fc55]/12 text-[#e4fc55]",
  completed: "border-sky-300/30 bg-sky-300/10 text-sky-100",
};

const statusDotClassName: Record<CalendarSession["status"], string> = {
  draft: "bg-amber-300",
  in_progress: "bg-[#e4fc55]",
  completed: "bg-sky-300",
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getSessionDateKey = (value: string) => toDateKey(new Date(value));

const buildMonthDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, 1 - startOffset + index);
    return {
      date,
      key: toDateKey(date),
      inMonth: date.getMonth() === month,
    };
  });
};

const formatLongDate = (key: string) =>
  fromDateKey(key).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  });

const formatShortDate = (key: string) =>
  fromDateKey(key).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });

export default function CalendarPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { notes, addNote, updateNote, deleteNote, importNotes } =
    useCalendarNotes();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [todayKey, setTodayKey] = useState(() => toDateKey(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    toDateKey(new Date())
  );
  const [importSession, setImportSession] = useState<CalendarSession | null>(
    null
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const loadSessions = async () => {
    try {
      const response = await mvpTestSessionApi.getAll();
      setSessions(response.data?.data || []);
      setLoadError(false);
    } catch (error) {
      console.error("Takvim oturumları yüklenemedi:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    try {
      const storedView = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (storedView === "month" || storedView === "year") {
        setViewMode(storedView);
      }
    } catch {
      // Depolama kapalıysa varsayılan aylık görünüm kalır.
    }
    // Sayfa gece yarısını geçerek açık kalırsa "bugün" işaretini güncelle.
    const timer = window.setInterval(
      () => setTodayKey(toDateKey(new Date())),
      60_000
    );
    return () => window.clearInterval(timer);
  }, []);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // Tercih kaydedilemese de görünüm değişir.
    }
  };

  const sessionsById = useMemo(
    () => new Map(sessions.map((session) => [session.id, session])),
    [sessions]
  );

  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, CalendarSession[]> = {};
    sessions.forEach((session) => {
      const dateKey = getSessionDateKey(session.testDate);
      (grouped[dateKey] ||= []).push(session);
    });
    return grouped;
  }, [sessions]);

  // Oturum notları oturumun güncel tarihinde görünür. Oturumu silinmiş notlar
  // kaybolmasın diye eklendikleri günün notu olarak gösterilir.
  const { dayNotesByDate, notesBySession, noteDateKey } = useMemo(() => {
    const byDate: Record<string, CalendarNote[]> = {};
    const bySession: Record<string, CalendarNote[]> = {};
    const dateOf = new Map<string, string>();
    const sessionsReady = !loading && !loadError;

    notes.forEach((note) => {
      const session = note.sessionId ? sessionsById.get(note.sessionId) : undefined;
      if (note.sessionId && session) {
        (bySession[note.sessionId] ||= []).push(note);
        dateOf.set(note.id, getSessionDateKey(session.testDate));
        return;
      }
      if (note.sessionId && !sessionsReady) return;
      (byDate[note.dateKey] ||= []).push(note);
      dateOf.set(note.id, note.dateKey);
    });

    Object.values(byDate).forEach((list) => list.sort(compareNotes));
    Object.values(bySession).forEach((list) => list.sort(compareNotes));
    return { dayNotesByDate: byDate, notesBySession: bySession, noteDateKey: dateOf };
  }, [notes, sessionsById, loading, loadError]);

  const noteCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    noteDateKey.forEach((dateKey) => {
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    });
    return counts;
  }, [noteDateKey]);

  const visibleYear = visibleMonth.getFullYear();
  const monthPrefix = `${visibleYear}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}`;

  const countInPeriod = (prefix: string) => ({
    sessions: Object.entries(sessionsByDate)
      .filter(([key]) => key.startsWith(prefix))
      .reduce((sum, [, list]) => sum + list.length, 0),
    notes: Object.entries(noteCountByDate)
      .filter(([key]) => key.startsWith(prefix))
      .reduce((sum, [, count]) => sum + count, 0),
  });

  const monthSummary = countInPeriod(monthPrefix);
  const yearSummary = countInPeriod(`${visibleYear}-`);

  const monthSessions = useMemo(
    () =>
      sessions
        .filter((session) => getSessionDateKey(session.testDate).startsWith(monthPrefix))
        .sort(
          (first, second) =>
            new Date(first.testDate).getTime() - new Date(second.testDate).getTime()
        ),
    [sessions, monthPrefix]
  );

  const upcoming = useMemo(() => {
    const today = fromDateKey(todayKey);
    const endKey = toDateKey(
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + UPCOMING_DAYS)
    );
    const days: {
      key: string;
      sessions: CalendarSession[];
      notes: CalendarNote[];
    }[] = [];
    const keys = new Set<string>();
    Object.keys(sessionsByDate).forEach((key) => keys.add(key));
    noteDateKey.forEach((key) => keys.add(key));

    [...keys]
      .filter((key) => key >= todayKey && key <= endKey)
      .sort()
      .forEach((key) => {
        const dayNotes = notes
          .filter((note) => noteDateKey.get(note.id) === key && !note.done)
          .sort(compareNotes);
        const daySessions = sessionsByDate[key] || [];
        if (daySessions.length || dayNotes.length) {
          days.push({ key, sessions: daySessions, notes: dayNotes });
        }
      });

    const overdue = notes
      .filter((note) => {
        const key = noteDateKey.get(note.id);
        return key !== undefined && key < todayKey && !note.done && note.category === "task";
      })
      .sort((first, second) =>
        (noteDateKey.get(first.id) || "").localeCompare(noteDateKey.get(second.id) || "")
      );

    return { days, overdue };
  }, [notes, noteDateKey, sessionsByDate, todayKey]);

  const openSession = (session: CalendarSession) => {
    localStorage.setItem("testSessionId", session.id);
    localStorage.setItem("testSessionName", session.clubName);
    localStorage.setItem("testSessionDate", session.testDate);
    localStorage.setItem("testSessionSportType", session.sportType);
    localStorage.setItem("testSessionValdEnabled", String(session.valdEnabled));
    localStorage.setItem(
      "testSessionValdConfig",
      JSON.stringify(session.valdConfig || DEFAULT_VALD_SESSION_CONFIG)
    );
    router.push("/test-data-entry");
  };

  const selectDate = (key: string, options?: { scroll?: boolean; jump?: boolean }) => {
    setSelectedDateKey(key);
    if (options?.jump) {
      const date = fromDateKey(key);
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    // Dar ekranda panel takvimin altında kalır; seçilen günü görünür yap.
    if (options?.scroll && window.matchMedia("(max-width: 1279px)").matches) {
      window.requestAnimationFrame(() =>
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    }
  };

  const shiftPeriod = (direction: -1 | 1) => {
    setVisibleMonth((current) =>
      viewMode === "year"
        ? new Date(current.getFullYear() + direction, current.getMonth(), 1)
        : new Date(current.getFullYear(), current.getMonth() + direction, 1)
    );
  };

  const goToToday = () => {
    const today = new Date();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(toDateKey(today));
  };

  const addDraft = (draft: NoteDraft, dateKey: string, sessionId?: string) =>
    addNote({ ...draft, dateKey, sessionId });

  const exportBackup = () => {
    const blob = new Blob(
      [JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), notes }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `athletic-labs-takvim-notlari-${todayKey}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const count = importNotes(JSON.parse(await file.text()));
      alert(
        count > 0
          ? `${count} not yedekten eklendi veya güncellendi.`
          : "Yedekte bu cihazda olmayan veya daha güncel bir not bulunamadı."
      );
    } catch (error) {
      console.error("Not yedeği okunamadı:", error);
      alert("Yedek dosyası okunamadı. Takvimden alınan .json yedeğini seçin.");
    }
  };

  const selectedSessions = sessionsByDate[selectedDateKey] || [];
  const selectedDayNotes = dayNotesByDate[selectedDateKey] || [];
  const periodLabel =
    viewMode === "year"
      ? String(visibleYear)
      : visibleMonth.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  return (
    <AppShell
      title="Takvim"
      subtitle="Test oturumlarını aylık veya 12 aylık görünümde planlayın, oturumlara not düşün."
      wide
      action={
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 rounded-xl bg-[#e4fc55] px-4 py-3 text-sm font-bold text-[#070e0e] transition hover:bg-white"
        >
          <Plus className="h-4 w-4" />
          Yeni Oturum
        </button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04]">
            <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold capitalize">{periodLabel}</h2>
                <p className="mt-1 text-sm text-[#b8b8bd]">
                  {viewMode === "year"
                    ? `Bu yıl ${yearSummary.sessions} test oturumu, ${yearSummary.notes} not.`
                    : `Bu ay ${monthSummary.sessions} test oturumu planlı, ${monthSummary.notes} not.`}
                  {loadError && (
                    <span className="ml-2 text-amber-200">Oturumlar yüklenemedi.</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div
                  role="group"
                  aria-label="Takvim görünümü"
                  className="grid grid-cols-2 rounded-xl border border-white/10 bg-[#091312] p-1"
                >
                  {(
                    [
                      ["month", "Ay", CalendarDays],
                      ["year", "12 Ay", CalendarRange],
                    ] as const
                  ).map(([mode, label, Icon]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => changeViewMode(mode)}
                      aria-pressed={viewMode === mode}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        viewMode === mode
                          ? "bg-[#e4fc55] text-[#070e0e]"
                          : "text-[#b8b8bd] hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => shiftPeriod(-1)}
                    className="rounded-xl border border-white/10 p-3 text-[#d6d6d8] transition hover:border-[#e4fc55]/60 hover:text-white"
                    aria-label={viewMode === "year" ? "Önceki yıl" : "Önceki ay"}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={goToToday}
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-[#d6d6d8] transition hover:border-[#e4fc55]/60 hover:text-white"
                  >
                    Bugün
                  </button>
                  <button
                    onClick={() => shiftPeriod(1)}
                    className="rounded-xl border border-white/10 p-3 text-[#d6d6d8] transition hover:border-[#e4fc55]/60 hover:text-white"
                    aria-label={viewMode === "year" ? "Sonraki yıl" : "Sonraki ay"}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {viewMode === "month" ? (
              <MonthGrid
                year={visibleYear}
                month={visibleMonth.getMonth()}
                todayKey={todayKey}
                selectedDateKey={selectedDateKey}
                sessionsByDate={sessionsByDate}
                dayNotesByDate={dayNotesByDate}
                noteCountByDate={noteCountByDate}
                onSelect={(key) => selectDate(key, { scroll: true })}
              />
            ) : (
              <YearGrid
                year={visibleYear}
                todayKey={todayKey}
                selectedDateKey={selectedDateKey}
                sessionsByDate={sessionsByDate}
                noteCountByDate={noteCountByDate}
                onSelect={(key) => selectDate(key, { scroll: true })}
                onOpenMonth={(month) => {
                  setVisibleMonth(new Date(visibleYear, month, 1));
                  changeViewMode("month");
                }}
              />
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 px-5 py-3 text-xs text-[#8f9996]">
              {(Object.keys(statusLabel) as CalendarSession["status"][]).map((status) => (
                <span key={status} className="inline-flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${statusDotClassName[status]}`} />
                  {statusLabel[status]}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <NotebookPen className="h-3.5 w-3.5" />
                Not / program
              </span>
            </div>
          </section>

          {viewMode === "month" && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e4fc55]/12 text-[#e4fc55]">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Bu Ayki Oturumlar</h2>
                  <p className="text-sm text-[#b8b8bd]">Tarih sırasına göre saha planı.</p>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-[#b8b8bd]">Yükleniyor...</div>
              ) : monthSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-[#b8b8bd]">
                  Bu ay için planlanmış oturum yok.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {monthSessions.map((session) => {
                    const sessionNoteCount = notesBySession[session.id]?.length || 0;
                    return (
                      <div
                        key={session.id}
                        className="rounded-2xl border border-white/10 bg-[#091312] p-4 transition hover:border-[#e4fc55]/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-semibold">{session.clubName}</p>
                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#b8b8bd]">
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="h-4 w-4" />
                                {new Date(session.testDate).toLocaleDateString("tr-TR")}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {session.city}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <Users className="h-4 w-4" />
                                {session.totalAthletes} sporcu
                              </span>
                            </div>
                          </div>
                          <span
                            className={`flex-none rounded-full border px-2.5 py-1 text-xs ${statusClassName[session.status]}`}
                          >
                            {statusLabel[session.status]}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              selectDate(getSessionDateKey(session.testDate), { scroll: true })
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-[#d6d6d8] transition hover:border-[#e4fc55]/60 hover:text-white"
                          >
                            <NotebookPen className="h-3.5 w-3.5" />
                            Notlar{sessionNoteCount > 0 ? ` (${sessionNoteCount})` : ""}
                          </button>
                          <button
                            type="button"
                            onClick={() => setImportSession(session)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-[#d6d6d8] transition hover:border-[#e4fc55]/60 hover:text-white"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Sporcu Listesi
                          </button>
                          <button
                            type="button"
                            onClick={() => openSession(session)}
                            className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[#e4fc55]"
                          >
                            Oturumu Aç
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-6">
          <section
            ref={panelRef}
            className="scroll-mt-48 rounded-3xl border border-white/10 bg-white/[0.04]"
          >
            <div className="border-b border-white/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e4fc55]">
                {selectedDateKey === todayKey ? "Bugün" : "Seçili Gün"}
              </p>
              <h2 className="mt-1 text-lg font-semibold capitalize">
                {formatLongDate(selectedDateKey)}
              </h2>
            </div>

            <div className="space-y-5 p-5">
              {selectedSessions.length > 0 && (
                <div className="space-y-4">
                  {selectedSessions.map((session) => {
                    const sessionNotes = notesBySession[session.id] || [];
                    return (
                      <div
                        key={session.id}
                        className="rounded-2xl border border-white/10 bg-[#091312] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{session.clubName}</p>
                            <p className="mt-1 text-xs text-[#b8b8bd]">
                              {session.sportType} • {session.city}
                            </p>
                          </div>
                          <span
                            className={`flex-none rounded-full border px-2.5 py-1 text-xs ${statusClassName[session.status]}`}
                          >
                            {statusLabel[session.status]}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-[#b8b8bd]">
                          <Users className="h-3.5 w-3.5" />
                          {session.totalAthletes > 0 ? (
                            <span>
                              {session.completedAthletes}/{session.totalAthletes} sporcu tamamlandı
                            </span>
                          ) : (
                            <span className="text-amber-200">Sporcu listesi henüz eklenmedi</span>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setImportSession(session)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-white transition hover:border-[#e4fc55]/60 hover:bg-[#e4fc55]/10"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Sporcu Listesi
                          </button>
                          <button
                            type="button"
                            onClick={() => openSession(session)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#e4fc55] px-3 py-2.5 text-xs font-bold text-[#070e0e] transition hover:bg-white"
                          >
                            Veri Gir
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f9996]">
                            Oturum Notları
                          </p>
                          {sessionNotes.map((note) => (
                            <NoteItem
                              key={note.id}
                              note={note}
                              onUpdate={updateNote}
                              onDelete={deleteNote}
                            />
                          ))}
                          <AddNoteToggle
                            label="Oturuma not ekle"
                            placeholder="Ör. Ekipman listesi, veli bilgilendirmesi, saha saati..."
                            onSubmit={(draft) =>
                              addDraft(draft, getSessionDateKey(session.testDate), session.id)
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f9996]">
                  Gün Programı
                </p>
                {selectedDayNotes.length === 0 && selectedSessions.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-[#8f9996]">
                    Bu güne planlanmış oturum veya not yok.
                  </p>
                )}
                {selectedDayNotes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    hint={note.sessionId ? "Silinmiş oturumun notu" : undefined}
                    onUpdate={updateNote}
                    onDelete={deleteNote}
                  />
                ))}
                <AddNoteToggle
                  key={selectedDateKey}
                  label="Güne not / program ekle"
                  placeholder="Ör. Kulüple ön görüşme, tablet şarjı, ulaşım..."
                  onSubmit={(draft) => addDraft(draft, selectedDateKey)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e4fc55]/12 text-[#e4fc55]">
                <ListTodo className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Yaklaşan Program</h2>
                <p className="text-sm text-[#b8b8bd]">
                  Önümüzdeki {UPCOMING_DAYS} günün oturumları ve açık notları.
                </p>
              </div>
            </div>

            {upcoming.overdue.length > 0 && (
              <div className="mb-4 rounded-2xl border border-rose-300/25 bg-rose-300/[0.06] p-3">
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Tarihi geçmiş açık görevler ({upcoming.overdue.length})
                </p>
                <div className="space-y-1">
                  {upcoming.overdue.slice(0, 5).map((note) => {
                    const key = noteDateKey.get(note.id) as string;
                    return (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => selectDate(key, { scroll: true, jump: true })}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-white/5"
                      >
                        <span className="flex-none text-[#8f9996]">{formatShortDate(key)}</span>
                        <span className="truncate text-[#d6d6d8]">{note.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {loading ? (
              <p className="py-6 text-center text-sm text-[#b8b8bd]">Yükleniyor...</p>
            ) : upcoming.days.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-[#8f9996]">
                Yaklaşan oturum veya açık not yok.
              </p>
            ) : (
              <div className="space-y-3">
                {upcoming.days.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => selectDate(day.key, { scroll: true, jump: true })}
                    className={`block w-full rounded-2xl border p-3 text-left transition hover:border-[#e4fc55]/50 ${
                      day.key === selectedDateKey
                        ? "border-[#e4fc55]/50 bg-[#e4fc55]/[0.05]"
                        : "border-white/10 bg-[#091312]"
                    }`}
                  >
                    <p className="text-xs font-semibold capitalize text-[#e4fc55]">
                      {day.key === todayKey ? "Bugün" : formatShortDate(day.key)}
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {day.sessions.map((session) => (
                        <div key={session.id} className="flex items-center gap-2 text-sm">
                          <span
                            className={`h-2 w-2 flex-none rounded-full ${statusDotClassName[session.status]}`}
                          />
                          <span className="truncate font-medium">{session.clubName}</span>
                          <span className="ml-auto flex-none text-xs text-[#8f9996]">
                            {session.totalAthletes} sporcu
                          </span>
                        </div>
                      ))}
                      {day.notes.slice(0, 3).map((note) => (
                        <div key={note.id} className="flex items-center gap-2 text-xs text-[#b8b8bd]">
                          <span
                            className={`h-1.5 w-1.5 flex-none rounded-full ${NOTE_CATEGORIES[note.category].dotClassName}`}
                          />
                          {note.time && <span className="flex-none text-[#8f9996]">{note.time}</span>}
                          <span className="truncate">{note.text}</span>
                        </div>
                      ))}
                      {day.notes.length > 3 && (
                        <p className="text-xs text-[#8f9996]">+{day.notes.length - 3} not</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-sm font-semibold">Not Yedeği</h2>
            <p className="mt-1 text-xs leading-5 text-[#8f9996]">
              Takvim notları ana veritabanına yazılmaz, bu cihazın tarayıcısında
              saklanır. Başka cihaza taşımak için yedek alıp orada yükleyin.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={exportBackup}
                disabled={notes.length === 0}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-[#d6d6d8] transition hover:border-[#e4fc55]/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                Yedek Al
              </button>
              <button
                type="button"
                onClick={() => backupInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-[#d6d6d8] transition hover:border-[#e4fc55]/60 hover:text-white"
              >
                <Upload className="h-3.5 w-3.5" />
                Yedek Yükle
              </button>
              <input
                ref={backupInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  importBackup(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
          </section>
        </aside>
      </div>

      {importSession && (
        <SessionAthleteImportModal
          session={importSession}
          onClose={() => setImportSession(null)}
          onImported={loadSessions}
        />
      )}
    </AppShell>
  );
}

function MonthGrid({
  year,
  month,
  todayKey,
  selectedDateKey,
  sessionsByDate,
  dayNotesByDate,
  noteCountByDate,
  onSelect,
}: {
  year: number;
  month: number;
  todayKey: string;
  selectedDateKey: string;
  sessionsByDate: Record<string, CalendarSession[]>;
  dayNotesByDate: Record<string, CalendarNote[]>;
  noteCountByDate: Record<string, number>;
  onSelect: (key: string) => void;
}) {
  const days = useMemo(() => buildMonthDays(year, month), [year, month]);

  return (
    <>
      <div className="grid grid-cols-7 border-b border-white/10 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f6f73] sm:text-xs">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-1 py-3">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const daySessions = sessionsByDate[day.key] || [];
          const dayNotes = dayNotesByDate[day.key] || [];
          const noteCount = noteCountByDate[day.key] || 0;
          const isSelected = day.key === selectedDateKey;
          const isToday = day.key === todayKey;
          return (
            <div
              key={day.key}
              onClick={() => onSelect(day.key)}
              className={`relative min-h-16 cursor-pointer border-b border-white/10 p-1.5 transition sm:p-2 md:min-h-36 md:p-3 ${
                (index + 1) % 7 === 0 ? "" : "border-r"
              } ${day.inMonth ? "hover:bg-white/[0.03]" : "bg-black/20 text-[#6f6f73]"} ${
                isSelected ? "z-[1] outline outline-2 -outline-offset-2 outline-[#e4fc55]/70" : ""
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-1 md:mb-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(day.key);
                  }}
                  aria-label={`${formatLongDate(day.key)} gününü seç`}
                  aria-pressed={isSelected}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold md:h-8 md:w-8 md:text-sm ${
                    isToday
                      ? "bg-[#e4fc55] text-[#070e0e]"
                      : day.inMonth
                      ? "text-white"
                      : "text-[#6f6f73]"
                  }`}
                >
                  {day.date.getDate()}
                </button>
                {noteCount > 0 && (
                  <span
                    className="hidden items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-[#d6d6d8] md:inline-flex"
                    title={`${noteCount} not`}
                  >
                    <NotebookPen className="h-3 w-3" />
                    {noteCount}
                  </span>
                )}
              </div>

              {/* Dar ekran: yalnızca işaretler */}
              <div className="flex flex-wrap gap-1 md:hidden">
                {daySessions.slice(0, 3).map((session) => (
                  <span
                    key={session.id}
                    className={`h-2 w-2 rounded-full ${statusDotClassName[session.status]}`}
                  />
                ))}
                {noteCount > 0 && <span className="h-2 w-2 rounded-full bg-white/70" />}
              </div>

              <div className="hidden space-y-1.5 md:block">
                {daySessions.slice(0, 3).map((session) => (
                  <div
                    key={session.id}
                    className={`rounded-xl border p-2 text-left text-xs ${statusClassName[session.status]}`}
                  >
                    <p className="truncate font-semibold">{session.clubName}</p>
                    <p className="mt-0.5 truncate opacity-80">{session.sportType}</p>
                  </div>
                ))}
                {daySessions.length > 3 && (
                  <p className="text-xs text-[#b8b8bd]">+{daySessions.length - 3} oturum</p>
                )}
                {dayNotes.slice(0, daySessions.length > 0 ? 1 : 2).map((note) => (
                  <p
                    key={note.id}
                    className={`flex items-center gap-1.5 truncate text-xs ${
                      note.done ? "text-[#6f6f73] line-through" : "text-[#b8b8bd]"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 flex-none rounded-full ${NOTE_CATEGORIES[note.category].dotClassName}`}
                    />
                    <span className="truncate">{note.text}</span>
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function YearGrid({
  year,
  todayKey,
  selectedDateKey,
  sessionsByDate,
  noteCountByDate,
  onSelect,
  onOpenMonth,
}: {
  year: number;
  todayKey: string;
  selectedDateKey: string;
  sessionsByDate: Record<string, CalendarSession[]>;
  noteCountByDate: Record<string, number>;
  onSelect: (key: string) => void;
  onOpenMonth: (month: number) => void;
}) {
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) => ({
        month,
        label: new Date(year, month, 1).toLocaleDateString("tr-TR", { month: "long" }),
        prefix: `${year}-${String(month + 1).padStart(2, "0")}`,
        days: buildMonthDays(year, month),
      })),
    [year]
  );

  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 2xl:grid-cols-4">
      {months.map(({ month, label, prefix, days }) => {
        let sessionCount = 0;
        let noteCount = 0;
        days.forEach((day) => {
          if (!day.inMonth) return;
          sessionCount += sessionsByDate[day.key]?.length || 0;
          noteCount += noteCountByDate[day.key] || 0;
        });
        const isCurrentMonth = todayKey.startsWith(prefix);

        return (
          <div
            key={month}
            className={`rounded-2xl border bg-[#091312] p-3 ${
              isCurrentMonth ? "border-[#e4fc55]/40" : "border-white/10"
            }`}
          >
            <button
              type="button"
              onClick={() => onOpenMonth(month)}
              className="mb-2 flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-white/5"
              title="Aylık görünümde aç"
            >
              <span className="font-semibold capitalize">{label}</span>
              <span className="flex flex-none items-center gap-1 whitespace-nowrap text-[11px]">
                {sessionCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-[#e4fc55]/12 px-2 py-0.5 font-semibold text-[#e4fc55]"
                    title={`${sessionCount} oturum`}
                  >
                    <CalendarDays className="h-3 w-3" />
                    {sessionCount}
                  </span>
                )}
                {noteCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 text-[#d6d6d8]"
                    title={`${noteCount} not`}
                  >
                    <NotebookPen className="h-3 w-3" />
                    {noteCount}
                  </span>
                )}
              </span>
            </button>

            <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-[#6f6f73]">
              {WEEKDAYS_MINI.map((day) => (
                <span key={day} className="py-1">
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {days.map((day) => {
                if (!day.inMonth) return <span key={day.key} className="h-8" />;
                const daySessions = sessionsByDate[day.key] || [];
                const hasNotes = (noteCountByDate[day.key] || 0) > 0;
                const isSelected = day.key === selectedDateKey;
                const isToday = day.key === todayKey;
                const titleParts = [
                  ...daySessions.map((session) => session.clubName),
                  hasNotes ? `${noteCountByDate[day.key]} not` : "",
                ].filter(Boolean);

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => onSelect(day.key)}
                    title={titleParts.join(" • ") || undefined}
                    aria-label={`${formatLongDate(day.key)}${
                      titleParts.length ? `: ${titleParts.join(", ")}` : ""
                    }`}
                    aria-pressed={isSelected}
                    className="group relative flex h-8 items-center justify-center"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition ${
                        daySessions.length > 0
                          ? "bg-[#e4fc55] font-bold text-[#070e0e]"
                          : isToday
                          ? "font-bold text-[#e4fc55]"
                          : "text-[#d6d6d8] group-hover:bg-white/10"
                      } ${
                        isSelected
                          ? "ring-2 ring-white"
                          : isToday
                          ? "ring-1 ring-[#e4fc55]"
                          : ""
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                    {daySessions.length > 1 && (
                      <span className="absolute right-0 top-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-white px-0.5 text-[9px] font-bold leading-none text-[#070e0e]">
                        {daySessions.length}
                      </span>
                    )}
                    {hasNotes && (
                      <span className="absolute bottom-0 h-1 w-1 rounded-full bg-white/70" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
