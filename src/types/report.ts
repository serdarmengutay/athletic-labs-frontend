// Athlete Performance Report Types

export interface AthleteReportResponse {
  athlete: {
    id: string;
    fullName: string;
    birthYear: number;
    age: number;
  };
  testSession: {
    id: string;
    testDate: string;
    clubName: string;
  };
  physicalMeasurements: {
    height: number; // cm
    weight: number; // kg
    ffmi: number;
    ffmiCategory: string; // e.g., "Normal", "Above Average", "Excellent"
  };
  performanceTests: {
    flexibility: number; // cm
    sprint30mFirst: number; // seconds
    sprint30mSecond: number; // seconds
    sprint30mBest: number; // seconds
    agility: number; // seconds
    verticalJump: number; // cm
  };
  radarChartData: {
    categories: string[]; // e.g., ["Sprint", "Agility", "Jump", "Flexibility"]
    athleteValues: number[]; // Normalized 0-100
    ageGroupAverage: number[]; // Normalized 0-100
  };
  barChartData: {
    label: string;
    athleteValue: number;
    ageGroupAverage: number;
    unit: string;
  }[];
  percentileRank: number; // 0-100, overall performance percentile
  fatigueIndex: {
    value: number; // percentage difference between sprint attempts
    interpretation: string; // e.g., "Low fatigue", "Moderate fatigue"
  };
  fourMonthTargets: {
    category: string;
    currentValue: number;
    targetValue: number;
    unit: string;
    recommendation: string;
  }[];
  insights: {
    ffmiExplanation: string;
    performanceSummary: string;
    strengths: string[];
    areasForImprovement: string[];
  };
}

export interface MetricResult {
  value: number | null;
  score?: number | null;
  percentile: number | null;
  target: number | null;
}

export interface FrontendAthleteReport {
  athleteId: string;
  fullName: string;
  birthYear: number;
  ageGroupAverages?: {
    sprint1: number | null;
    sprint2: number | null;
    agility: number | null;
    flexibility: number | null;
    verticalJump: number | null;
    passCount: number | null;
    bmi: number | null;
  };
  ageGroupPercentiles?: {
    sprint1: number | null;
    sprint2: number | null;
    agility: number | null;
    flexibility: number | null;
    verticalJump: number | null;
    passCount: number | null;
    bmi: number | null;
  };
  measurements?: {
    height?: number;
    weight?: number;
    bmi?: number;
    ffmi?: number;
    flexibility?: number;
    sprint30m?: number;
    sprint30mSecond?: number;
    agility?: number;
    verticalJump?: number;
    passCount?: number;
    handgrip?: number;
    handgripCategory?: "Ortalama" | "İyi" | "Çok İyi";
  };
  metrics: {
    sprint1: MetricResult;
    sprint2: MetricResult;
    agility: MetricResult;
    flexibility: MetricResult;
    verticalJump: MetricResult;
    passCount: MetricResult;
    bmi: MetricResult;
    fatigueIndex: MetricResult;
  };
  youjiSummary?: {
    deviceReportUrl: string;
    reportId: string;
    measurementTime?: string;
    bodyFatPercent?: number;
    mineralAmount?: number;
    proteinAmount?: number;
  };
  overallPerformance: number;
}

export interface SessionReportResponse {
  testSessionId: string;
  clubName: string;
  valdEnabled?: boolean;
  testDate?: string;
  reportGeneratedAt: string;
  athletes: FrontendAthleteReport[];
  warnings?: {
    athleteId: string;
    fullName: string;
    warning: string;
  }[];
}
