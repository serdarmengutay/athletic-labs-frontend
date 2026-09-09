import type { CoachReportRow } from "@/components/CoachReport";

// Ortalamalar, biçimlendirilmiş metinden değil karnenin sayısal ölçümlerinden hesaplanır.
export interface CoachAverage {
  label: string;
  value: number | null;
  count: number;
  unit: string;
}

const UNITS: Record<string, string> = {
  "30m Koşu": "sn",
  "İkinci 30m": "sn",
  "Yorgunluk Endeksi": "%",
  Çeviklik: "sn",
  Esneklik: "cm",
  "Dikey Sıçrama": "cm",
  Pas: "adet / 30 sn",
  Handgrip: "kg",
  Boy: "cm",
  Kilo: "kg",
  VKI: "",
  FFMI: "",
  "Yağ Oranı": "%",
  Mineral: "kg",
  Protein: "kg",
};

// Eksik ve sonlu olmayan değerler paydaya girmez; sıfır ve negatif ölçümler korunur.
function average(
  label: string,
  values: (number | null | undefined)[],
  unit: string,
): CoachAverage {
  const available = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
  return {
    label,
    value: available.length
      ? available.reduce((sum, value) => sum + value, 0) / available.length
      : null,
    count: available.length,
    unit,
  };
}

export function calculateCoachReportAverages(rows: CoachReportRow[]) {
  const forKind = (kind: "performanceRows" | "physicalRows") => {
    const labels = [
      ...new Set(rows.flatMap((row) => row[kind].map((cell) => cell.label))),
    ];
    return labels.map((label) =>
      average(
        label,
        rows.map(
          (row) => row[kind].find((cell) => cell.label === label)?.rawValue,
        ),
        UNITS[label] ?? "",
      ),
    );
  };
  return {
    performance: forKind("performanceRows"),
    physical: forKind("physicalRows"),
    overall: average(
      "Genel Performans",
      rows.map((row) =>
        row.hasAnyMeasuredValue ? row.overallPercentile : null,
      ),
      "%",
    ),
  };
}

// Pas ortalaması kesirli olabilir; kategorik VKI/handgrip etiketleri ortalamaya taşınmaz.
export function formatCoachAverage(item: CoachAverage): string {
  if (item.value === null) return "-";
  return `${item.value.toFixed(item.unit === "sn" ? 2 : 1)}${item.unit ? ` ${item.unit}` : ""}`;
}
