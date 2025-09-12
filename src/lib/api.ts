import axios from "axios";

const API_BASE_URL = "http://localhost:5017/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 saniye timeout
});

// Request interceptor - istek gönderilmeden önce
api.interceptors.request.use(
  (config) => {
    // Auth token'ı ekle
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(`API İsteği: ${config.method?.toUpperCase()} ${config.url}`);
    console.log("İstek verisi:", config.data);
    return config;
  },
  (error) => {
    console.error("İstek interceptor hatası:", error);
    return Promise.reject(error);
  }
);

// Response interceptor - yanıt alındıktan sonra
api.interceptors.response.use(
  (response) => {
    console.log(`API Yanıtı: ${response.status} ${response.config.url}`);
    console.log("Yanıt verisi:", response.data);
    return response;
  },
  (error) => {
    console.error("API Hatası:", error);

    // 401 Unauthorized - token geçersiz
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("coachData");
      window.location.href = "/login";
    }

    if (error.code === "ECONNREFUSED") {
      console.error("Backend'e bağlanılamıyor. Backend çalışıyor mu?");
    }
    return Promise.reject(error);
  }
);

// Club API
export const clubApi = {
  getAll: () => api.get("/clubs"),
  getById: (id: string) => api.get(`/clubs/${id}`),
  create: (data: { name: string; city: string }) => api.post("/clubs", data),
  update: (id: string, data: { name: string; city: string }) =>
    api.put(`/clubs/${id}`, data),
  delete: (id: string) => api.delete(`/clubs/${id}`),
};

// Athlete API
export const athleteApi = {
  getAll: (params?: { club_id?: string; age_group?: number }) =>
    api.get("/athletes", { params }),
  getById: (id: string) => api.get(`/athletes/${id}`),
  getByCode: (code: string) => api.get(`/athletes/code/${code}`),
  create: (data: {
    first_name: string;
    last_name: string;
    birth_date: string;
    height: number;
    weight: number;
    club_id: string; // UUID formatında
  }) => api.post("/athletes", data),
  update: (
    id: string,
    data: {
      first_name: string;
      last_name: string;
      birth_date: string;
      height: number;
      weight: number;
      club_id: string; // UUID formatında
    }
  ) => api.put(`/athletes/${id}`, data),
  delete: (id: string) => api.delete(`/athletes/${id}`),
};

// Test API
export const testApi = {
  createSession: (data: {
    club_id: string; // UUID formatında
    test_date: string;
    notes?: string;
  }) => api.post("/tests/sessions", data),
  addResult: (data: {
    athlete_id: string; // UUID formatında
    test_session_id: string; // UUID formatında
    flexibility: number;
    sprint_30m_first: number;
    sprint_30m_second: number;
    agility: number;
    vertical_jump: number;
    ffmi: number;
  }) => api.post("/tests/results", data),
  getAllSessions: () => api.get("/tests/sessions"),
  getAthleteHistory: (athleteId: string) =>
    api.get(`/tests/athlete/${athleteId}/history`),
  getClubSessions: (
    clubId: string // UUID formatında
  ) => api.get(`/tests/club/${clubId}/sessions`),
};

// Coach API
export const coachApi = {
  getAll: () => api.get("/coaches"),
  getById: (id: string) => api.get(`/coaches/${id}`),
  create: (data: {
    name: string;
    email: string;
    role: "admin" | "station_coach" | "supervisor";
    assigned_stations: string[];
  }) => api.post("/coaches", data),
  update: (
    id: string,
    data: {
      name: string;
      email: string;
      role: "admin" | "station_coach" | "supervisor";
      assigned_stations: string[];
    }
  ) => api.put(`/coaches/${id}`, data),
  delete: (id: string) => api.delete(`/coaches/${id}`),
  getByStation: (stationId: string) => api.get(`/coaches/station/${stationId}`),
};

// Test Session Management API
export const sessionApi = {
  createAdvancedSession: (data: {
    club_id: string;
    test_date: string;
    notes?: string;
    athletes: string[];
    coaches: string[];
  }) => api.post("/sessions/advanced", data),
  getSessionStatus: (sessionId: string) =>
    api.get(`/sessions/${sessionId}/status`),
  updateSessionStatus: (
    sessionId: string,
    data: {
      athlete_id: string;
      station_id: string;
      status: "pending" | "in_progress" | "completed" | "skipped";
      value?: number;
      coach_id?: string;
      notes?: string;
    }
  ) => api.post(`/sessions/${sessionId}/status`, data),
  getSessionDashboard: (sessionId: string) =>
    api.get(`/sessions/${sessionId}/dashboard`),
  completeSession: (sessionId: string) =>
    api.post(`/sessions/${sessionId}/complete`),
  cancelSession: (sessionId: string) =>
    api.post(`/sessions/${sessionId}/cancel`),
};

// QR Code API
export const qrApi = {
  generateAthleteQR: (athleteId: string, sessionId: string) =>
    api.post("/qr/generate", { athlete_id: athleteId, session_id: sessionId }),
  validateQR: (qrData: string) => api.post("/qr/validate", { qrData }),
  bulkGenerate: (sessionId: string, athleteIds: string[]) =>
    api.post("/qr/bulk-generate", {
      session_id: sessionId,
      athlete_ids: athleteIds,
    }),
};

// Authentication API
export const authApi = {
  coachLogin: (email: string, password: string) =>
    api.post("/auth/coach/login", { email, password }),
  coachRegister: (data: {
    name: string;
    email: string;
    password: string;
    role: "admin" | "station_coach" | "supervisor";
    assigned_stations: string[];
  }) => api.post("/auth/coach/register", data),
  getProfile: () => api.get("/auth/coach/profile"),
  logout: () => api.post("/auth/coach/logout"),
};

// Station API
export const stationApi = {
  submitTest: (data: {
    athlete_id: string;
    station_id: string;
    value: number;
    session_id: string;
    notes?: string;
  }) => api.post("/station/test", data),
  getQueue: (stationId: string, sessionId: string) =>
    api.get(`/station/queue?station_id=${stationId}&session_id=${sessionId}`),
  addToQueue: (data: {
    athlete_id: string;
    station_id: string;
    session_id: string;
  }) => api.post("/station/queue", data),
  getSessionStatus: (sessionId: string) =>
    api.get(`/station/sessions/${sessionId}/status`),
};

export default api;
