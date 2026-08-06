import type { MeasurementKey } from "./sportTestConfig";

export interface ValdMetricDefinition {
  key: string;
  label: string;
  unit?: string;
  sourceTestType?: string;
  sourcePath?: string;
  reportSection?: string;
  manualField?: MeasurementKey;
}

export interface ValdSessionConfig {
  schemaVersion: number;
  disabledManualFields: MeasurementKey[];
  enabledMeasurementFields?: MeasurementKey[];
  expectedMetrics: ValdMetricDefinition[];
}

export const DEFAULT_VALD_SESSION_CONFIG: ValdSessionConfig = {
  schemaVersion: 1,
  disabledManualFields: ["verticalJump"],
  expectedMetrics: [],
};

const measurementKeys = new Set<MeasurementKey>([
  "height",
  "weight",
  "flexibility",
  "sprint30m",
  "sprint30mSecond",
  "agility",
  "verticalJump",
  "passCount",
  "handgrip",
]);

export function normalizeValdSessionConfig(
  value: unknown
): ValdSessionConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_VALD_SESSION_CONFIG };
  }

  const config = value as Partial<ValdSessionConfig>;
  return {
    schemaVersion:
      typeof config.schemaVersion === "number" ? config.schemaVersion : 1,
    disabledManualFields: Array.isArray(config.disabledManualFields)
      ? config.disabledManualFields.filter(
          (key): key is MeasurementKey =>
            typeof key === "string" && measurementKeys.has(key as MeasurementKey)
        )
      : [],
    // Alan listesi yoksa oturum eski sürümdür ve branşın tüm alanları açık sayılır.
    ...(Array.isArray(config.enabledMeasurementFields)
      ? {
          enabledMeasurementFields: config.enabledMeasurementFields.filter(
            (key): key is MeasurementKey =>
              typeof key === "string" && measurementKeys.has(key as MeasurementKey)
          ),
        }
      : {}),
    expectedMetrics: Array.isArray(config.expectedMetrics)
      ? config.expectedMetrics.filter(
          (metric): metric is ValdMetricDefinition =>
            Boolean(
              metric &&
                typeof metric === "object" &&
                typeof metric.key === "string" &&
                typeof metric.label === "string"
            )
        )
      : [],
  };
}
