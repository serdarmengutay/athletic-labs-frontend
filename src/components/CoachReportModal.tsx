"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileDown, Search, Users, X } from "lucide-react";
import type { SessionReportResponse } from "@/types/report";

export interface CoachReportAthlete {
  athleteId?: string;
  fullName: string;
  birthYear: number;
}

interface CoachReportModalProps {
  athletes: CoachReportAthlete[];
  sessionName: string;
  prepareReports: (athleteIds: string[]) => Promise<SessionReportResponse>;
  onClose: () => void;
}

// Seçimler filtre değişiminde korunur; her açılışta boş bir grup seçimi başlar.
export default function CoachReportModal({
  athletes,
  sessionName,
  prepareReports,
  onClose,
}: CoachReportModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  // Pencere açıkken arka plan kaydırılmaz; üretim sırasında kapanma engellenir.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const available = useMemo(
    () =>
      athletes.filter(
        (athlete): athlete is CoachReportAthlete & { athleteId: string } =>
          Boolean(athlete.athleteId),
      ),
    [athletes],
  );
  const years = [
    ...new Set(available.map((athlete) => athlete.birthYear)),
  ].sort();
  const filtered = available.filter(
    (athlete) =>
      (!year || String(athlete.birthYear) === year) &&
      athlete.fullName
        .toLocaleLowerCase("tr")
        .includes(query.trim().toLocaleLowerCase("tr")),
  );
  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((athlete) => selectedIds.has(athlete.athleteId));

  // Toplu seçim yalnızca görünür sporcuları değiştirir.
  const toggleFiltered = () =>
    setSelectedIds((previous) => {
      const next = new Set(previous);
      filtered.forEach((athlete) =>
        allFilteredSelected
          ? next.delete(athlete.athleteId)
          : next.add(athlete.athleteId),
      );
      return next;
    });
  const toggleAthlete = (id: string) =>
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Hata halinde seçim kaybolmaz; tekrar indirme için aynı grup korunur.
  const download = async () => {
    if (busyRef.current || !selectedIds.size) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setStatus("Güncel karneler hazırlanıyor...");
    try {
      const session = await prepareReports([...selectedIds]);
      const { exportCoachReportPdf } = await import(
        "@/utils/coachReportExport"
      );
      await exportCoachReportPdf(
        session,
        [...selectedIds],
        groupName.trim(),
        (current, total) =>
          setStatus(`PDF hazırlanıyor: ${current} / ${total} sayfa`),
      );
      setStatus(`${selectedIds.size} sporculuk antrenör raporu indirildi.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Rapor oluşturulamadı. Lütfen tekrar deneyin.",
      );
      setStatus("");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-report-title"
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col rounded-3xl border border-[#e4fc55]/25 bg-[#091312] text-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <h2
              id="coach-report-title"
              className="flex items-center gap-2 text-xl font-semibold"
            >
              <Users className="h-5 w-5 text-[#e4fc55]" />
              Antrenör Raporu Çıkar
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {sessionName} · Rapora eklenecek sporcuları seçin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Kapat"
            className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <fieldset disabled={busy} className="min-w-0 disabled:opacity-70">
            <div className="space-y-4 p-5">
              <label className="block text-sm font-medium">
                Grup / antrenör adı{" "}
                <span className="text-slate-500">(isteğe bağlı)</span>
                <input
                  autoFocus
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  maxLength={60}
                  placeholder="Örn. U14 · Ahmet Hoca"
                  className="mt-2 w-full rounded-xl border border-white/10 px-3 py-2.5 outline-none focus:border-[#e4fc55]"
                />
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative flex-1">
                  <Search
                    size={17}
                    className="absolute left-3 top-3 text-slate-500"
                  />
                  <input
                    aria-label="Sporcu ara"
                    placeholder="Sporcu ara"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full rounded-xl border border-white/10 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#e4fc55]"
                  />
                </label>
                <select
                  aria-label="Doğum yılı"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  className="rounded-xl border border-white/10 px-3 py-2.5 text-sm"
                >
                  <option value="">Tüm doğum yılları</option>
                  {years.map((value) => (
                    <option key={value} value={value}>
                      {value || "Belirtilmedi"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    disabled={!filtered.length || busy}
                    onChange={toggleFiltered}
                    className="h-4 w-4 accent-[#e4fc55]"
                  />
                  Görünenleri seç ({filtered.length})
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-slate-400 hover:text-white"
                >
                  Seçimi temizle
                </button>
              </div>
            </div>
            <div
              className="min-h-24 overflow-y-auto border-y border-white/10 px-5"
              style={{ maxHeight: 340 }}
            >
              {filtered.map((athlete) => (
                <label
                  key={athlete.athleteId}
                  className={`flex cursor-pointer items-center gap-3 border-b border-white/5 px-2 py-3 ${selectedIds.has(athlete.athleteId) ? "bg-[#e4fc55]/5" : "hover:bg-white/5"}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(athlete.athleteId)}
                    onChange={() => toggleAthlete(athlete.athleteId)}
                    className="h-4 w-4 accent-[#e4fc55]"
                  />
                  <span className="flex-1 text-sm font-medium">
                    {athlete.fullName}
                  </span>
                  <span className="text-sm text-slate-400">
                    {athlete.birthYear || "-"}
                  </span>
                </label>
              ))}
              {!filtered.length && (
                <p className="py-10 text-center text-sm text-slate-400">
                  Bu filtreye uygun sporcu bulunamadı.
                </p>
              )}
            </div>
          </fieldset>
        </div>
        <footer className="shrink-0 space-y-3 border-t border-white/10 p-5">
          <p className="text-xs leading-5 text-slate-400">
            Yalnızca seçilen sporcular, mevcut karne verileri ve karnelerindeki
            QR kodlarıyla tek PDF dosyasına eklenir. Eksik ölçümler “-” olarak
            görünür.
          </p>
          {athletes.length > available.length && (
            <p className="text-xs text-amber-300">
              {athletes.length - available.length} sporcu henüz sisteme
              kaydedilmediği için seçilemiyor.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200"
            >
              {error}
            </p>
          )}
          {status && (
            <p role="status" className="text-sm text-[#e4fc55]">
              {status}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <strong className="text-sm">
              {selectedIds.size} sporcu seçildi
            </strong>
            <button
              type="button"
              onClick={download}
              disabled={busy || !selectedIds.size}
              className="flex items-center gap-2 rounded-xl bg-[#e4fc55] px-5 py-3 text-sm font-bold text-[#070e0e] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileDown size={18} />
              {busy ? "Hazırlanıyor..." : "Antrenör Raporunu İndir"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
