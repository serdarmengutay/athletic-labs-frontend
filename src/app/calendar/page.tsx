"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { mvpTestSessionApi } from "@/lib/api";
import { DEFAULT_VALD_SESSION_CONFIG } from "@/lib/valdConfig";

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

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getSessionDateKey = (value: string) => toDateKey(new Date(value));

export default function CalendarPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await mvpTestSessionApi.getAll();
        setSessions(response.data?.data || []);
      } catch (error) {
        console.error("Takvim oturumları yüklenemedi:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, []);

  const sessionsByDate = useMemo(() => {
    return sessions.reduce<Record<string, CalendarSession[]>>((acc, session) => {
      const dateKey = getSessionDateKey(session.testDate);
      acc[dateKey] = [...(acc[dateKey] || []), session];
      return acc;
    }, {});
  }, [sessions]);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + index);
      return {
        date: day,
        key: toDateKey(day),
        inMonth: day.getMonth() === month,
        isToday: toDateKey(day) === toDateKey(new Date()),
      };
    });
  }, [visibleMonth]);

  const selectedMonthLabel = visibleMonth.toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });

  const monthSessions = sessions
    .filter((session) => {
      const date = new Date(session.testDate);
      return (
        date.getFullYear() === visibleMonth.getFullYear() &&
        date.getMonth() === visibleMonth.getMonth()
      );
    })
    .sort(
      (first, second) =>
        new Date(first.testDate).getTime() - new Date(second.testDate).getTime()
    );

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

  const changeMonth = (direction: -1 | 1) => {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + direction, 1)
    );
  };

  return (
    <AppShell
      title="Takvim"
      subtitle="Test oturumlarını test tarihlerine göre aylık görünümde takip edin."
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
      <div className="space-y-6">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold capitalize">{selectedMonthLabel}</h2>
              <p className="mt-1 text-sm text-[#b8b8bd]">
                Bu ay {monthSessions.length} test oturumu planlı.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="rounded-xl border border-white/10 p-3 text-[#d6d6d8] transition hover:border-[#e4fc55]/60 hover:text-white"
                aria-label="Önceki ay"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                }}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-[#d6d6d8] transition hover:border-[#e4fc55]/60 hover:text-white"
              >
                Bugün
              </button>
              <button
                onClick={() => changeMonth(1)}
                className="rounded-xl border border-white/10 p-3 text-[#d6d6d8] transition hover:border-[#e4fc55]/60 hover:text-white"
                aria-label="Sonraki ay"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-white/10 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#6f6f73]">
            {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => (
              <div key={day} className="px-2 py-3">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7">
            {calendarDays.map((day) => {
              const daySessions = sessionsByDate[day.key] || [];
              return (
                <div
                  key={day.key}
                  className={`min-h-36 border-b border-white/10 p-3 md:border-r ${
                    day.inMonth ? "bg-transparent" : "bg-black/18 text-[#6f6f73]"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        day.isToday
                          ? "bg-[#e4fc55] text-[#070e0e]"
                          : day.inMonth
                          ? "text-white"
                          : "text-[#6f6f73]"
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                    {daySessions.length > 0 && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-[#d6d6d8]">
                        {daySessions.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {daySessions.slice(0, 3).map((session) => (
                      <button
                        key={session.id}
                        onClick={() => openSession(session)}
                        className={`block w-full rounded-xl border p-2 text-left text-xs transition hover:border-[#e4fc55]/70 ${statusClassName[session.status]}`}
                      >
                        <p className="truncate font-semibold">{session.clubName}</p>
                        <p className="mt-1 truncate opacity-80">{session.sportType}</p>
                      </button>
                    ))}
                    {daySessions.length > 3 && (
                      <p className="text-xs text-[#b8b8bd]">
                        +{daySessions.length - 3} oturum
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e4fc55]/12 text-[#e4fc55]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Bu Ayki Oturumlar</h2>
              <p className="text-sm text-[#b8b8bd]">
                Tarih sırasına göre saha planı.
              </p>
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
              {monthSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => openSession(session)}
                  className="rounded-2xl border border-white/10 bg-[#091312] p-4 text-left transition hover:border-[#e4fc55]/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{session.clubName}</p>
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
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClassName[session.status]}`}>
                      {statusLabel[session.status]}
                    </span>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#e4fc55]">
                    Oturumu Aç
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
