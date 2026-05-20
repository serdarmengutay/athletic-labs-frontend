export type MeasurementKey =
  | "height"
  | "weight"
  | "flexibility"
  | "sprint30m"
  | "sprint30mSecond"
  | "agility"
  | "verticalJump"
  | "passCount";

export interface MeasurementFieldConfig {
  key: MeasurementKey;
  label: string;
  unit: string;
  step: string;
  required: boolean;
  placeholder: string;
}

export interface SportTestConfig {
  id: string;
  label: string;
  fields: MeasurementFieldConfig[];
}

const footballFields: MeasurementFieldConfig[] = [
  {
    key: "height",
    label: "Boy",
    unit: "cm",
    step: "0.1",
    required: true,
    placeholder: "Boy",
  },
  {
    key: "weight",
    label: "Kilo",
    unit: "kg",
    step: "0.1",
    required: true,
    placeholder: "Kilo",
  },
  {
    key: "flexibility",
    label: "Esneklik",
    unit: "cm",
    step: "0.1",
    required: true,
    placeholder: "Esneklik",
  },
  {
    key: "sprint30m",
    label: "30m Sprint 1",
    unit: "sn",
    step: "0.01",
    required: true,
    placeholder: "1. koşu",
  },
  {
    key: "sprint30mSecond",
    label: "30m Sprint 2",
    unit: "sn",
    step: "0.01",
    required: true,
    placeholder: "2. koşu",
  },
  {
    key: "agility",
    label: "Çeviklik",
    unit: "sn",
    step: "0.01",
    required: true,
    placeholder: "Çeviklik",
  },
  {
    key: "verticalJump",
    label: "Dikey Sıçrama",
    unit: "cm",
    step: "0.1",
    required: true,
    placeholder: "Dikey sıçrama",
  },
  {
    key: "passCount",
    label: "Pas",
    unit: "adet",
    step: "1",
    required: true,
    placeholder: "Pas adedi",
  },
];

export const SPORT_TEST_CONFIGS: SportTestConfig[] = [
  {
    id: "football",
    label: "Futbol",
    fields: footballFields,
  },
  {
    id: "volleyball_girls",
    label: "Kız Voleybol",
    fields: footballFields.filter((field) => field.key !== "passCount"),
  },
];

export function getSportTestConfig(sportType?: string | null): SportTestConfig {
  const normalized = (sportType || "").toLocaleLowerCase("tr").trim();

  if (normalized.includes("voley")) {
    return SPORT_TEST_CONFIGS.find((config) => config.id === "volleyball_girls")!;
  }

  return SPORT_TEST_CONFIGS.find((config) => config.id === "football")!;
}
