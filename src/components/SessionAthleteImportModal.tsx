"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { mvpTestSessionApi } from "@/lib/api";
import {
  getAthleteMatchKey,
  getSessionGender,
  normalizeBirthDate,
  parseAthleteExcel,
  ParsedAthleteRow,
} from "@/lib/athleteExcel";

export interface ImportTargetSession {
  id: string;
  clubName: string;
  sportType: string;
  testDate?: string;
}

type RowState = "new" | "existing" | "duplicate" | "invalid";

const rowStateLabel: Record<RowState, string> = {
  new: "Eklenecek",
  existing: "Oturumda var",
  duplicate: "Dosyada tekrar",
  invalid: "Doğum yılı yok",
};

const rowStateClassName: Record<RowState, string> = {
  new: "bg-[#e4fc55]/12 text-[#e4fc55]",
  existing: "bg-white/8 text-[#b8b8bd]",
  duplicate: "bg-white/8 text-[#b8b8bd]",
  invalid: "bg-rose-400/10 text-rose-200",
};

// Backend sporcuları tek tek oluşturduğu için büyük listeler istek zaman
// aşımına düşmesin diye parçalara bölünür.
const IMPORT_CHUNK_SIZE = 20;

export default function SessionAthleteImportModal({
  session,
  onClose,
  onImported,
}: {
  session: ImportTargetSession;
  onClose: () => void;
  onImported?: (importedCount: number) => void | Promise<void>;
}) {
  const [existingKeys, setExistingKeys] = useState<Set<string> | null>(null);
  const [existingCount, setExistingCount] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedAthleteRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{
    imported: number;
    failed: number;
    error?: string;
  } | null>(null);

  const loadExistingAthletes = async () => {
    setLoadError("");
    try {
      const response = await mvpTestSessionApi.getAthletes(session.id);
      const athletes: { fullName?: string; birthYear?: number }[] =
        response.data?.data?.athletes || [];
      setExistingKeys(
        new Set(
          athletes
            .filter((athlete) => athlete.fullName)
            .map((athlete) =>
              getAthleteMatchKey(athlete.fullName as string, athlete.birthYear)
            )
        )
      );
      setExistingCount(athletes.length);
    } catch (error) {
      console.error("Oturumdaki sporcular yüklenemedi:", error);
      setLoadError(
        "Oturumdaki mevcut sporcular alınamadı. Kopya kayıt oluşmaması için yükleme yapılamaz."
      );
    }
  };

  useEffect(() => {
    loadExistingAthletes();
    // Modal her oturum için yeniden açılır; yalnızca oturum değişince yükle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !importing) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [importing, onClose]);

  const classifiedRows = useMemo(() => {
    const seen = new Set<string>();
    return rows.map((row) => {
      const key = getAthleteMatchKey(row.fullName, row.birthYear);
      let state: RowState = "new";
      if (!row.birthYear) state = "invalid";
      else if (existingKeys?.has(key)) state = "existing";
      else if (seen.has(key)) state = "duplicate";
      seen.add(key);
      return { row, state };
    });
  }, [rows, existingKeys]);

  const newRows = classifiedRows
    .filter((item) => item.state === "new")
    .map((item) => item.row);
  const skippedCount = classifiedRows.length - newRows.length;

  const handleFile = async (file?: File) => {
    if (!file) return;
    setParseError("");
    setResult(null);
    setFileName(file.name);
    try {
      const parsed = await parseAthleteExcel(file);
      setRows(parsed);
      if (parsed.length === 0) {
        setParseError(
          "Dosyada sporcu bulunamadı. İlk satır başlık, ilk sütun ad soyad, ikinci sütun doğum tarihi olmalı."
        );
      }
    } catch (error) {
      console.error("Excel okunamadı:", error);
      setRows([]);
      setParseError("Dosya okunamadı. Excel (.xlsx, .xls) veya CSV seçin.");
    }
  };

  const handleImport = async () => {
    if (!existingKeys || newRows.length === 0 || importing) return;
    setImporting(true);
    setResult(null);
    setProgress({ done: 0, total: newRows.length });

    const gender = getSessionGender(session.sportType);
    let imported = 0;
    let failed = 0;
    let errorMessage: string | undefined;

    for (let index = 0; index < newRows.length; index += IMPORT_CHUNK_SIZE) {
      const chunk = newRows.slice(index, index + IMPORT_CHUNK_SIZE);
      try {
        const response = await mvpTestSessionApi.importAthletes(
          session.id,
          chunk.map((athlete) => ({
            fullName: athlete.fullName,
            birthDate: normalizeBirthDate(athlete.birthDate),
            birthYear: athlete.birthYear,
            gender,
          }))
        );
        imported += Number(response.data?.data?.imported ?? chunk.length);
        failed += Number(response.data?.data?.failed ?? 0);
      } catch (error) {
        console.error("Sporcu listesi yüklenemedi:", error);
        errorMessage =
          "Yükleme yarıda kesildi. Tekrar yüklediğinizde eklenmiş sporcular atlanır.";
        break;
      } finally {
        setProgress({
          done: Math.min(index + chunk.length, newRows.length),
          total: newRows.length,
        });
      }
    }

    setResult({ imported, failed, error: errorMessage });
    // Tekrar yüklemede kopya oluşmaması için mevcut listeyi tazele.
    await loadExistingAthletes();
    setImporting(false);
    if (imported > 0) await onImported?.(imported);
  };

  const canImport =
    Boolean(existingKeys) && newRows.length > 0 && !importing && !loadError;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={() => !importing && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-athlete-import-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-white/10 bg-[#091312] text-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#e4fc55]/12 text-[#e4fc55]">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="session-athlete-import-title" className="text-lg font-semibold">
                Sporcu Listesi Yükle
              </h2>
              <p className="mt-1 text-sm text-[#b8b8bd]">
                {session.clubName} • {session.sportType}
                {session.testDate
                  ? ` • ${new Date(session.testDate).toLocaleDateString("tr-TR")}`
                  : ""}
              </p>
              <p className="mt-1 text-xs text-[#8f9996]">
                {existingKeys
                  ? `Oturumda şu an ${existingCount} sporcu var. Aynı ad ve doğum yılına sahip sporcular tekrar eklenmez.`
                  : loadError
                  ? ""
                  : "Oturumdaki sporcular kontrol ediliyor..."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="rounded-lg p-1 text-[#8f9996] transition hover:text-white disabled:opacity-40"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          {loadError && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <div>
                <p>{loadError}</p>
                <button
                  type="button"
                  onClick={loadExistingAthletes}
                  className="mt-2 font-semibold text-white underline"
                >
                  Tekrar dene
                </button>
              </div>
            </div>
          )}

          <label
            className={`block rounded-2xl border border-dashed border-[#e4fc55]/40 bg-[#e4fc55]/8 p-5 text-center transition ${
              importing ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-[#e4fc55]/12"
            }`}
          >
            <Upload className="mx-auto h-7 w-7 text-[#e4fc55]" />
            <p className="mt-3 text-sm font-semibold">
              {fileName || "Excel/CSV Dosyası Seç"}
            </p>
            <p className="mt-1 text-xs text-[#b8b8bd]">
              İlk sütun ad soyad, ikinci sütun doğum tarihi (oturum oluştururken
              kullanılan formatla aynı)
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={importing}
              onChange={(event) => {
                handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
              className="hidden"
            />
          </label>

          {parseError && (
            <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
              {parseError}
            </p>
          )}

          {result && (
            <div
              className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
                result.error || result.failed > 0
                  ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                  : "border-[#e4fc55]/30 bg-[#e4fc55]/10 text-[#e4fc55]"
              }`}
            >
              {result.error || result.failed > 0 ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
              )}
              <div>
                <p className="font-semibold">
                  {result.imported} sporcu oturuma eklendi.
                  {result.failed > 0 ? ` ${result.failed} satır eklenemedi.` : ""}
                </p>
                {result.error && <p className="mt-1">{result.error}</p>}
              </div>
            </div>
          )}

          {classifiedRows.length > 0 && (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-[#e4fc55]/12 px-2.5 py-1 font-semibold text-[#e4fc55]">
                  {newRows.length} yeni
                </span>
                {skippedCount > 0 && (
                  <span className="rounded-full bg-white/8 px-2.5 py-1 text-[#d6d6d8]">
                    {skippedCount} atlanacak
                  </span>
                )}
                <span className="text-[#8f9996]">
                  Dosyada toplam {classifiedRows.length} satır
                </span>
              </div>
              <div className="max-h-72 divide-y divide-white/5 overflow-y-auto rounded-2xl border border-white/10">
                {classifiedRows.map(({ row, state }, index) => (
                  <div
                    key={`${row.fullName}-${index}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.fullName}</p>
                      <p className="text-xs text-[#8f9996]">
                        {row.birthDate || "Doğum tarihi yok"}
                      </p>
                    </div>
                    <span
                      className={`flex-none rounded-full px-2.5 py-1 text-xs ${rowStateClassName[state]}`}
                    >
                      {rowStateLabel[state]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-end sm:p-6">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-[#d6d6d8] transition hover:border-white/30 disabled:opacity-40"
          >
            {result ? "Kapat" : "Vazgeç"}
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!canImport}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e4fc55] px-5 py-3 text-sm font-bold text-[#070e0e] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#6f6f73] disabled:text-[#070e0e]/70"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Ekleniyor {progress.done}/{progress.total}
              </>
            ) : (
              `${newRows.length} Sporcuyu Ekle`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
