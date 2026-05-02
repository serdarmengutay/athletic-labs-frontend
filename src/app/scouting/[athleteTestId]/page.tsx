"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  CssBaseline,
  Paper,
  ThemeProvider,
  Typography,
} from "@mui/material";
import {
  Activity,
  Gauge,
  MoveUp,
  RefreshCcw,
  Ruler,
  TimerReset,
  Trophy,
  UserRound,
  Weight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { scoutingApi } from "@/lib/api";
import { ScoutingPlayerDetail } from "@/types/scouting";
import { ScoutingSidebar } from "@/components/scouting/ScoutingSidebar";
import { scoutingTheme } from "@/components/scouting/theme";

const RADAR_CONFIG: Array<{
  key: string;
  label: string;
  higherIsBetter: boolean;
  min: number;
  max: number;
}> = [
  { key: "bmi", label: "VKI", higherIsBetter: false, min: 10, max: 35 },
  { key: "flexibility", label: "Esneklik", higherIsBetter: true, min: 0, max: 35 },
  { key: "sprint_30m", label: "30m", higherIsBetter: false, min: 3, max: 9 },
  { key: "sprint_30m_second", label: "2. 30m", higherIsBetter: false, min: 3, max: 9 },
  { key: "agility", label: "Çeviklik", higherIsBetter: false, min: 10, max: 25 },
  { key: "vertical_jump", label: "Sıçrama", higherIsBetter: true, min: 0, max: 70 },
  { key: "ffmi", label: "FFMI", higherIsBetter: true, min: 8, max: 26 },
  { key: "pass_count", label: "Pas", higherIsBetter: true, min: 0, max: 40 },
];

const metricIconMap: Record<string, typeof Ruler> = {
  height: Ruler,
  weight: Weight,
  bmi: Gauge,
  flexibility: Activity,
  sprint_30m: MoveUp,
  sprint_30m_second: MoveUp,
  agility: RefreshCcw,
  vertical_jump: Trophy,
  ffmi: UserRound,
  pass_count: Activity,
  fatigue_index: TimerReset,
};

function getInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "AA";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[words.length - 1][0] ?? ""}`.toUpperCase();
}

function formatNumber(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

function getMetricDigits(label: string, unit: string): number {
  if (label.includes("30m") || label.includes("30 M") || label.includes("Çeviklik")) {
    return 2;
  }

  if (unit === "%") return 1;
  if (unit === "") return 1;
  return 1;
}

function formatMetricValue(value: number | null, unit: string, label = ""): string {
  if (value === null || Number.isNaN(value)) return "-";
  return `${formatNumber(value, getMetricDigits(label, unit))}${unit ? ` ${unit}` : ""}`;
}

function normalizeMetric(
  value: number | null,
  config: (typeof RADAR_CONFIG)[number],
): number {
  if (value === null || Number.isNaN(value)) return 0;
  const ratio = ((value - config.min) / (config.max - config.min)) * 100;
  const bounded = Math.max(0, Math.min(100, ratio));
  return Number((config.higherIsBetter ? bounded : 100 - bounded).toFixed(1));
}

function getFatigueDescriptor(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return {
      title: "Veri eksik",
      body: "Yorgunluk endeksi için yeterli sprint verisi bulunmuyor.",
      color: "#8c98a8",
    };
  }

  if (value <= 3) {
    return {
      title: "Düşük yorgunluk",
      body: "Tekrarlı sprintlerde performans kaybı kontrollü seyrediyor.",
      color: "#4ade80",
    };
  }

  if (value <= 5) {
    return {
      title: "Orta yorgunluk",
      body: "Performans düşüşü izlenmeli, tekrar sprint dayanıklılığı geliştirilebilir.",
      color: "#f59e0b",
    };
  }

  return {
    title: "Yüksek yorgunluk",
    body: "Tekrar sprintlerde düşüş belirgin. Toparlanma ve anaerobik dayanıklılık odağı faydalı olur.",
    color: "#fb7185",
  };
}

function DetailMetricCard({
  icon: Icon,
  label,
  value,
  unit,
  average,
}: {
  icon: typeof Ruler;
  label: string;
  value: number | null;
  unit: string;
  average: number | null;
}) {
  return (
    <Paper sx={{ p: 2, minHeight: 126 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.2 }}>
        <Avatar
          sx={{
            width: 34,
            height: 34,
            bgcolor: "rgba(74,222,128,0.10)",
            color: "#4ade80",
          }}
        >
          <Icon size={16} />
        </Avatar>
        <Typography sx={{ color: "#dce4ed", fontWeight: 700, fontSize: 14 }}>
          {label}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>
        {formatMetricValue(value, unit, label)}
      </Typography>
      <Typography sx={{ mt: 0.9, color: "#8c98a8", fontSize: 12.5 }}>
        Yaş grubu ort.: {formatMetricValue(average, unit, label)}
      </Typography>
    </Paper>
  );
}

export default function ScoutingDetailPage() {
  const params = useParams<{ athleteTestId: string }>();
  const athleteTestId = Array.isArray(params?.athleteTestId)
    ? params.athleteTestId[0]
    : params?.athleteTestId;

  const [detail, setDetail] = useState<ScoutingPlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteTestId) return;

    const loadDetail = async () => {
      try {
        setLoading(true);
        const response = await scoutingApi.getPlayerDetail(athleteTestId);
        setDetail(response.data.data);
      } catch (error) {
        console.error("Scouting sporcu detayı yüklenemedi:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [athleteTestId]);

  const radarData = useMemo(() => {
    if (!detail) return [];

    return RADAR_CONFIG.map((metric) => {
      const current = detail.comparison.metrics.find((item) => item.key === metric.key);
      return {
        metric: metric.label,
        athlete: normalizeMetric(current?.athleteValue ?? null, metric),
        ageGroup: normalizeMetric(current?.ageGroupAverage ?? null, metric),
      };
    });
  }, [detail]);

  const comparisonBarData = useMemo(() => {
    if (!detail) return [];

    return detail.comparison.metrics
      .filter((metric) =>
        [
          "sprint_30m",
          "sprint_30m_second",
          "agility",
          "vertical_jump",
          "ffmi",
          "pass_count",
        ].includes(metric.key),
      )
      .map((metric) => ({
        name: metric.label,
        Sporcu: metric.athleteValue,
        "Yaş Grubu": metric.ageGroupAverage,
      }));
  }, [detail]);

  const fatigueMeta = getFatigueDescriptor(detail?.metrics.fatigueIndex ?? null);

  const metricCards = useMemo(() => {
    if (!detail) return [];

    return detail.comparison.metrics.filter((metric) => metric.key !== "fatigue_index");
  }, [detail]);

  if (loading) {
    return (
      <ThemeProvider theme={scoutingTheme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: "100vh",
            background:
              "radial-gradient(circle at top left, rgba(74,222,128,0.10), transparent 22%), #0a0f14",
            color: "#f5f7fa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress color="primary" />
        </Box>
      </ThemeProvider>
    );
  }

  if (!detail) {
    return (
      <ThemeProvider theme={scoutingTheme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: "100vh",
            background:
              "radial-gradient(circle at top left, rgba(74,222,128,0.10), transparent 22%), #0a0f14",
            color: "#f5f7fa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography>Sporcu detayı bulunamadı.</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={scoutingTheme}>
      <CssBaseline />
      <Box
        sx={{
          height: "100vh",
          background:
            "radial-gradient(circle at top left, rgba(74,222,128,0.10), transparent 22%), #0a0f14",
          color: "#f5f7fa",
          display: "flex",
          overflow: "hidden",
        }}
      >
        <ScoutingSidebar activeKey="detail" />
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            height: "100vh",
            overflowY: "auto",
            p: { xs: 2, md: 3 },
            display: "grid",
            gap: 2.2,
          }}
        >
          <Paper sx={{ p: 2.5 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", xl: "1.4fr 1fr" },
                gap: 2.5,
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  sx={{
                    width: 84,
                    height: 84,
                    bgcolor: "#182430",
                    color: "#4ade80",
                    fontSize: 28,
                    fontWeight: 800,
                  }}
                >
                  {getInitials(detail.fullName)}
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: 34, fontWeight: 800, lineHeight: 1.05 }}>
                    {detail.fullName}
                  </Typography>
                  <Box sx={{ mt: 1.2, display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      label={detail.sourceType === "historical" ? "Historical Veri" : "Aktif Sporcu"}
                      size="small"
                      sx={{ bgcolor: "rgba(74,222,128,0.12)", color: "#4ade80" }}
                    />
                    <Chip
                      label={`${detail.countryName || "Türkiye"} - ${detail.clubName || "Kulüp bilgisi yok"}`}
                      size="small"
                      sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#dce4ed" }}
                    />
                    <Chip
                      label="Mevki"
                      size="small"
                      sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#dce4ed" }}
                    />
                  </Box>
                  <Box sx={{ mt: 1.4, display: "flex", gap: 2.2, flexWrap: "wrap", color: "#8c98a8" }}>
                    <Typography sx={{ fontSize: 14 }}>Doğum Tarihi: {detail.birthYear}</Typography>
                    <Typography sx={{ fontSize: 14 }}>Kıyaslama: {detail.comparison.label}</Typography>
                    <Typography sx={{ fontSize: 14 }}>Grup Büyüklüğü: {detail.comparison.groupSize}</Typography>
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 1.5,
                }}
              >
                <Paper sx={{ p: 1.75, bgcolor: "rgba(255,255,255,0.02)" }}>
                  <Typography sx={{ color: "#8c98a8", fontSize: 12.5 }}>Rapor Tarihi</Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 18, fontWeight: 700 }}>
                    {detail.updatedAt ? new Date(detail.updatedAt).toLocaleDateString("tr-TR") : "-"}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 1.75, bgcolor: "rgba(255,255,255,0.02)" }}>
                  <Typography sx={{ color: "#8c98a8", fontSize: 12.5 }}>Cinsiyet</Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 18, fontWeight: 700 }}>
                    {detail.gender === "female" ? "Kadın" : "Erkek"}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 1.75, bgcolor: "rgba(255,255,255,0.02)" }}>
                  <Typography sx={{ color: "#8c98a8", fontSize: 12.5 }}>Uyruk</Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 18, fontWeight: 700 }}>
                    {detail.countryName || "Türkiye"}
                  </Typography>
                </Paper>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 2.2 }}>
            <Typography sx={{ fontSize: 26, fontWeight: 800, mb: 1.8 }}>
              Performans Değerleri
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                  xl: "repeat(5, minmax(0, 1fr))",
                },
                gap: 1.6,
              }}
            >
              {metricCards.map((metric) => (
                <DetailMetricCard
                  key={metric.key}
                  icon={metricIconMap[metric.key] || Activity}
                  label={metric.label}
                  value={metric.athleteValue}
                  unit={metric.unit}
                  average={metric.ageGroupAverage}
                />
              ))}
            </Box>
          </Paper>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", xl: "2fr 1fr" },
              gap: 2,
            }}
          >
            <Paper sx={{ p: 2.2 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 800, mb: 1.6 }}>
                Yaş Grubu Ortalamasına Kıyas
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                  gap: 1.5,
                }}
              >
                <Paper sx={{ p: 1.5, bgcolor: "rgba(255,255,255,0.02)" }}>
                  <Typography sx={{ mb: 1.2, fontWeight: 700 }}>Radar Grafik</Typography>
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.10)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "#c7d0da", fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#617080", fontSize: 10 }} />
                      <Radar name="Sporcu" dataKey="athlete" stroke="#4ade80" fill="#4ade80" fillOpacity={0.28} strokeWidth={2} />
                      <Radar name="Yaş Grubu" dataKey="ageGroup" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.12} strokeWidth={2} />
                      <Legend wrapperStyle={{ color: "#c7d0da", paddingTop: 14 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </Paper>

                <Paper sx={{ p: 1.5, bgcolor: "rgba(255,255,255,0.02)" }}>
                  <Typography sx={{ mb: 1.2, fontWeight: 700 }}>Bar Grafik</Typography>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={comparisonBarData} barGap={10}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="name" tick={{ fill: "#c7d0da", fontSize: 11 }} angle={-12} textAnchor="end" height={72} />
                      <YAxis tick={{ fill: "#8c98a8", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f151c",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12,
                          color: "#f5f7fa",
                        }}
                      />
                      <Legend wrapperStyle={{ color: "#c7d0da", paddingTop: 12 }} />
                      <Bar dataKey="Sporcu" radius={[6, 6, 0, 0]}>
                        {comparisonBarData.map((entry) => (
                          <Cell key={`${entry.name}-athlete`} fill="#4ade80" />
                        ))}
                      </Bar>
                      <Bar dataKey="Yaş Grubu" radius={[6, 6, 0, 0]}>
                        {comparisonBarData.map((entry) => (
                          <Cell key={`${entry.name}-group`} fill="#94a3b8" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Box>
            </Paper>

            <Box sx={{ display: "grid", gap: 2 }}>
              <Paper sx={{ p: 2.2 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 800, mb: 1.4 }}>
                  Yorgunluk Endeksi
                </Typography>
                <Typography sx={{ fontSize: 42, fontWeight: 800, color: fatigueMeta.color }}>
                  {detail.metrics.fatigueIndex !== null
                    ? `%${formatNumber(detail.metrics.fatigueIndex, 1)}`
                    : "-"}
                </Typography>
                <Typography sx={{ mt: 1.1, color: fatigueMeta.color, fontWeight: 700 }}>
                  {fatigueMeta.title}
                </Typography>
                <Typography sx={{ mt: 1, color: "#8c98a8", lineHeight: 1.7, fontSize: 14 }}>
                  {fatigueMeta.body}
                </Typography>
                <Typography sx={{ mt: 1.4, color: "#c7d0da", fontSize: 13 }}>
                  Sprint tekrarları: {formatMetricValue(detail.metrics.sprint30m, "sn", "30m")} /{" "}
                  {formatMetricValue(detail.metrics.sprint30mSecond, "sn", "İkinci 30 Metre")}
                </Typography>
              </Paper>

              <Paper sx={{ p: 2.2 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 800, mb: 1.4 }}>
                  Kısa Özet
                </Typography>
                <Box sx={{ display: "grid", gap: 1.2 }}>
                  <Typography sx={{ color: "#dce4ed", fontSize: 14 }}>
                    Bu sporcu {detail.comparison.groupSize} kişilik {detail.comparison.label.toLowerCase()} havuzuyla kıyaslanıyor.
                  </Typography>
                  <Typography sx={{ color: "#dce4ed", fontSize: 14 }}>
                    Ham performans kartlarında sporcunun değeri ve yaş grubu ortalaması birlikte gösteriliyor.
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
