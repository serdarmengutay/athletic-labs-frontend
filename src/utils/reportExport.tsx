import { toPng } from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  AthleteReportResponse,
  FrontendAthleteReport,
  MetricResult,
  SessionReportResponse,
} from "@/types/report";
import { createElement, type CSSProperties, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import AthleteReport from "@/components/AthleteReport";
import {
  Activity,
  ArrowUp10,
  BarChart3,
  Bolt,
  CalendarDays,
  Gauge,
  LineChart,
  Ruler,
  Target,
  Timer,
  Trophy,
  UserRound,
  Weight,
  Zap,
} from "lucide-react";

const REPORT_WIDTH = 1400;
const REPORT_HEIGHT = 1127;

type ExportableReport =
  | { kind: "legacy"; report: AthleteReportResponse }
  | {
      kind: "session";
      report: FrontendAthleteReport;
      clubName: string;
      testDate?: string;
      generatedAt: string;
    };

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50);
}

async function renderReportToImage(
  exportableReport: ExportableReport
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
    const reportElement =
      exportableReport.kind === "legacy"
        ? createElement(AthleteReport, { report: exportableReport.report })
        : createElement(MvpAthleteReport, {
            report: exportableReport.report,
            clubName: exportableReport.clubName,
            testDate: exportableReport.testDate,
            generatedAt: exportableReport.generatedAt,
          });

    await new Promise<void>((resolve) => {
      root.render(reportElement);
      setTimeout(resolve, 500);
    });

    const dataUrl = await toPng(container, {
      width: REPORT_WIDTH,
      height: REPORT_HEIGHT,
      cacheBust: true,
      pixelRatio: 2,
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

export async function exportReportsToZip(
  reports: AthleteReportResponse[] | SessionReportResponse,
  sessionName: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const exportableReports = normalizeReports(reports);

  for (let i = 0; i < exportableReports.length; i++) {
    const exportableReport = exportableReports[i];

    if (onProgress) {
      onProgress(i + 1, exportableReports.length);
    }

    try {
      const imageBlob = await renderReportToImage(exportableReport);
      const index = String(i + 1).padStart(3, "0");
      const fullName =
        exportableReport.kind === "legacy"
          ? exportableReport.report.athlete.fullName
          : exportableReport.report.fullName;
      const fileName = `${index}_${sanitizeFileName(fullName)}_karne.jpg`;

      zip.file(fileName, imageBlob);
    } catch (error) {
      const fullName =
        exportableReport.kind === "legacy"
          ? exportableReport.report.athlete.fullName
          : exportableReport.report.fullName;
      console.error(`Failed to export report for ${fullName}:`, error);
    }
  }

  if (Object.keys(zip.files).length === 0) {
    throw new Error("Hiçbir karne görseli oluşturulamadı.");
  }

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  saveAs(zipBlob, `${sanitizeFileName(sessionName)}_raporlar.zip`);
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

function calcVki(height?: number, weight?: number): number | null {
  if (!height || !weight) return null;
  return weight / Math.pow(height / 100, 2);
}

function vkiLabel(vki: number | null): string {
  if (vki === null) return "-";
  if (vki < 18.5) return `${formatValue(vki)} (Zayıf)`;
  if (vki < 25) return `${formatValue(vki)} (Normal)`;
  if (vki < 30) return `${formatValue(vki)} (Yüksek)`;
  return `${formatValue(vki)} (Çok yüksek)`;
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
    max: 300,
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

function MvpAthleteReport({
  report,
  clubName,
  testDate,
  generatedAt,
}: {
  report: FrontendAthleteReport;
  clubName: string;
  testDate?: string;
  generatedAt: string;
}) {
  const m = report.metrics;
  const measurements = report.measurements || {};
  const passMetric = m.passCount ?? {
    value: measurements.passCount ?? null,
    percentile: null,
    target: null,
  };
  const height = measurements.height;
  const weight = measurements.weight;
  const vki = calcVki(height, weight);
  const sprint1 = valueOf(m.sprint1, measurements.sprint30m);
  const sprint2 = valueOf(m.sprint2, measurements.sprint30mSecond);
  const agility = valueOf(m.agility, measurements.agility);
  const flexibility = valueOf(m.flexibility, measurements.flexibility);
  const verticalJump = valueOf(m.verticalJump, measurements.verticalJump);
  const passCount = valueOf(passMetric, measurements.passCount);
  const fatigue = valueOf(m.fatigueIndex);
  const averages = report.ageGroupAverages;
  const includesPass = passCount !== null || averages?.passCount !== null;
  const radarData: ChartDatum[] = [
    {
      label: "VKI",
      shortLabel: CHART_METRICS[0].shortLabel,
      unit: "",
      athleteValue: m.bmi.value,
      averageValue: averages?.bmi ?? null,
      athletePlot: normalizeForRadar(m.bmi.value, CHART_METRICS[0]),
      averagePlot: normalizeForRadar(averages?.bmi ?? null, CHART_METRICS[0]),
    },
    {
      label: "Esneklik",
      shortLabel: CHART_METRICS[1].shortLabel,
      unit: "cm",
      athleteValue: flexibility,
      averageValue: averages?.flexibility ?? null,
      athletePlot: normalizeForRadar(flexibility, CHART_METRICS[1]),
      averagePlot: normalizeForRadar(averages?.flexibility ?? null, CHART_METRICS[1]),
    },
    {
      label: "30m Koşu",
      shortLabel: CHART_METRICS[2].shortLabel,
      unit: "sn",
      athleteValue: sprint1,
      averageValue: averages?.sprint1 ?? null,
      athletePlot: normalizeForRadar(sprint1, CHART_METRICS[2]),
      averagePlot: normalizeForRadar(averages?.sprint1 ?? null, CHART_METRICS[2]),
    },
    {
      label: "İkinci 30m",
      shortLabel: CHART_METRICS[3].shortLabel,
      unit: "sn",
      athleteValue: sprint2,
      averageValue: averages?.sprint2 ?? null,
      athletePlot: normalizeForRadar(sprint2, CHART_METRICS[3]),
      averagePlot: normalizeForRadar(averages?.sprint2 ?? null, CHART_METRICS[3]),
    },
    {
      label: "Çeviklik",
      shortLabel: CHART_METRICS[4].shortLabel,
      unit: "sn",
      athleteValue: agility,
      averageValue: averages?.agility ?? null,
      athletePlot: normalizeForRadar(agility, CHART_METRICS[4]),
      averagePlot: normalizeForRadar(averages?.agility ?? null, CHART_METRICS[4]),
    },
    {
      label: "Dikey Sıçrama",
      shortLabel: CHART_METRICS[5].shortLabel,
      unit: "cm",
      athleteValue: verticalJump,
      averageValue: averages?.verticalJump ?? null,
      athletePlot: normalizeForRadar(verticalJump, CHART_METRICS[5]),
      averagePlot: normalizeForRadar(averages?.verticalJump ?? null, CHART_METRICS[5]),
    },
    ...(includesPass
      ? [
          {
            label: "Pas",
            shortLabel: CHART_METRICS[6].shortLabel,
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

  const barData: ChartDatum[] = radarData;

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
    {
      label: "Dikey Sıçrama",
      value: formatValue(verticalJump, "cm"),
      icon: ArrowUp10,
    },
    ...(includesPass
      ? [{ label: "Pas", value: formatPass(passCount), icon: Target }]
      : []),
  ];

  return (
    <div style={styles.page}>
      <Header
        athleteName={report.fullName}
        birthYear={report.birthYear}
        testDate={testDate || generatedAt}
      />

      <main style={styles.main}>
        <section style={styles.leftColumn}>
          <Card title="Fiziksel Ölçümler" icon={<Ruler size={18} />}>
            <DataRow
              label="Boy"
              value={formatValue(height, "cm")}
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
              %{report.overallPerformance.toFixed(1)}
            </div>
            <div style={styles.overallLabel}>Yüzdelik Dilim</div>
          </Card>
        </section>

        <section style={styles.middleColumn}>
          <Card title="Performans Radar Grafiği" icon={<LineChart size={18} />}>
            <RadarSvg data={radarData} />
          </Card>

          <Card title="Bilgilendirme" icon={<Gauge size={18} />}>
            <InfoBlock
              sprint1={sprint1}
              sprint2={sprint2}
              agility={agility}
              fatigue={fatigue}
              flexibility={flexibility}
              verticalJump={verticalJump}
              passCount={passCount}
            />
          </Card>
        </section>

        <section style={styles.rightColumn}>
          <Card title="Yaş Grubu Karşılaştırması" icon={<BarChart3 size={18} />}>
            <BarSvg data={barData} />
          </Card>

          <div style={styles.clubTag}>{clubName}</div>
        </section>
      </main>
    </div>
  );
}

function Header({
  athleteName,
  birthYear,
  testDate,
}: {
  athleteName: string;
  birthYear: number;
  testDate: string;
}) {
  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <div style={styles.brandLogo} />
        <div>
          <div style={styles.brandName}>ATHLETIC LABS</div>
          <div style={styles.brandSub}>Sporcu Performans Analiz Sistemi</div>
        </div>
      </div>

      <div style={styles.titleArea}>
        <h1 style={styles.title}>ATHLETIC LABS TEST VERİLERİ</h1>
        <div style={styles.metaRow}>
          <span style={styles.metaItem}>
            <UserRound size={15} /> {athleteName}
          </span>
          <span style={styles.metaItem}>
            <CalendarDays size={15} /> Doğum Tarihi: {birthYear}
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
  data: ChartDatum[];
}) {
  const cx = 190;
  const cy = 142;
  const maxR = 96;
  const points = data.map((item, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / data.length;
    const radius = (item.athletePlot / 100) * maxR;
    const labelRadius =
      item.shortLabel.length > 8 ? maxR + 24 : maxR + 28;
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
    const radius = (item.averagePlot / 100) * maxR;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");
  const averagePolygon = averagePoints.map((p) => `${p.x},${p.y}`).join(" ");
  const rings = [0.25, 0.5, 0.75, 1].map((ratio) =>
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
    <svg width="370" height="285" viewBox="0 0 370 285" style={styles.chartSvg}>
      <rect x="0" y="0" width="370" height="285" fill="#06110f" />
      <g>
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={ring}
            fill="none"
            stroke="#23312e"
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
            stroke="#20302c"
            strokeWidth="1"
          />
        ))}
        <polygon
          points={averagePolygon}
          fill="rgba(111, 111, 115, 0.18)"
          stroke="#6f6f73"
          strokeWidth="3"
        />
        <polygon
          points={polygon}
          fill="rgba(210, 239, 55, 0.24)"
          stroke="#d7f33d"
          strokeWidth="3"
        />
        {points.map((point) => (
          <circle key={point.label} cx={point.x} cy={point.y} r="4" fill="#d7f33d" />
        ))}
        {points.map((point) => (
          <text
            key={point.label}
            x={point.lx}
            y={point.ly}
            fill="#dfe8dd"
            fontSize="10"
            textAnchor={point.lx < cx - 10 ? "end" : point.lx > cx + 10 ? "start" : "middle"}
            dominantBaseline="middle"
          >
            {point.shortLabel}
          </text>
        ))}
      </g>
      <Legend x={76} y={18} athleteColor="#d7f33d" averageColor="#7c8580" />
    </svg>
  );
}

function BarSvg({
  data,
}: {
  data: ChartDatum[];
}) {
  const chartHeight = 205;
  const baseY = 230;
  const startX = 30;
  const groupWidth = 47;

  return (
    <svg width="370" height="285" viewBox="0 0 370 285" style={styles.chartSvg}>
      <rect x="0" y="0" width="370" height="285" fill="#06110f" />
      {[0.25, 0.5, 0.75, 1].map((tick, index) => {
        const y = baseY - tick * chartHeight;
        return <line key={index} x1="24" y1={y} x2="350" y2={y} stroke="#1d2d29" />;
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
              {formatValue(item.athleteValue, item.unit)}
            </text>
            <text
              x={x + 28.5}
              y={baseY - averageHeight - 6}
              fill="#a0aba5"
              fontSize="8"
              textAnchor="middle"
            >
              {formatValue(item.averageValue, item.unit)}
            </text>
            <text
              x={x + 18}
              y="259"
              fill="#bac5bf"
              fontSize="8.5"
              textAnchor="end"
              transform={`rotate(-22 ${x + 18} 257)`}
            >
              {item.shortLabel}
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
}: {
  x: number;
  y: number;
  athleteColor: string;
  averageColor: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width="34" height="7" fill={athleteColor} />
      <text x={x + 42} y={y + 7} fill="#e9efe8" fontSize="10">
        Sporcu
      </text>
      <rect x={x + 104} y={y} width="34" height="7" fill={averageColor} />
      <text x={x + 146} y={y + 7} fill="#e9efe8" fontSize="10">
        Yaş Grubu Ortalaması
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
  passCount,
}: {
  sprint1: number | null;
  sprint2: number | null;
  agility: number | null;
  fatigue: number | null;
  flexibility: number | null;
  verticalJump: number | null;
  passCount: number | null;
}) {
  return (
    <div style={styles.info}>
      <h4 style={styles.infoHeading}>Yorgunluk Endeksi</h4>
      <p style={styles.infoGood}>
        Düşük (%0-3): Sporcu tekrar sprintlerde yüksek formunu koruyabiliyor,
        toparlanma ve anaerobik kapasitesi güçlü.
      </p>
      <p style={styles.infoMid}>
        Orta (%3-5): Orta düzey toparlanma, dayanıklılık geliştirmeye açık alan var.
      </p>
      <p style={styles.infoBad}>
        Yüksek (%5+): Sporcunun tekrar sprintlerde hızlı yorulduğunu, anaerobik
        gücün çabuk düştüğünü gösterir.
      </p>
      <p style={styles.infoValue}>
        Bu sporcunun yorgunluk endeksi: {formatValue(fatigue, "%")} | 30m
        tekrarları: {formatValue(sprint1, "sn")} / {formatValue(sprint2, "sn")}
      </p>
      <h4 style={styles.infoHeading}>4 Aylık Hedefler</h4>
      <ul style={styles.targetList}>
        <li>30m koşu: {formatValue(targetSprint(sprint1), "sn")} hedefi</li>
        <li>Çeviklik: {formatValue(targetAgility(agility), "sn")} hedefi</li>
        <li>Dikey sıçrama: {formatValue(targetJump(verticalJump), "cm")} hedefi</li>
        <li>Esneklik: {formatValue(targetFlexibility(flexibility), "cm")} hedefi</li>
        <li>Pas: {formatPass(targetPass(passCount))} hedefi</li>
      </ul>
    </div>
  );
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
    border: "2px solid rgba(16,25,16,0.28)",
    background: "#fff",
    backgroundImage: "url('/athleticlabs_logo.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
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
    letterSpacing: 1.5,
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
    gridTemplateColumns: "410px 410px 410px",
    gap: 24,
    padding: "30px 28px 28px",
    boxSizing: "border-box",
  },
  leftColumn: {
    display: "grid",
    gridTemplateRows: "220px 360px 170px",
    gap: 18,
  },
  middleColumn: {
    display: "grid",
    gridTemplateRows: "350px 430px",
    gap: 18,
  },
  rightColumn: {
    display: "grid",
    gridTemplateRows: "535px 30px",
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
    minHeight: 43,
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
  chartSvg: {
    display: "block",
    width: "100%",
    height: "285px",
    borderRadius: 4,
    background: "#06110f",
  },
  info: {
    fontSize: 13,
    lineHeight: "17px",
    color: "#dbe4de",
  },
  infoHeading: {
    margin: "4px 0 10px",
    color: "#d7f33d",
    fontSize: 13,
    textTransform: "uppercase",
    fontWeight: 950,
  },
  infoGood: {
    color: "#63df89",
    margin: "0 0 9px",
    fontWeight: 700,
  },
  infoMid: {
    color: "#f7d65b",
    margin: "0 0 9px",
    fontWeight: 700,
  },
  infoBad: {
    color: "#f06f61",
    margin: "0 0 11px",
    fontWeight: 700,
  },
  infoValue: {
    color: "#eef6ef",
    margin: "0 0 11px",
    fontWeight: 800,
  },
  infoWarn: {
    color: "#f2a257",
    margin: "0 0 8px",
    fontWeight: 700,
  },
  targetList: {
    margin: 0,
    paddingLeft: 14,
    color: "#eef6ef",
    fontWeight: 700,
    lineHeight: "21px",
  },
  clubTag: {
    color: "#5f7168",
    fontSize: 11,
    fontWeight: 800,
    textAlign: "right",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
};
