export interface Club {
  id: string; // UUID formatında
  name: string;
  city: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  athlete_count: number;
  created_at: string;
  updated_at: string;
}

export interface Athlete {
  id: string; // UUID formatında
  athlete_code: string;
  first_name: string;
  last_name: string;
  birth_year: number;
  height: number;
  weight: number;
  bmi: number;
  ffmi?: number;
  club_id: string; // UUID formatında
  created_at: string;
  updated_at: string;
  club?: Club;
  testResults?: TestResult[];
  percentileResults?: PercentileResult[];
}

export interface TestSession {
  id: string; // UUID formatında
  club_id: string; // UUID formatında
  test_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  club?: Club;
  testResults?: TestResult[];
}

export interface TestResult {
  id: number;
  athlete_id: string; // UUID formatında
  test_session_id: string; // UUID formatında
  flexibility: number;
  sprint_30m_first: number;
  sprint_30m_second: number;
  fatigue_index: number;
  agility: number;
  vertical_jump: number;
  ffmi: number;
  created_at: string;
  updated_at: string;
  athlete?: Athlete;
  testSession?: TestSession;
  percentileResult?: PercentileResult;
}

// Test İstasyonları
export interface TestStation {
  id: string;
  name: string;
  type: "ffmi" | "sprint_30m" | "agility" | "vertical_jump" | "flexibility";
  description: string;
  required_coaches: number;
  unit: string;
  icon: string;
}

// Antrenör Rolleri
export interface Coach {
  id: string;
  name: string;
  email: string;
  role: "admin" | "station_coach" | "supervisor";
  assigned_stations: string[]; // TestStation id'leri
  created_at: string;
  updated_at: string;
}

// Test Oturumu Durumu
export interface TestSessionStatus {
  id: string;
  test_session_id: string;
  athlete_id: string;
  station_id: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  value?: number;
  coach_id?: string;
  completed_at?: string;
  notes?: string;
}

// Gelişmiş Test Oturumu
export interface AdvancedTestSession {
  id: string;
  club_id: string;
  test_date: string;
  notes?: string;
  status: "preparing" | "active" | "completed" | "cancelled";
  stations: TestStation[];
  coaches: Coach[];
  athletes: Athlete[];
  session_statuses: TestSessionStatus[];
  created_at: string;
  updated_at: string;
  club?: Club;
}

export interface PercentileResult {
  id: number;
  athlete_id: string; // UUID formatında
  test_result_id: number;
  height_percentile: number;
  weight_percentile: number;
  bmi_percentile: number;
  flexibility_percentile: number;
  sprint_30m_percentile: number;
  fatigue_index_percentile: number;
  agility_percentile: number;
  vertical_jump_percentile: number;
  overall_percentile: number;
  // Puanlar
  height_score: number;
  weight_score: number;
  bmi_score: number;
  flexibility_score: number;
  sprint_30m_score: number;
  fatigue_index_score: number;
  agility_score: number;
  vertical_jump_score: number;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

// Excel Import Types
export interface ExcelAthleteData {
  first_name: string;
  last_name: string;
  birth_date: string;
}

export interface ExcelImportResult {
  success: boolean;
  imported_count: number;
  errors: string[];
  athletes: Athlete[];
}

// QR Code Types
export interface QRCodeData {
  athlete_id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  club_name: string;
}

// Test Station Types
export interface TestStationData {
  id: string;
  name: string;
  type: "ffmi" | "sprint_30m" | "agility" | "vertical_jump" | "flexibility";
  description: string;
  required_coaches: number;
  unit: string;
  icon: string;
  fields: TestField[];
}

export interface TestField {
  id: string;
  name: string;
  type: "number" | "text" | "select";
  unit: string;
  required: boolean;
  min?: number;
  max?: number;
  options?: string[];
}

// Station Coach Interface
export interface StationCoach {
  id: string;
  name: string;
  station_id: string;
  station_name: string;
  is_active: boolean;
}
