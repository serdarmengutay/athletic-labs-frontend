import {
  getSportTestConfig,
  MeasurementFieldConfig,
  MeasurementKey,
} from "./sportTestConfig";
import {
  normalizeValdSessionConfig,
  ValdSessionConfig,
} from "./valdConfig";

// Oturum için açık alanları branş varsayılanlarıyla geriye uyumlu biçimde çözer.
export function getSessionMeasurementFields(
  sportType: string | null | undefined,
  configValue: unknown,
  valdEnabled = false
): MeasurementFieldConfig[] {
  const sportFields = getSportTestConfig(sportType).fields;
  const config = normalizeValdSessionConfig(configValue);
  const explicitlyEnabled = config.enabledMeasurementFields;
  const enabledSet = explicitlyEnabled
    ? new Set<MeasurementKey>(explicitlyEnabled)
    : new Set<MeasurementKey>(sportFields.map((field) => field.key));
  const disabledSet = new Set<MeasurementKey>(
    valdEnabled ? config.disabledManualFields : []
  );

  return sportFields.filter(
    (field) => enabledSet.has(field.key) && !disabledSet.has(field.key)
  );
}

// Yeni veya düzenlenen oturumlarda seçili alan listesini açıkça saklar.
export function buildSessionMeasurementConfig(
  enabledFields: MeasurementKey[],
  valdEnabled: boolean
): ValdSessionConfig {
  return {
    schemaVersion: 2,
    disabledManualFields: valdEnabled ? ["verticalJump"] : [],
    enabledMeasurementFields: enabledFields,
    expectedMetrics: [],
  };
}
