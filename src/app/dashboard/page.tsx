"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { mvpTestSessionApi } from "@/lib/api";
import { DEFAULT_VALD_SESSION_CONFIG } from "@/lib/valdConfig";

interface DashboardSession {
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

const statusLabel: Record<DashboardSession["status"], string> = {
  draft: "Hazırlık",
  in_progress: "Aktif",
  completed: "Tamamlandı",
};

export default function Dashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await mvpTestSessionApi.getAll();
        setSessions(response.data?.data || []);
      } catch (error) {
        console.error("Test oturumları yüklenemedi:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, []);

  const filteredSessions = useMemo(() => {
    const normalized = query.toLocaleLowerCase("tr").trim();
    if (!normalized) return sessions;
    return sessions.filter((session) =>
      [session.clubName, session.city, session.sportType]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(normalized)
    );
  }, [query, sessions]);

  const totalAthletes = sessions.reduce(
    (sum, session) => sum + session.totalAthletes,
    0
  );
  const activeSessions = sessions.filter(
    (session) => session.status !== "completed"
  ).length;
  const completedSessions = sessions.filter(
    (session) => session.status === "completed"
  ).length;

  const openSession = (session: DashboardSession) => {
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

  return (
    <AppShell
      title="Test Oturumları"
      subtitle="Planlanan saha testlerini, sporcu sayılarını ve veri giriş durumlarını buradan takip edin."
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
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Toplam Oturum", value: sessions.length, icon: ClipboardList },
            { label: "Aktif Oturum", value: activeSessions, icon: CalendarDays },
            { label: "Toplam Sporcu", value: totalAthletes, icon: Users },
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

        <section className="rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Oturum Listesi</h2>
              <p className="mt-1 text-sm text-[#b8b8bd]">
                {completedSessions} tamamlandı, {activeSessions} aktif/hazırlıkta.
              </p>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Kulüp, şehir veya branş ara..."
              className="w-full rounded-2xl border border-white/10 bg-[#091312] px-4 py-3 text-sm text-white outline-none placeholder:text-[#6f6f73] focus:border-[#e4fc55]/80 md:max-w-sm"
            />
          </div>

          <div className="p-4">
            {loading ? (
              <div className="py-16 text-center text-[#b8b8bd]">Yükleniyor...</div>
            ) : filteredSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-[#6f6f73]" />
                <p className="mt-3 text-sm text-[#b8b8bd]">Oturum bulunamadı.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredSessions.map((session) => {
                  const progress =
                    session.totalAthletes > 0
                      ? Math.round(
                          (session.completedAthletes / session.totalAthletes) * 100
                        )
                      : 0;
                  return (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-white/10 bg-[#091312] p-4 transition hover:border-[#e4fc55]/50"
                    >
                      <div className="grid gap-4 lg:grid-cols-[1fr_180px_150px] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold">
                              {session.clubName}
                            </h3>
                            <span className="rounded-full bg-[#e4fc55]/12 px-2.5 py-1 text-xs font-semibold text-[#e4fc55]">
                              {session.sportType}
                            </span>
                            <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-[#d6d6d8]">
                              {statusLabel[session.status]}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#b8b8bd]">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-4 w-4" />
                              {session.city}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-4 w-4" />
                              {new Date(session.testDate).toLocaleDateString("tr-TR")}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="h-4 w-4" />
                              {session.totalAthletes} sporcu
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between text-xs text-[#b8b8bd]">
                            <span>Veri Girişi</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-[#e4fc55]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="mt-2 text-xs text-[#6f6f73]">
                            {session.completedAthletes}/{session.totalAthletes} tamamlandı
                          </p>
                        </div>

                        <button
                          onClick={() => openSession(session)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#e4fc55]/70 hover:bg-[#e4fc55]/10"
                        >
                          Veri Gir
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <div className="rounded-3xl border border-[#e4fc55]/20 bg-[#e4fc55]/8 p-5">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-[#e4fc55]" />
            <div>
              <h3 className="font-semibold">Saha Kullanım Notu</h3>
              <p className="mt-1 text-sm leading-6 text-[#d6d6d8]">
                Bir oturumu açtığınızda sporcu listesi backend’den tekrar çekilir.
                Bu sayede “gelmedi” ve ölçüm verileri tabletler arasında ortak görünür.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
