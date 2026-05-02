export interface ScoutingPlayer {
  athleteTestId: string;
  athleteId: string;
  fullName: string;
  birthYear: number;
  age: number;
  gender: "male" | "female" | string;
  clubName?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  height: number | null;
  weight: number | null;
  bmi: number | null;
  flexibility: number | null;
  sprint30m: number | null;
  sprint30mSecond: number | null;
  agility: number | null;
  verticalJump: number | null;
  ffmi?: number | null;
  passCount: number | null;
  fatigueIndex: number | null;
  sourceType?: "live" | "historical" | string;
  updatedAt: string | null;
}

export interface NumericRangeOption {
  min: number | null;
  max: number | null;
}

export interface ScoutingFilterOptions {
  birthYears: number[];
  genders: string[];
  clubs: string[];
  ranges: {
    height: NumericRangeOption;
    weight: NumericRangeOption;
    bmi: NumericRangeOption;
    sprint30m: NumericRangeOption;
    agility: NumericRangeOption;
    flexibility: NumericRangeOption;
    verticalJump: NumericRangeOption;
    passCount: NumericRangeOption;
  };
}

export interface ScoutingPagination {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions: number[];
}

export interface ScoutingListResponse {
  items: ScoutingPlayer[];
  pagination: ScoutingPagination;
  appliedFilters: Record<string, unknown>;
}

export interface ScoutingDetailMetric {
  key: string;
  label: string;
  unit: string;
  athleteValue: number | null;
  ageGroupAverage: number | null;
}

export interface ScoutingPlayerDetail {
  athleteTestId: string;
  athleteId: string;
  fullName: string;
  birthYear: number;
  age: number;
  gender: "male" | "female" | string;
  clubName?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  sourceType?: "live" | "historical" | string;
  updatedAt: string | null;
  metrics: {
    height: number | null;
    weight: number | null;
    bmi: number | null;
    flexibility: number | null;
    sprint30m: number | null;
    sprint30mSecond: number | null;
    agility: number | null;
    verticalJump: number | null;
    ffmi: number | null;
    passCount: number | null;
    fatigueIndex: number | null;
  };
  comparison: {
    groupSize: number;
    label: string;
    metrics: ScoutingDetailMetric[];
  };
}

export interface ScoutingFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  birthYears?: number[];
  gender?: string;
  clubName?: string;
  minHeight?: number;
  maxHeight?: number;
  minWeight?: number;
  maxWeight?: number;
  minBmi?: number;
  maxBmi?: number;
  minSprint30m?: number;
  maxSprint30m?: number;
  minAgility?: number;
  maxAgility?: number;
  minFlexibility?: number;
  maxFlexibility?: number;
  minVerticalJump?: number;
  maxVerticalJump?: number;
  minPassCount?: number;
  maxPassCount?: number;
  minFatigueIndex?: number;
  maxFatigueIndex?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}
