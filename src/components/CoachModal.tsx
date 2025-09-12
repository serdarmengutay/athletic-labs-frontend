"use client";

import { useState } from "react";
import { X, User, Mail, Shield, MapPin } from "lucide-react";
import { Coach, TestStation } from "@/types";
import { TEST_STATIONS } from "@/lib/testStations";

interface CoachModalProps {
  onClose: () => void;
  onSuccess: (coach: Coach) => void;
  coach?: Coach;
  stations?: TestStation[];
}

export default function CoachModal({
  onClose,
  onSuccess,
  coach,
  stations = TEST_STATIONS,
}: CoachModalProps) {
  const [formData, setFormData] = useState({
    name: coach?.name || "",
    email: coach?.email || "",
    role: coach?.role || "station_coach",
    assigned_stations: coach?.assigned_stations || [],
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // API çağrısı burada yapılacak
      const newCoach: Coach = {
        id: coach?.id || `coach-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        role: formData.role as "admin" | "station_coach" | "supervisor",
        assigned_stations: formData.assigned_stations,
        created_at: coach?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      onSuccess(newCoach);
    } catch (error) {
      console.error("Hoca eklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStationToggle = (stationId: string) => {
    setFormData((prev) => ({
      ...prev,
      assigned_stations: prev.assigned_stations.includes(stationId)
        ? prev.assigned_stations.filter((id) => id !== stationId)
        : [...prev.assigned_stations, stationId],
    }));
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4 text-red-500" />;
      case "supervisor":
        return <User className="h-4 w-4 text-blue-500" />;
      default:
        return <MapPin className="h-4 w-4 text-green-500" />;
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "Yönetici";
      case "supervisor":
        return "Saha Sorumlusu";
      default:
        return "İstasyon Hocası";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {coach ? "Hoca Düzenle" : "Yeni Hoca Ekle"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Temel Bilgiler */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Temel Bilgiler
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ad Soyad
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Hoca adı soyadı"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="hoca@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    role: e.target.value as
                      | "admin"
                      | "station_coach"
                      | "supervisor",
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="station_coach">İstasyon Hocası</option>
                <option value="supervisor">Saha Sorumlusu</option>
                <option value="admin">Yönetici</option>
              </select>
            </div>
          </div>

          {/* Atanan İstasyonlar */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Atanan İstasyonlar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stations.map((station) => (
                <div
                  key={station.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.assigned_stations.includes(station.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleStationToggle(station.id)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{station.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {station.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {station.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {station.required_coaches} hoca gerekli
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border-2 ${
                        formData.assigned_stations.includes(station.id)
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {formData.assigned_stations.includes(station.id) && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rol Önizleme */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Rol Önizleme</h4>
            <div className="flex items-center space-x-2">
              {getRoleIcon(formData.role)}
              <span className="text-sm text-gray-700">
                {getRoleText(formData.role)}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {formData.role === "admin" &&
                "Tüm istasyonları yönetebilir ve tüm işlemlere erişebilir"}
              {formData.role === "supervisor" &&
                "Saha genelini kontrol edebilir ve tüm istasyonları görebilir"}
              {formData.role === "station_coach" &&
                "Sadece atandığı istasyonlarda değer girebilir"}
            </p>
          </div>

          {/* Butonlar */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Kaydediliyor..." : coach ? "Güncelle" : "Ekle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
