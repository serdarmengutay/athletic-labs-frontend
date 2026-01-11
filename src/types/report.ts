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
