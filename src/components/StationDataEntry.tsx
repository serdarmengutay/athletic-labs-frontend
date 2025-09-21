"use client";

import React, { useState, useEffect } from "react";
import { TestStationData, TestField, Athlete } from "@/types";
import { stationApi } from "@/lib/api";

interface StationDataEntryProps {
  stationId: string;
  stationName: string;
  athlete: Athlete;
  onDataSubmit: (data: Record<string, number>) => void;
  onCancel: () => void;
}

const StationDataEntry: React.FC<StationDataEntryProps> = ({
  stationId,
  stationName,
  athlete,
  onDataSubmit,
  onCancel,
}) => {
  const [stationData, setStationData] = useState<TestStationData | null>(null);
  const [formData, setFormData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadStationData();
  }, [stationId]);

  const loadStationData = async () => {
    try {
      const response = await stationApi.getStationData(stationId);
      setStationData(response.data.data);

      // Form verilerini başlat
      const initialData: Record<string, number> = {};
      response.data.data.fields.forEach((field: TestField) => {
        initialData[field.id] = 0;
      });
      setFormData(initialData);
    } catch (error) {
      console.error("İstasyon verileri yüklenirken hata:", error);
    }
  };

  const handleInputChange = (fieldId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData((prev) => ({ ...prev, [fieldId]: numValue }));

    // Hata temizle
    if (errors[fieldId]) {
      setErrors((prev) => ({ ...prev, [fieldId]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!stationData) return false;

    stationData.fields.forEach((field: TestField) => {
      const value = formData[field.id];

      if (field.required && (!value || value === 0)) {
        newErrors[field.id] = `${field.name} alanı zorunludur`;
        return;
      }

      if (field.min !== undefined && value < field.min) {
        newErrors[field.id] = `${field.name} en az ${field.min} olmalıdır`;
        return;
      }

      if (field.max !== undefined && value > field.max) {
        newErrors[field.id] = `${field.name} en fazla ${field.max} olmalıdır`;
        return;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await stationApi.submitTest({
        athlete_id: athlete.id,
        station_id: stationId,
        values: formData,
        session_id: "", // Bu değer parent component'ten gelecek
        notes: "",
      });

      onDataSubmit(formData);
    } catch (error) {
      console.error("Veri gönderilirken hata:", error);
      alert("Veri gönderilirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  if (!stationData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">
          İstasyon verileri yükleniyor...
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {stationName} - Veri Girişi
        </h2>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Sporcu Bilgileri</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Ad Soyad:</span>
              <p>
                {athlete.first_name} {athlete.last_name}
              </p>
            </div>
            <div>
              <span className="font-medium">Doğum Tarihi:</span>
              <p>{athlete.birth_date}</p>
            </div>
            <div>
              <span className="font-medium">Kulüp:</span>
              <p>{athlete.club?.name || "Bilinmiyor"}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {stationData.fields.map((field: TestField) => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.name}
                {field.required && <span className="text-red-500 ml-1">*</span>}
                {field.unit && (
                  <span className="text-gray-500 ml-1">({field.unit})</span>
                )}
              </label>

              {field.type === "number" ? (
                <input
                  type="number"
                  value={formData[field.id] || ""}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  min={field.min}
                  max={field.max}
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors[field.id] ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder={`${
                    field.min !== undefined ? `Min: ${field.min}` : ""
                  } ${
                    field.max !== undefined ? `Max: ${field.max}` : ""
                  }`.trim()}
                />
              ) : field.type === "select" ? (
                <select
                  value={formData[field.id] || ""}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors[field.id] ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Seçin...</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData[field.id] || ""}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors[field.id] ? "border-red-500" : "border-gray-300"
                  }`}
                />
              )}

              {errors[field.id] && (
                <p className="mt-1 text-sm text-red-600">{errors[field.id]}</p>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StationDataEntry;
