import { toJpeg } from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import QRCode from "qrcode";
import {
  AthleteReportResponse,
  FrontendAthleteReport,
  MetricResult,
  SessionReportResponse,
} from "@/types/report";
import { createElement, type CSSProperties, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import AthleteReport from "@/components/AthleteReport";
import { normalizeSprintMeasurements } from "@/lib/normalizeSprintMeasurements";
import {
  Activity,
  ArrowUp10,
  BadgeInfo,
  BarChart3,
  BicepsFlexed,
  Bolt,
  CalendarDays,
  Dna,
  Gem,
  HandFist,
  HeartPulse,
  LineChart,
  Ruler,
  Stethoscope,
  Target,
  Timer,
  Trophy,
  UserRound,
  Weight,
  Zap,
} from "lucide-react";

const REPORT_WIDTH = 1400;
const REPORT_HEIGHT = 1127;
const REPORT_PIXEL_RATIO = 2;
const REPORT_JPEG_QUALITY = 0.95;
const REPORT_RENDER_RETRY_PIXEL_RATIO = 1.5;
const REPORTS_PER_ZIP = 10;

let cachedLogoDataUrl: string | undefined;

type ExportableReport =
  | { kind: "legacy"; report: AthleteReportResponse }
  | {
      kind: "session";
      report: FrontendAthleteReport;
      clubName: string;
      testDate?: string;
      generatedAt: string;
      hideVerticalJump?: boolean;
      youjiQrDataUrl?: string;
      logoDataUrl?: string;
    };

export interface ReportExportResult {
  exportedCount: number;
  failedReports: string[];
  archiveCount: number;
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);
}

async function loadAssetAsDataUrl(path: string): Promise<string | undefined> {
  if (path === "/athleticlabs_logo_export.png" && cachedLogoDataUrl) {
    return cachedLogoDataUrl;
  }

  try {
    const assetUrl = new URL(path, window.location.origin);
    assetUrl.searchParams.set("v", "20260613");
    const response = await fetch(assetUrl.toString(), { cache: "no-store" });
    if (!response.ok) return undefined;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return undefined;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === "string"
          ? resolve(reader.result)
          : reject(new Error("Görsel data URL formatına çevrilemedi."));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const validDataUrl = image.naturalWidth > 0 ? dataUrl : undefined;
    if (path === "/athleticlabs_logo_export.png") {
      cachedLogoDataUrl = validDataUrl;
    }
    return validDataUrl;
  } catch {
    return undefined;
  }
}

async function waitForReportAssets(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.onload = () => resolve();
          image.onerror = () => resolve();
        })
    )
  );
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
}

async function renderReportToImage(
  exportableReport: ExportableReport,
  pixelRatio = REPORT_PIXEL_RATIO
): Promise<Blob> {
  const container = document.createElement("div");
  container.id = "report-export-container";
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = `${REPORT_WIDTH}px`;
  container.style.height = `${REPORT_HEIGHT}px`;
  container.style.zIndex = "-1";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    const youjiQrDataUrl =
      exportableReport.kind === "session" &&
      exportableReport.report.youjiSummary?.deviceReportUrl
        ? await QRCode.toDataURL(exportableReport.report.youjiSummary.deviceReportUrl, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 180,
          })
        : undefined;
    const logoDataUrl =
      exportableReport.kind === "session"
        ? await loadAssetAsDataUrl("/athleticlabs_logo_export.png")
        : undefined;

    const reportElement =
      exportableReport.kind === "legacy"
        ? createElement(AthleteReport, { report: exportableReport.report })
        : createElement(MvpAthleteReport, {
            report: exportableReport.report,
            testDate: exportableReport.testDate,
            generatedAt: exportableReport.generatedAt,
            hideVerticalJump: exportableReport.hideVerticalJump,
            youjiQrDataUrl,
            logoDataUrl,
          });

    await new Promise<void>((resolve) => {
      root.render(reportElement);
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await waitForReportAssets(container);

    const dataUrl = await toJpeg(container, {
      width: REPORT_WIDTH,
      height: REPORT_HEIGHT,
      cacheBust: true,
      pixelRatio,
      quality: REPORT_JPEG_QUALITY,
      backgroundColor: "#06110f",
      style: {
        width: `${REPORT_WIDTH}px`,
        height: `${REPORT_HEIGHT}px`,
      },
    });

    const response = await fetch(dataUrl);
    return await response.blob();
  } finally {
    root.unmount();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

async function renderReportWithRetry(
  exportableReport: ExportableReport
): Promise<Blob> {
  try {
    return await renderReportToImage(exportableReport);
  } catch (firstError) {
    console.warn(
      "Karne yüksek çözünürlükte oluşturulamadı, düşük bellek modu deneniyor:",
      firstError
    );
    return renderReportToImage(
      exportableReport,
      REPORT_RENDER_RETRY_PIXEL_RATIO
    );
  }
}

const yieldToBrowser = () =>
  new Promise<void>((resolve) => window.setTimeout(resolve, 30));

export async function exportReportsToZip(
  reports: AthleteReportResponse[] | SessionReportResponse,
  sessionName: string,
  onProgress?: (current: number, total: number) => void
): Promise<ReportExportResult> {
  const exportableReports = normalizeReports(reports);
  const failedReports: string[] = [];
  let exportedCount = 0;
  let archiveCount = 0;

  for (
    let batchStart = 0;
    batchStart < exportableReports.length;
    batchStart += REPORTS_PER_ZIP
  ) {
    const zip = new JSZip();
    const batch = exportableReports.slice(
      batchStart,
      batchStart + REPORTS_PER_ZIP
    );
    const batchFailedReports: string[] = [];
    let batchExportedCount = 0;

    for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
      const exportableReport = batch[batchIndex];
      const reportIndex = batchStart + batchIndex;

      if (onProgress) {
        onProgress(reportIndex + 1, exportableReports.length);
      }

      try {
        const imageBlob = await renderReportWithRetry(exportableReport);
        const index = String(reportIndex + 1).padStart(3, "0");
        const fullName =
          exportableReport.kind === "legacy"
            ? exportableReport.report.athlete.fullName
            : exportableReport.report.fullName;
        const fileName = `${index}_${sanitizeFileName(fullName)}_karne.jpg`;

        zip.file(fileName, imageBlob);
        batchExportedCount++;
        exportedCount++;
      } catch (error) {
        const fullName =
          exportableReport.kind === "legacy"
            ? exportableReport.report.athlete.fullName
            : exportableReport.report.fullName;
        console.error(`Failed to export report for ${fullName}:`, error);
        failedReports.push(fullName);
        batchFailedReports.push(fullName);
      }

      await yieldToBrowser();
    }

    if (batchExportedCount === 0) {
      continue;
    }

    if (batchFailedReports.length > 0) {
      zip.file(
        "OLUSTURULAMAYAN_KARNELER.txt",
        [
          "Aşağıdaki karneler oluşturulamadı:",
          "",
          ...batchFailedReports.map((name) => `- ${name}`),
          "",
          "Bu sporcuların verilerini kontrol edip karneleri yeniden oluşturun.",
        ].join("\n")
      );
    }

    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "STORE",
      streamFiles: true,
    });
    const batchEnd = batchStart + batch.length;
    const partNumber = String(archiveCount + 1).padStart(2, "0");
    saveAs(
      zipBlob,
      `${sanitizeFileName(sessionName)}_karneler_${partNumber}_${String(
        batchStart + 1
      ).padStart(3, "0")}-${String(batchEnd).padStart(3, "0")}.zip`
    );
    archiveCount++;

    // Separate downloads and release the completed archive before the next one.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 750));
  }

  if (exportedCount === 0) {
    throw new Error("Hiçbir karne görseli oluşturulamadı.");
  }

  return {
    exportedCount,
    failedReports,
    archiveCount,
  };
}

function normalizeReports(
  reports: AthleteReportResponse[] | SessionReportResponse
): ExportableReport[] {
  if (Array.isArray(reports)) {
    return reports.map((report) => ({ kind: "legacy", report }));
  }

  return reports.athletes.map((report) => ({
    kind: "session",
    report,
    clubName: reports.clubName,
    testDate: reports.testDate,
    generatedAt: reports.reportGeneratedAt,
    hideVerticalJump: Boolean(reports.valdEnabled),
  }));
}

function valueOf(metric: MetricResult, fallback?: number): number | null {
  if (typeof fallback === "number" && Number.isFinite(fallback)) return fallback;
  if (metric.value === null || Number.isNaN(metric.value)) return null;
  return Number(metric.value);
}

function formatValue(value: number | null | undefined, unit = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const precision =
    unit === "sn" ? 2 : unit === "%" ? 1 : unit === "adet" ? 0 : 1;
  return `${Number(value).toFixed(precision)}${unit ? ` ${unit}` : ""}`;
}

function formatPass(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value)} adet / 30 sn`;
}

function formatReportDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calcVki(height?: number, weight?: number): number | null {
  if (!height || !weight) return null;
  return weight / Math.pow(height / 100, 2);
}

function vkiLabel(vki: number | null): string {
  if (vki === null) return "-";
  if (vki < 18.5) return `${formatValue(vki)} (Düşük)`;
  if (vki < 25) return `${formatValue(vki)} (Normal)`;
  if (vki < 30) return `${formatValue(vki)} (Yüksek)`;
  return `${formatValue(vki)} (Çok Yüksek)`;
}

type ChartDirection = "lower_is_better" | "higher_is_better";

type ChartMetric = {
  label: string;
  shortLabel: string;
  unit: string;
  direction: ChartDirection;
  min: number;
  max: number;
};

type ChartDatum = {
  label: string;
  shortLabel: string;
  unit: string;
  athleteValue: number | null;
  averageValue: number | null;
  athletePlot: number;
  averagePlot: number;
};

type RadarScoreDatum = {
  label: string;
  shortLabel: string;
  athleteScore: number | null;
  averageScore: number | null;
};

const CHART_METRICS: ChartMetric[] = [
  {
    label: "VKI",
    shortLabel: "VKI",
    unit: "",
    direction: "higher_is_better",
    min: 8,
    max: 60,
  },
  {
    label: "Esneklik",
    shortLabel: "Esneklik",
    unit: "cm",
    direction: "higher_is_better",
    min: -30,
    max: 60,
  },
  {
    label: "30m Koşu",
    shortLabel: "30m",
    unit: "sn",
    direction: "lower_is_better",
    min: 2,
    max: 15,
  },
  {
    label: "İkinci 30m",
    shortLabel: "2. 30m",
    unit: "sn",
    direction: "lower_is_better",
    min: 2,
    max: 15,
  },
  {
    label: "Çeviklik",
    shortLabel: "Çeviklik",
    unit: "sn",
    direction: "lower_is_better",
    min: 4,
    max: 40,
  },
  {
    label: "Dikey Sıçrama",
    shortLabel: "Sıçrama",
    unit: "cm",
    direction: "higher_is_better",
    min: 5,
    max: 120,
  },
  {
    label: "Pas",
    shortLabel: "Pas",
    unit: "adet",
    direction: "higher_is_better",
    min: 0,
    max: 35,
  },
];

function normalizeForRadar(
  value: number | null,
  metric: ChartMetric
): number {
  if (value === null || Number.isNaN(value)) return 0;
  const clamped = Math.max(metric.min, Math.min(metric.max, value));
  const ratio = (clamped - metric.min) / (metric.max - metric.min);
  const normalized =
    metric.direction === "lower_is_better" ? 1 - ratio : ratio;
  return Math.max(0, Math.min(100, normalized * 100));
}

function normalizeScore(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Number(Math.max(0, Math.min(100, value)).toFixed(1));
}

function resolveRadarScore(
  metric: MetricResult,
  rawValue: number | null,
  chartMetric: ChartMetric,
  averageValue: number | null
): number | null {
  const backendScore = normalizeScore(metric.score);
  if (backendScore !== null) return backendScore;

  if (metric.percentile !== null && Number.isFinite(metric.percentile)) {
    return normalizeScore(metric.percentile);
  }

  if (
    rawValue !== null &&
    averageValue !== null &&
    Number.isFinite(rawValue) &&
    Number.isFinite(averageValue) &&
    averageValue !== 0
  ) {
    const relativeDifference = (rawValue - averageValue) / Math.abs(averageValue);
    const directionAdjustedDifference =
      chartMetric.direction === "lower_is_better"
        ? -relativeDifference
        : relativeDifference;
    return normalizeScore(50 + directionAdjustedDifference * 100);
  }

  return rawValue === null ? null : normalizeForRadar(rawValue, chartMetric);
}

function resolveAverageRadarScore(
  score: number | null | undefined,
  rawValue: number | null
): number | null {
  const backendScore = normalizeScore(score);
  if (backendScore !== null) return backendScore;
  return rawValue === null ? null : 50;
}

function formatHeight(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value)} cm`;
}

function formatChartNumber(
  value: number | null | undefined,
  unit: string
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const precision = unit === "sn" ? 2 : unit === "adet" ? 0 : 1;
  return Number(value).toFixed(precision);
}

function chartAxisLabel(item: ChartDatum): string {
  if (!item.unit) return item.shortLabel;
  return `${item.shortLabel} (${item.unit})`;
}

function MvpAthleteReport({
  report,
  testDate,
  generatedAt,
  hideVerticalJump = false,
  youjiQrDataUrl,
  logoDataUrl,
}: {
  report: FrontendAthleteReport;
  testDate?: string;
  generatedAt: string;
  hideVerticalJump?: boolean;
  youjiQrDataUrl?: string;
  logoDataUrl?: string;
}) {
  const m = report.metrics;
  const measurements = normalizeSprintMeasurements(report.measurements || {});
  const passMetric = m.passCount ?? {
    value: measurements.passCount ?? null,
    percentile: null,
    score: null,
    target: null,
  };
  const height = measurements.height;
  const weight = measurements.weight;
  const vki = measurements.bmi ?? calcVki(height, weight);
  const sprint1 = valueOf(m.sprint1, measurements.sprint30m);
  const sprint2 = valueOf(m.sprint2, measurements.sprint30mSecond);
  const agility = valueOf(m.agility, measurements.agility);
  const flexibility = valueOf(m.flexibility, measurements.flexibility);
  const verticalJump = valueOf(m.verticalJump, measurements.verticalJump);
  const passCount = valueOf(passMetric, measurements.passCount);
  const handgrip = measurements.handgrip ?? null;
  const fatigue = valueOf(m.fatigueIndex);
  const averages = report.ageGroupAverages;
  const averageScores = report.ageGroupPercentiles;
  const includesPass = passCount !== null || averages?.passCount !== null;
  const radarData: RadarScoreDatum[] = [
    {
      label: "Esneklik",
      shortLabel: "Esneklik",
      athleteScore: resolveRadarScore(
        m.flexibility,
        flexibility,
        CHART_METRICS[1],
        averages?.flexibility ?? null
      ),
      averageScore: resolveAverageRadarScore(
        averageScores?.flexibility,
        averages?.flexibility ?? null
      ),
    },
    {
      label: "30m Koşu",
      shortLabel: "30m",
      athleteScore: resolveRadarScore(
        m.sprint1,
        sprint1,
        CHART_METRICS[2],
        averages?.sprint1 ?? null
      ),
      averageScore: resolveAverageRadarScore(
        averageScores?.sprint1,
        averages?.sprint1 ?? null
      ),
    },
    {
      label: "İkinci 30m",
      shortLabel: "2. 30m",
      athleteScore: resolveRadarScore(
        m.sprint2,
        sprint2,
        CHART_METRICS[3],
        averages?.sprint2 ?? null
      ),
      averageScore: resolveAverageRadarScore(
        averageScores?.sprint2,
        averages?.sprint2 ?? null
      ),
    },
    {
      label: "Çeviklik",
      shortLabel: "Çeviklik",
      athleteScore: resolveRadarScore(
        m.agility,
        agility,
        CHART_METRICS[4],
        averages?.agility ?? null
      ),
      averageScore: resolveAverageRadarScore(
        averageScores?.agility,
        averages?.agility ?? null
      ),
    },
    ...(!hideVerticalJump
      ? [{
          label: "Dikey Sıçrama",
          shortLabel: "Sıçrama",
          athleteScore: resolveRadarScore(
            m.verticalJump,
            verticalJump,
            CHART_METRICS[5],
            averages?.verticalJump ?? null
          ),
          averageScore: resolveAverageRadarScore(
            averageScores?.verticalJump,
            averages?.verticalJump ?? null
          ),
        }]
      : []),
    ...(includesPass
      ? [
          {
            label: "Pas",
            shortLabel: "Pas",
            athleteScore: resolveRadarScore(
              passMetric,
              passCount,
              CHART_METRICS[6],
              averages?.passCount ?? null
            ),
            averageScore: resolveAverageRadarScore(
              averageScores?.passCount,
              averages?.passCount ?? null
            ),
          },
        ]
      : []),
  ];

  const barData: ChartDatum[] = [
    {
      label: "VKI",
      shortLabel: "VKI",
      unit: "",
      athleteValue: m.bmi.value,
      averageValue: averages?.bmi ?? null,
      athletePlot: normalizeForRadar(m.bmi.value, CHART_METRICS[0]),
      averagePlot: normalizeForRadar(averages?.bmi ?? null, CHART_METRICS[0]),
    },
    {
      label: "Esneklik",
      shortLabel: "Esneklik",
      unit: "cm",
      athleteValue: flexibility,
      averageValue: averages?.flexibility ?? null,
      athletePlot: normalizeForRadar(flexibility, CHART_METRICS[1]),
      averagePlot: normalizeForRadar(averages?.flexibility ?? null, CHART_METRICS[1]),
    },
    {
      label: "30m Koşu",
      shortLabel: "30m",
      unit: "sn",
      athleteValue: sprint1,
      averageValue: averages?.sprint1 ?? null,
      athletePlot: normalizeForRadar(sprint1, CHART_METRICS[2]),
      averagePlot: normalizeForRadar(averages?.sprint1 ?? null, CHART_METRICS[2]),
    },
    {
      label: "İkinci 30m",
      shortLabel: "2. 30m",
      unit: "sn",
      athleteValue: sprint2,
      averageValue: averages?.sprint2 ?? null,
      athletePlot: normalizeForRadar(sprint2, CHART_METRICS[3]),
      averagePlot: normalizeForRadar(averages?.sprint2 ?? null, CHART_METRICS[3]),
    },
    {
      label: "Çeviklik",
      shortLabel: "Çeviklik",
      unit: "sn",
      athleteValue: agility,
      averageValue: averages?.agility ?? null,
      athletePlot: normalizeForRadar(agility, CHART_METRICS[4]),
      averagePlot: normalizeForRadar(averages?.agility ?? null, CHART_METRICS[4]),
    },
    ...(!hideVerticalJump
      ? [{
          label: "Dikey Sıçrama",
          shortLabel: "Sıçrama",
          unit: "cm",
          athleteValue: verticalJump,
          averageValue: averages?.verticalJump ?? null,
          athletePlot: normalizeForRadar(verticalJump, CHART_METRICS[5]),
          averagePlot: normalizeForRadar(
            averages?.verticalJump ?? null,
            CHART_METRICS[5]
          ),
        }]
      : []),
    ...(includesPass
      ? [
          {
            label: "Pas",
            shortLabel: "Pas",
            unit: "adet",
            athleteValue: passCount,
            averageValue: averages?.passCount ?? null,
            athletePlot: normalizeForRadar(passCount, CHART_METRICS[6]),
            averagePlot: normalizeForRadar(
              averages?.passCount ?? null,
              CHART_METRICS[6]
            ),
          },
        ]
      : []),
  ];

  const performanceRows = [
    { label: "30m Koşu", value: formatValue(sprint1, "sn"), icon: Timer },
    { label: "İkinci 30m", value: formatValue(sprint2, "sn"), icon: Timer },
    {
      label: "Yorgunluk Endeksi",
      value: formatValue(fatigue, "%"),
      icon: Activity,
    },
    { label: "Çeviklik", value: formatValue(agility, "sn"), icon: Zap },
    {
      label: "Esneklik",
      value: formatValue(flexibility, "cm"),
      icon: LineChart,
    },
    ...(!hideVerticalJump
      ? [{
          label: "Dikey Sıçrama",
          value: formatValue(verticalJump, "cm"),
          icon: ArrowUp10,
        }]
      : []),
    ...(includesPass
      ? [{ label: "Pas", value: formatPass(passCount), icon: Target }]
      : []),
    ...(handgrip !== null
      ? [{
          label: "Handgrip",
          value: `${formatValue(handgrip, "kg")}${
            measurements.handgripCategory
              ? ` (${measurements.handgripCategory})`
              : ""
          }`,
          icon: HandFist,
        }]
      : []),
  ];
  const availableRadarScores = radarData
    .map((item) => item.athleteScore)
    .filter((score): score is number => score !== null);
  const overallPercentile =
    report.overallPerformance > 0
      ? report.overallPerformance
      : availableRadarScores.length > 0
      ? availableRadarScores.reduce((sum, score) => sum + score, 0) /
        availableRadarScores.length
      : 0;

  return (
    <div style={styles.page}>
      <Header
        athleteName={report.fullName}
        birthYear={report.birthYear}
        testDate={testDate || generatedAt}
        logoDataUrl={logoDataUrl}
      />

      <main style={styles.main}>
        <section style={styles.leftColumn}>
          <Card title="Fiziksel Ölçümler" icon={<Ruler size={18} />}>
            <DataRow
              label="Boy"
              value={formatHeight(height)}
              icon={<Ruler size={16} />}
            />
            <DataRow
              label="Kilo"
              value={formatValue(weight, "kg")}
              icon={<Weight size={16} />}
            />
            <DataRow
              label="VKI"
              value={vkiLabel(vki)}
              icon={<Activity size={16} />}
            />
            <DataRow
              label="FFMI"
              value={formatValue(measurements.ffmi)}
              icon={<BicepsFlexed size={16} />}
            />
            <DataRow
              label="Yağ Oranı"
              value={formatValue(report.youjiSummary?.bodyFatPercent, "%")}
              icon={<HeartPulse size={16} />}
            />
            <DataRow
              label="Mineral"
              value={formatValue(report.youjiSummary?.mineralAmount, "kg")}
              icon={<Gem size={16} />}
            />
            <DataRow
              label="Protein"
              value={formatValue(report.youjiSummary?.proteinAmount, "kg")}
              icon={<Dna size={16} />}
              isLast
            />
          </Card>

          <Card title="Performans Testleri" icon={<Bolt size={18} />}>
            {performanceRows.map((row, index) => (
              <DataRow
                key={row.label}
                label={row.label}
                value={row.value}
                icon={<row.icon size={14} />}
                isLast={index === performanceRows.length - 1}
              />
            ))}
          </Card>

          <Card title="Genel Performans" icon={<Trophy size={18} />}>
            <div style={styles.overallBox}>
              %{overallPercentile.toFixed(1)}
            </div>
            <div style={styles.overallLabel}>Yüzdelik Dilim</div>
          </Card>
        </section>

        <section style={styles.middleColumn}>
          <Card title="Performans Skorları" icon={<LineChart size={18} />}>
            <RadarSvg data={radarData} />
          </Card>

          <Card title="Bilgilendirme" icon={<BadgeInfo size={18} />}>
            <InfoBlock
              sprint1={sprint1}
              sprint2={sprint2}
              agility={agility}
              fatigue={fatigue}
              flexibility={flexibility}
              verticalJump={verticalJump}
              hideVerticalJump={hideVerticalJump}
              passCount={passCount}
            />
          </Card>
        </section>

        <section style={styles.rightColumn}>
          <Card title="Yaş Grubu Karşılaştırması" icon={<BarChart3 size={18} />}>
            <BarSvg data={barData} />
          </Card>

          <YoujiDeviceCard report={report} qrDataUrl={youjiQrDataUrl} />
        </section>
      </main>
    </div>
  );
}

function YoujiDeviceCard({
  report,
  qrDataUrl,
}: {
  report: FrontendAthleteReport;
  qrDataUrl?: string;
}) {
  const summary = report.youjiSummary;

  return (
    <Card
      title="Sağlık Değerlendirme Verileri"
      icon={<Stethoscope size={18} />}
    >
      <div style={styles.youjiCardBody}>
        <div style={styles.youjiQrBox}>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Youji Health rapor QR" style={styles.youjiQr} />
          ) : (
            <div style={styles.youjiQrEmpty}>QR</div>
          )}
        </div>
        <div style={styles.youjiText}>
          Tüm cihaz detayları için QR kodu okutun.
        </div>
        <div style={styles.youjiMeta}>
          Ölçüm: {formatReportDate(summary?.measurementTime)}
        </div>
      </div>
    </Card>
  );
}

function Header({
  athleteName,
  birthYear,
  testDate,
  logoDataUrl,
}: {
  athleteName: string;
  birthYear: number;
  testDate: string;
  logoDataUrl?: string;
}) {
  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        {logoDataUrl ? (
          <img
            src={logoDataUrl}
            alt="Athletic Labs"
            style={styles.brandLogo}
          />
        ) : (
          <div style={styles.brandLogoFallback}>AL</div>
        )}
        <div>
          <div style={styles.brandName}>ATHLETIC LABS</div>
          <div style={styles.brandSub}>Sporcu Performans Analiz Sistemi</div>
        </div>
      </div>

      <div style={styles.titleArea}>
        <h1 style={styles.title}>SPORCU PERFORMANS KARNESİ</h1>
        <div style={styles.metaRow}>
          <span style={styles.metaItem}>
            <UserRound size={15} /> {athleteName}
          </span>
          <span style={styles.metaItem}>
            <CalendarDays size={15} /> Doğum Yılı: {birthYear}
          </span>
          <span style={styles.metaItem}>
            <CalendarDays size={15} /> Test Tarihi:{" "}
            {new Date(testDate).toLocaleDateString("tr-TR")}
          </span>
        </div>
      </div>
    </header>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        <span style={styles.cardIcon}>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function DataRow({
  label,
  value,
  icon,
  isLast,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  isLast?: boolean;
}) {
  return (
    <div style={{ ...styles.dataRow, ...(isLast ? styles.dataRowLast : {}) }}>
      <span style={styles.dataLabel}>
        <span style={styles.rowIcon}>{icon || <Activity size={14} />}</span>
        {label}:
      </span>
      <span style={styles.dataValue}>{value}</span>
    </div>
  );
}

function RadarSvg({
  data,
}: {
  data: RadarScoreDatum[];
}) {
  const cx = 190;
  const cy = 167;
  const maxR = 92;
  const points = data.map((item, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / data.length;
    const radius = ((item.athleteScore ?? 0) / 100) * maxR;
    const labelRadius = maxR + 24;
    return {
      ...item,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      lx: cx + Math.cos(angle) * labelRadius,
      ly: cy + Math.sin(angle) * labelRadius,
      ax: cx + Math.cos(angle) * maxR,
      ay: cy + Math.sin(angle) * maxR,
    };
  });
  const averagePoints = data.map((item, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / data.length;
    const radius = ((item.averageScore ?? 0) / 100) * maxR;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");
  const averagePolygon = averagePoints.map((p) => `${p.x},${p.y}`).join(" ");
  const hasAthletePolygon = data.every((item) => item.athleteScore !== null);
  const hasAveragePolygon = data.every((item) => item.averageScore !== null);
  const rings = [0.2, 0.4, 0.6, 0.8, 1].map((ratio) =>
    data
      .map((_, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / data.length;
        return `${cx + Math.cos(angle) * maxR * ratio},${
          cy + Math.sin(angle) * maxR * ratio
        }`;
      })
      .join(" ")
  );

  return (
    <svg width="370" height="330" viewBox="0 0 370 330" style={styles.radarSvg}>
      <rect x="0" y="0" width="370" height="330" rx="8" fill="#091310" />
      <g>
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={ring}
            fill="none"
            stroke="#2b3a35"
            strokeWidth="1"
          />
        ))}
        {points.map((point) => (
          <line
            key={point.label}
            x1={cx}
            y1={cy}
            x2={point.ax}
            y2={point.ay}
            stroke="#2b3a35"
            strokeWidth="1"
          />
        ))}
        {hasAveragePolygon && (
          <polygon
            points={averagePolygon}
            fill="rgba(184, 192, 188, 0.10)"
            stroke="#9ba6a0"
            strokeWidth="2.5"
          />
        )}
        {hasAthletePolygon && (
          <polygon
            points={polygon}
            fill="rgba(215, 243, 61, 0.22)"
            stroke="#d7f33d"
            strokeWidth="3.5"
          />
        )}
        {averagePoints.map(
          (point, index) =>
            data[index].averageScore !== null && (
              <circle
                key={`average-${data[index].label}`}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="#9ba6a0"
              />
            )
        )}
        {points.map(
          (point) =>
            point.athleteScore !== null && (
              <circle
                key={point.label}
                cx={point.x}
                cy={point.y}
                r="4.5"
                fill="#d7f33d"
              />
            )
        )}
        {points.map((point) => (
          <g key={`label-${point.label}`}>
            <text
              x={point.lx}
              y={point.ly - 5}
              fill="#e8efeb"
              fontSize="10.5"
              fontWeight="700"
              textAnchor={
                point.lx < cx - 10
                  ? "end"
                  : point.lx > cx + 10
                  ? "start"
                  : "middle"
              }
              dominantBaseline="middle"
            >
              {point.shortLabel}
            </text>
            <text
              x={point.lx}
              y={point.ly + 8}
              fill="#d7f33d"
              fontSize="9.5"
              fontWeight="800"
              textAnchor={
                point.lx < cx - 10
                  ? "end"
                  : point.lx > cx + 10
                  ? "start"
                  : "middle"
              }
              dominantBaseline="middle"
            >
              {point.athleteScore === null
                ? "-"
                : Math.round(point.athleteScore)}
            </text>
          </g>
        ))}
        {[20, 40, 60, 80, 100].map((score) => (
          <text
            key={score}
            x={cx + 5}
            y={cy - (score / 100) * maxR + 3}
            fill="#65736d"
            fontSize="7.5"
          >
            {score}
          </text>
        ))}
      </g>
      <Legend
        x={58}
        y={18}
        athleteColor="#d7f33d"
        averageColor="#9ba6a0"
        athleteLabel="Sporcu skoru"
        averageLabel="Yaş grubu skoru"
      />
      {!hasAveragePolygon && (
        <text
          x="185"
          y="38"
          fill="#9ba6a0"
          fontSize="8.5"
          textAnchor="middle"
        >
          Yaş grubu skoru için yeterli referans veri yok.
        </text>
      )}
      <text
        x="185"
        y="316"
        fill="#819089"
        fontSize="9"
        textAnchor="middle"
      >
        Tüm eksenlerde yüksek skor daha iyi performansı gösterir.
      </text>
    </svg>
  );
}

function BarSvg({
  data,
}: {
  data: ChartDatum[];
}) {
  const chartHeight = 205;
  const baseY = 240;
  const startX = 28;
  const groupWidth = 48;

  return (
    <svg
      width="370"
      height="330"
      viewBox="0 0 370 330"
      style={styles.comparisonSvg}
    >
      <rect x="0" y="0" width="370" height="330" rx="8" fill="#091310" />
      {[0.25, 0.5, 0.75, 1].map((tick) => {
        const y = baseY - tick * chartHeight;
        return (
          <line
            key={tick}
            x1="20"
            y1={y}
            x2="355"
            y2={y}
            stroke="#1d2d29"
          />
        );
      })}
      {data.map((item, index) => {
        const x = startX + index * groupWidth;
        const athleteHeight = (item.athletePlot / 100) * chartHeight;
        const averageHeight = (item.averagePlot / 100) * chartHeight;
        return (
          <g key={item.label}>
            <rect
              x={x}
              y={baseY - athleteHeight}
              width="17"
              height={athleteHeight}
              fill="#d7f33d"
              rx="4"
            />
            <rect
              x={x + 20}
              y={baseY - averageHeight}
              width="17"
              height={averageHeight}
              fill="#737d78"
              rx="4"
            />
            <text
              x={x + 8.5}
              y={baseY - athleteHeight - 6}
              fill="#d7f33d"
              fontSize="8"
              textAnchor="middle"
            >
              {formatChartNumber(item.athleteValue, item.unit)}
            </text>
            <text
              x={x + 28.5}
              y={baseY - averageHeight - 6}
              fill="#a0aba5"
              fontSize="8"
              textAnchor="middle"
            >
              {formatChartNumber(item.averageValue, item.unit)}
            </text>
            <text
              x={x + 18}
              y="274"
              fill="#bac5bf"
              fontSize="8.5"
              textAnchor="end"
              transform={`rotate(-22 ${x + 18} 272)`}
            >
              {chartAxisLabel(item)}
            </text>
          </g>
        );
      })}
      <Legend x={70} y={18} athleteColor="#d7f33d" averageColor="#737d78" />
    </svg>
  );
}

function Legend({
  x,
  y,
  athleteColor,
  averageColor,
  athleteLabel = "Sporcu",
  averageLabel = "Yaş Grubu Ortalaması",
}: {
  x: number;
  y: number;
  athleteColor: string;
  averageColor: string;
  athleteLabel?: string;
  averageLabel?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width="34" height="7" fill={athleteColor} />
      <text x={x + 42} y={y + 7} fill="#e9efe8" fontSize="10">
        {athleteLabel}
      </text>
      <rect x={x + 104} y={y} width="34" height="7" fill={averageColor} />
      <text x={x + 146} y={y + 7} fill="#e9efe8" fontSize="10">
        {averageLabel}
      </text>
    </g>
  );
}

function InfoBlock({
  sprint1,
  sprint2,
  agility,
  fatigue,
  flexibility,
  verticalJump,
  hideVerticalJump,
  passCount,
}: {
  sprint1: number | null;
  sprint2: number | null;
  agility: number | null;
  fatigue: number | null;
  flexibility: number | null;
  verticalJump: number | null;
  hideVerticalJump: boolean;
  passCount: number | null;
}) {
  const assessment = getFatigueAssessment(fatigue);

  return (
    <div style={styles.info}>
      <div style={styles.infoSummary}>
        <div>
          <div style={styles.infoEyebrow}>Yorgunluk Endeksi</div>
          <div style={{ ...styles.infoStatus, color: assessment.color }}>
            {assessment.label}
          </div>
        </div>
        <div style={styles.infoScore}>{formatValue(fatigue, "%")}</div>
      </div>
      <p style={styles.infoDescription}>{assessment.description}</p>
      <div style={styles.sprintComparison}>
        <span>1. koşu: {formatValue(sprint1, "sn")}</span>
        <span>2. koşu: {formatValue(sprint2, "sn")}</span>
      </div>
      <h4 style={styles.infoHeading}>4 Aylık Hedefler</h4>
      <div style={styles.targetGrid}>
        <TargetItem
          label="30m Koşu"
          value={formatValue(targetSprint(sprint1), "sn")}
        />
        <TargetItem
          label="Çeviklik"
          value={formatValue(targetAgility(agility), "sn")}
        />
        {!hideVerticalJump && (
          <TargetItem
            label="Dikey Sıçrama"
            value={formatValue(targetJump(verticalJump), "cm")}
          />
        )}
        <TargetItem
          label="Esneklik"
          value={formatValue(targetFlexibility(flexibility), "cm")}
        />
        {passCount !== null && (
          <TargetItem label="Pas" value={formatPass(targetPass(passCount))} />
        )}
      </div>
    </div>
  );
}

function TargetItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.targetItem}>
      <span style={styles.targetLabel}>{label}</span>
      <strong style={styles.targetValue}>{value}</strong>
    </div>
  );
}

function getFatigueAssessment(value: number | null): {
  label: string;
  description: string;
  color: string;
} {
  if (value === null) {
    return {
      label: "Veri yok",
      description: "Yorgunluk değerlendirmesi için iki sprint sonucu gereklidir.",
      color: "#b7c2bd",
    };
  }
  if (value <= 3) {
    return {
      label: "İyi tekrar performansı",
      description:
        "İki sprint arasındaki performans kaybı düşük. Sporcu hızını tekrar koşusunda büyük ölçüde koruyor.",
      color: "#63df89",
    };
  }
  if (value <= 5) {
    return {
      label: "Gelişime açık",
      description:
        "Tekrar sprintinde orta düzey performans kaybı var. Toparlanma ve tekrar hız kapasitesi geliştirilebilir.",
      color: "#f7d65b",
    };
  }
  return {
    label: "Yakından takip edilmeli",
    description:
      "Tekrar sprintinde belirgin performans kaybı görülüyor. Anaerobik dayanıklılık çalışmalarına öncelik verilebilir.",
    color: "#f06f61",
  };
}

function targetSprint(value: number | null): number | null {
  if (value === null) return null;
  const improvement = Math.max(0.05, Math.min(0.12, value * 0.011));
  return Number((value - improvement).toFixed(2));
}

function targetAgility(value: number | null): number | null {
  if (value === null) return null;
  const improvement = Math.max(0.18, Math.min(0.45, value * 0.025));
  return Number((value - improvement).toFixed(2));
}

function targetJump(value: number | null): number | null {
  if (value === null) return null;
  const improvement = Math.max(3, Math.min(7, value * 0.16));
  return Number((value + improvement).toFixed(1));
}

function targetFlexibility(value: number | null): number | null {
  if (value === null) return null;
  const improvement = value < 8 ? 2 : Math.max(1.5, Math.min(4, value * 0.18));
  return Number((value + improvement).toFixed(1));
}

function targetPass(value: number | null): number | null {
  if (value === null) return null;
  return Math.ceil(value * 1.15);
}

const styles: Record<string, CSSProperties> = {
  page: {
    width: REPORT_WIDTH,
    height: REPORT_HEIGHT,
    background: "#06110f",
    color: "#eef6ef",
    fontFamily:
      "\"Segoe UI\", Tahoma, Geneva, Verdana, sans-serif",
    overflow: "hidden",
    borderRadius: 16,
  },
  header: {
    height: 105,
    background: "#d7f33d",
    color: "#101910",
    display: "flex",
    alignItems: "center",
    padding: "0 38px",
    gap: 28,
  },
  brand: {
    width: 250,
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  brandLogo: {
    width: 70,
    height: 70,
    borderRadius: "50%",
    objectFit: "cover",
    display: "block",
    border: "2px solid rgba(16,25,16,0.28)",
    background: "#fff",
  },
  brandLogoFallback: {
    width: 70,
    height: 70,
    flexShrink: 0,
    borderRadius: "50%",
    border: "2px solid rgba(16,25,16,0.28)",
    background: "#ffffff",
    color: "#101910",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    fontWeight: 950,
  },
  brandName: {
    fontSize: 16,
    fontWeight: 900,
    letterSpacing: 0,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: 800,
    marginTop: 4,
    textTransform: "uppercase",
  },
  titleArea: {
    flex: 1,
  },
  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: "34px",
    fontWeight: 950,
    letterSpacing: 0,
    textAlign: "left",
  },
  metaRow: {
    display: "flex",
    gap: 28,
    marginTop: 11,
    alignItems: "center",
    fontSize: 16,
    fontWeight: 800,
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: 7,
  },
  main: {
    height: REPORT_HEIGHT - 105,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 24,
    padding: "30px 28px 28px",
    boxSizing: "border-box",
  },
  leftColumn: {
    display: "grid",
    gridTemplateRows: "365px 365px 188px",
    gap: 18,
  },
  middleColumn: {
    display: "grid",
    gridTemplateRows: "420px 516px",
    gap: 18,
  },
  rightColumn: {
    display: "grid",
    gridTemplateRows: "420px 516px",
    gap: 18,
  },
  card: {
    background: "#15201d",
    border: "1px solid #46544d",
    borderRadius: 12,
    padding: "18px 20px",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  cardTitle: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#d7f33d",
    fontSize: 16,
    fontWeight: 950,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  cardIcon: {
    display: "flex",
    color: "#d7f33d",
  },
  dataRow: {
    minHeight: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #344139",
    fontSize: 15,
    fontWeight: 800,
  },
  dataLabel: {
    color: "#d8e2dc",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  rowIcon: {
    color: "#b7c2bd",
    display: "flex",
  },
  dataValue: {
    color: "#d7f33d",
    fontWeight: 950,
    fontSize: 16,
  },
  dataRowLast: {
    borderBottom: "none",
  },
  overallBox: {
    color: "#d7f33d",
    fontSize: 64,
    lineHeight: "72px",
    fontWeight: 950,
    textAlign: "center",
    paddingTop: 2,
  },
  overallLabel: {
    color: "#eef6ef",
    textAlign: "center",
    fontSize: 15,
    fontWeight: 800,
  },
  radarSvg: {
    display: "block",
    width: "100%",
    height: 330,
    borderRadius: 8,
    background: "#06110f",
  },
  comparisonSvg: {
    display: "block",
    width: "100%",
    height: 330,
    borderRadius: 8,
    background: "#06110f",
  },
  info: {
    fontSize: 13,
    lineHeight: "17px",
    color: "#dbe4de",
  },
  infoSummary: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    padding: "14px 16px",
    border: "1px solid #34443d",
    borderRadius: 8,
    background: "#0d1815",
  },
  infoEyebrow: {
    color: "#aebbb4",
    fontSize: 10,
    lineHeight: "13px",
    fontWeight: 850,
    textTransform: "uppercase",
  },
  infoStatus: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: "20px",
    fontWeight: 950,
  },
  infoScore: {
    color: "#d7f33d",
    fontSize: 25,
    lineHeight: "29px",
    fontWeight: 950,
    whiteSpace: "nowrap",
  },
  infoDescription: {
    color: "#dbe4de",
    margin: "12px 2px 10px",
    fontSize: 12,
    lineHeight: "17px",
    fontWeight: 700,
  },
  sprintComparison: {
    display: "flex",
    gap: 10,
    marginBottom: 16,
    color: "#c5d0ca",
    fontSize: 11,
    lineHeight: "15px",
    fontWeight: 800,
  },
  infoHeading: {
    margin: "0 0 10px",
    color: "#d7f33d",
    fontSize: 13,
    textTransform: "uppercase",
    fontWeight: 950,
  },
  targetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 9,
  },
  targetItem: {
    minHeight: 55,
    padding: "9px 11px",
    borderRadius: 7,
    border: "1px solid #33433c",
    background: "#101b18",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    boxSizing: "border-box",
  },
  targetLabel: {
    color: "#aebbb4",
    fontSize: 10,
    lineHeight: "13px",
    fontWeight: 800,
  },
  targetValue: {
    color: "#eef6ef",
    marginTop: 3,
    fontSize: 13,
    lineHeight: "16px",
    fontWeight: 950,
  },
  youjiCardBody: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 52,
    textAlign: "center",
  },
  youjiQrBox: {
    width: 180,
    height: 180,
    borderRadius: 8,
    background: "#eef6ef",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  youjiQr: {
    width: 176,
    height: 176,
    display: "block",
  },
  youjiQrEmpty: {
    color: "#5f7168",
    fontWeight: 950,
    fontSize: 24,
  },
  youjiText: {
    color: "#eef6ef",
    fontSize: 16,
    lineHeight: "21px",
    fontWeight: 850,
    maxWidth: 280,
  },
  youjiMeta: {
    color: "#b7c2bd",
    fontSize: 13,
    lineHeight: "17px",
    fontWeight: 750,
    marginTop: 0,
  },
};
