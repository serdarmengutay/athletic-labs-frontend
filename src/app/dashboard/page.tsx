"use client";

import { useState, useEffect } from "react";
import {
  Users,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Square,
  RefreshCw,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import {
  AdvancedTestSession,
  TestSessionStatus,
  Athlete,
  Coach,
} from "@/types";
import { TEST_STATIONS } from "@/lib/testStations";

export default function Dashboard() {
  const [currentSession, setCurrentSession] =
    useState<AdvancedTestSession | null>(null);
  const [sessionStatuses, setSessionStatuses] = useState<TestSessionStatus[]>(
    []
  );
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data - gerçek uygulamada WebSocket veya polling ile güncellenecek
  useEffect(() => {
    const mockSession: AdvancedTestSession = {
      id: "session-1",
      club_id: "club-1",
      test_date: new Date().toISOString(),
      status: "active",
      notes: "Günlük test oturumu",
      stations: TEST_STATIONS,
      coaches: [
        {
          id: "coach-1",
          name: "Ahmet Yılmaz",
          email: "ahmet@example.com",
          role: "supervisor",
          assigned_stations: ["ffmi-station", "sprint-30m-station"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "coach-2",
          name: "Mehmet Kaya",
          email: "mehmet@example.com",
          role: "station_coach",
          assigned_stations: ["agility-station"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      athletes: [
        {
          id: "athlete-1",
          uuid: "ATH001",
          first_name: "Ali",
          last_name: "Veli",
          birth_date: "2000-01-01",
          height: 180,
          weight: 75,
          bmi: 23.1,
          club_id: "club-1",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "athlete-2",
          uuid: "ATH002",
          first_name: "Ayşe",
          last_name: "Demir",
          birth_date: "2001-05-15",
          height: 165,
          weight: 60,
          bmi: 22.0,
          club_id: "club-1",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      session_statuses: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setCurrentSession(mockSession);

    // Mock session statuses
    const mockStatuses: TestSessionStatus[] = [
      {
        id: "status-1",
        test_session_id: "session-1",
        athlete_id: "athlete-1",
        station_id: "ffmi-station",
        status: "completed",
        value: 25.5,
        coach_id: "coach-1",
        completed_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        notes: "İyi performans",
      },
      {
        id: "status-2",
        test_session_id: "session-1",
        athlete_id: "athlete-1",
        station_id: "sprint-30m-station",
        status: "in_progress",
        coach_id: "coach-1",
      },
      {
        id: "status-3",
        test_session_id: "session-1",
        athlete_id: "athlete-2",
        station_id: "ffmi-station",
        status: "completed",
        value: 22.8,
        coach_id: "coach-1",
        completed_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      },
    ];

    setSessionStatuses(mockStatuses);
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLastUpdate(new Date());
    setIsRefreshing(false);
  };

  const getAthleteProgress = (athleteId: string) => {
    const athleteStatuses = sessionStatuses.filter(
      (s) => s.athlete_id === athleteId
    );
    const completed = athleteStatuses.filter(
      (s) => s.status === "completed"
    ).length;
    const total = currentSession?.stations.length || 0;
    return {
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    };
  };

  const getStationProgress = (stationId: string) => {
    const stationStatuses = sessionStatuses.filter(
      (s) => s.station_id === stationId
    );
    const completed = stationStatuses.filter(
      (s) => s.status === "completed"
    ).length;
    const total = currentSession?.athletes.length || 0;
    return {
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!currentSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Test Takip Dashboard
              </h1>
              <p className="text-gray-600">
                {currentSession.club?.name} -{" "}
                {new Date(currentSession.test_date).toLocaleDateString("tr-TR")}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Son güncelleme: {lastUpdate.toLocaleTimeString("tr-TR")}
              </div>
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span>Yenile</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Genel İstatistikler */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sporcular</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentSession.athletes.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">İstasyonlar</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentSession.stations.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hocalar</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentSession.coaches.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tamamlanan</p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    sessionStatuses.filter((s) => s.status === "completed")
                      .length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-8">
          {/* Sporcu İlerlemesi */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Sporcu İlerlemesi
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {currentSession.athletes.map((athlete) => {
                  const progress = getAthleteProgress(athlete.id);
                  return (
                    <div key={athlete.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {athlete.first_name} {athlete.last_name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {athlete.uuid}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {progress.completed}/{progress.total}
                          </p>
                          <p className="text-xs text-gray-500">İstasyon</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        %{progress.percentage.toFixed(0)} tamamlandı
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* İstasyon Durumu */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                İstasyon Durumu
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {currentSession.stations.map((station) => {
                  const progress = getStationProgress(station.id);
                  return (
                    <div key={station.id} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">{station.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {station.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {station.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {progress.completed}/{progress.total}
                          </p>
                          <p className="text-xs text-gray-500">Sporcu</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        %{progress.percentage.toFixed(0)} tamamlandı
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Detaylı Test Durumu */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Detaylı Test Durumu
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sporcu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İstasyon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Değer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hoca
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zaman
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessionStatuses.map((status) => {
                  const athlete = currentSession.athletes.find(
                    (a) => a.id === status.athlete_id
                  );
                  const station = currentSession.stations.find(
                    (s) => s.id === status.station_id
                  );
                  const coach = currentSession.coaches.find(
                    (c) => c.id === status.coach_id
                  );

                  return (
                    <tr key={status.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {athlete?.first_name} {athlete?.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {athlete?.uuid}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{station?.icon}</span>
                          <span className="text-sm text-gray-900">
                            {station?.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            status.status
                          )}`}
                        >
                          {getStatusIcon(status.status)}
                          <span className="ml-1">
                            {status.status === "completed"
                              ? "Tamamlandı"
                              : status.status === "in_progress"
                              ? "Devam Ediyor"
                              : "Bekliyor"}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {status.value
                          ? `${status.value} ${station?.unit}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {coach?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {status.completed_at
                          ? new Date(status.completed_at).toLocaleTimeString(
                              "tr-TR"
                            )
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
