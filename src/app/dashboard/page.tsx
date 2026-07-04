"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  Edit3,
  MapPin,
  Plus,
  Printer,
  QrCode,
  Save,
  Users,
  X,
} from "lucide-react";
import QRCode from "qrcode";
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

const DEFAULT_PRODUCTION_REGISTRATION_BASE_URL =
  "https://kayit.athleticlabs.com.tr";
const REGISTRATION_BASE_URL =
  process.env.NEXT_PUBLIC_REGISTRATION_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? DEFAULT_PRODUCTION_REGISTRATION_BASE_URL
    : undefined);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function Dashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editingSession, setEditingSession] = useState<DashboardSession | null>(
    null
  );
  const [editForm, setEditForm] = useState({
    clubName: "",
    clubResponsibleName: "",
    city: "",
    sportType: "",
    testDate: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [qrSession, setQrSession] = useState<DashboardSession | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrError, setQrError] = useState("");

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

  useEffect(() => {
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

  const getRegistrationLink = (session: DashboardSession) => {
    const baseUrl =
      REGISTRATION_BASE_URL ||
      (typeof window === "undefined" ? "" : window.location.origin);
    return `${baseUrl.replace(/\/$/, "")}/kayit/${session.id}`;
  };

  const copyRegistrationLink = async (session: DashboardSession) => {
    const link = getRegistrationLink(session);
    try {
      await navigator.clipboard.writeText(link);
      setCopyMessage(`${session.clubName} kayıt linki kopyalandı.`);
    } catch {
      setCopyMessage(link);
    }
    window.setTimeout(() => setCopyMessage(""), 2500);
  };

  const openEditModal = (session: DashboardSession) => {
    setEditingSession(session);
    setEditForm({
      clubName: session.clubName,
      clubResponsibleName: session.clubResponsibleName,
      city: session.city,
      sportType: session.sportType,
      testDate: new Date(session.testDate).toISOString().slice(0, 10),
    });
  };

  const openQrModal = async (session: DashboardSession) => {
    const link = getRegistrationLink(session);
    setQrSession(session);
    setQrDataUrl("");
    setQrError("");

    try {
      const dataUrl = await QRCode.toDataURL(link, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 720,
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error("Kayıt QR oluşturulamadı:", error);
      setQrError("QR oluşturulamadı. Linki kopyalayıp tekrar deneyin.");
    }
  };

  const printRegistrationQr = () => {
    if (!qrSession || !qrDataUrl) return;

    const escapedClubName = escapeHtml(qrSession.clubName);
    const logoUrl = `${window.location.origin}/athleticlabs_logo.png`;
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      alert("Yazdırma penceresi açılamadı. Tarayıcı pop-up iznini kontrol edin.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="tr">
        <head>
          <meta charset="utf-8" />
          <title>${escapedClubName} Athletic Labs Kayıt QR</title>
          <style>
            @page { size: A4; margin: 18mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              min-height: 100vh;
              font-family: Arial, Helvetica, sans-serif;
              color: #07100f;
              background: #ffffff;
            }
            .sheet {
              min-height: calc(297mm - 36mm);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 22px;
              text-align: center;
              border: 3px solid #07100f;
              padding: 28px;
            }
            .brand {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 14px;
              font-size: 24px;
              font-weight: 800;
            }
            .brand img {
              width: 54px;
              height: 54px;
              border-radius: 999px;
            }
            h1 {
              margin: 0;
              font-size: 34px;
              line-height: 1.12;
            }
            .qr {
              width: 360px;
              height: 360px;
              image-rendering: crisp-edges;
            }
            .instruction {
              max-width: 560px;
              font-size: 22px;
              font-weight: 700;
              line-height: 1.32;
            }
            .link {
              max-width: 620px;
              overflow-wrap: anywhere;
              font-size: 12px;
              color: #52605c;
            }
          </style>
        </head>
        <body>
          <main class="sheet">
            <div class="brand">
              <img src="${logoUrl}" alt="Athletic Labs" />
              <span>Athletic Labs</span>
            </div>
            <h1>${escapedClubName}<br />Test Ön Kaydı</h1>
            <img class="qr" src="${qrDataUrl}" alt="Athletic Labs kayıt QR" />
            <div class="instruction">
              Teste katılacak sporcu için QR kodu telefonunuzla okutun ve kayıt formunu doldurun.
            </div>
          </main>
          <script>
            window.onload = () => {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingSession) return;

    if (
      !editForm.clubName ||
      !editForm.clubResponsibleName ||
      !editForm.city ||
      !editForm.sportType ||
      !editForm.testDate
    ) {
      alert("Kulüp, sorumlu, şehir, spor dalı ve test tarihini doldurun.");
      return;
    }

    setSavingEdit(true);
    try {
      const response = await mvpTestSessionApi.update(editingSession.id, {
        clubName: editForm.clubName,
        clubResponsibleName: editForm.clubResponsibleName,
        city: editForm.city,
        sportType: editForm.sportType,
        testDate: editForm.testDate,
      });
      const updated = response.data?.data;
      setSessions((current) =>
        current.map((session) =>
          session.id === editingSession.id
            ? {
                ...session,
                clubName: updated?.clubName || editForm.clubName,
                clubResponsibleName:
                  updated?.clubResponsibleName || editForm.clubResponsibleName,
                city: updated?.city || editForm.city,
                sportType: updated?.sportType || editForm.sportType,
                testDate: updated?.testDate || editForm.testDate,
              }
            : session
        )
      );
      setEditingSession(null);
      await loadSessions();
    } catch (error) {
      console.error("Oturum güncellenemedi:", error);
      alert("Oturum güncellenemedi. Backend loglarını kontrol edin.");
    } finally {
      setSavingEdit(false);
    }
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
        {copyMessage && (
          <div className="rounded-2xl border border-[#e4fc55]/30 bg-[#e4fc55]/10 px-4 py-3 text-sm font-semibold text-[#e4fc55]">
            {copyMessage}
          </div>
        )}

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
                      <div className="grid gap-4 lg:grid-cols-[1fr_180px_260px] lg:items-center">
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

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                          <button
                            onClick={() => openSession(session)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#e4fc55]/70 hover:bg-[#e4fc55]/10"
                          >
                            Veri Gir
                            <ArrowRight className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(session)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-[#e4fc55]/70 hover:bg-[#e4fc55]/10"
                          >
                            <Edit3 className="h-4 w-4" />
                            Düzenle
                          </button>
                          <button
                            onClick={() => openQrModal(session)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e4fc55]/30 px-4 py-3 text-sm font-semibold text-[#e4fc55] transition hover:bg-[#e4fc55]/10 sm:col-span-2 lg:col-span-1 xl:col-span-2"
                          >
                            <QrCode className="h-4 w-4" />
                            Kayıt QR
                          </button>
                        </div>
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

      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleEditSubmit}
            className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#091312] p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Oturumu Düzenle</h2>
                <p className="mt-1 text-sm text-[#b8b8bd]">
                  Test tarihi veya temel oturum bilgileri değişirse burada
                  güncelleyin. Kayıt linki aynı kalır.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="rounded-xl border border-white/10 p-2 text-[#b8b8bd] transition hover:border-white/30 hover:text-white"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-[#d6d6d8]">
                  Kulüp Adı
                </span>
                <input
                  value={editForm.clubName}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      clubName: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#070e0e] px-4 py-3 text-white outline-none focus:border-[#e4fc55]/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#d6d6d8]">
                  Kulüp Yetkilisi
                </span>
                <input
                  value={editForm.clubResponsibleName}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      clubResponsibleName: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#070e0e] px-4 py-3 text-white outline-none focus:border-[#e4fc55]/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#d6d6d8]">Şehir</span>
                <input
                  value={editForm.city}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#070e0e] px-4 py-3 text-white outline-none focus:border-[#e4fc55]/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#d6d6d8]">
                  Spor Dalı
                </span>
                <select
                  value={editForm.sportType}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      sportType: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#070e0e] px-4 py-3 text-white outline-none focus:border-[#e4fc55]/80"
                >
                  <option value="">Spor dalı seçin</option>
                  <option value="Futbol">Futbol</option>
                  <option value="Kız Voleybol">Kız Voleybol</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-[#d6d6d8]">
                  Test Tarihi
                </span>
                <input
                  type="date"
                  value={editForm.testDate}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      testDate: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#070e0e] px-4 py-3 text-white outline-none focus:border-[#e4fc55]/80"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#e4fc55] px-5 py-3 text-sm font-bold text-[#070e0e] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#6f6f73]"
              >
                <Save className="h-4 w-4" />
                {savingEdit ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </div>
      )}

      {qrSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#091312] p-5 shadow-2xl sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Kayıt QR</h2>
                <p className="mt-1 text-sm text-[#b8b8bd]">
                  Bu QR kodu saha girişine asabilirsiniz. Okutan veli/sporcu
                  kayıt formuna yönlenir.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQrSession(null)}
                className="rounded-xl border border-white/10 p-2 text-[#b8b8bd] transition hover:border-white/30 hover:text-white"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white p-4 text-[#070e0e]">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3">
                  <img
                    src="/athleticlabs_logo.png"
                    alt="Athletic Labs"
                    className="h-11 w-11 rounded-full object-cover"
                  />
                  <div className="text-xl font-bold">Athletic Labs</div>
                </div>
                <div className="mt-2 text-xl font-bold">{qrSession.clubName}</div>
              </div>

              <div className="mt-4 flex min-h-[260px] items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Athletic Labs kayıt QR"
                    className="h-64 w-64"
                  />
                ) : qrError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-700">
                    {qrError}
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-[#52605c]">
                    QR oluşturuluyor...
                  </div>
                )}
              </div>

              <p className="mt-3 break-words text-center text-xs text-[#52605c]">
                {getRegistrationLink(qrSession)}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => copyRegistrationLink(qrSession)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30"
              >
                <Copy className="h-4 w-4" />
                Linki Kopyala
              </button>
              <button
                type="button"
                disabled={!qrDataUrl}
                onClick={printRegistrationQr}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#e4fc55] px-5 py-3 text-sm font-bold text-[#070e0e] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#6f6f73]"
              >
                <Printer className="h-4 w-4" />
                Yazdır
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
