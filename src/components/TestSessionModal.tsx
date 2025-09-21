"use client";

import React, { useState, useEffect } from "react";
import { Club, Athlete, TestSession } from "@/types";
import { clubApi, athleteApi, testApi } from "@/lib/api";

interface TestSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: TestSession) => void;
}

const TestSessionModal: React.FC<TestSessionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedClub, setSelectedClub] = useState<string>("");
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    test_date: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [loadingAthletes, setLoadingAthletes] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClubs();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedClub) {
      loadAthletes(selectedClub);
    } else {
      setAthletes([]);
      setSelectedAthletes([]);
    }
  }, [selectedClub]);

  const loadClubs = async () => {
    setLoadingClubs(true);
    try {
      const response = await clubApi.getAll();
      setClubs(response.data.data || []);
    } catch (error) {
      console.error("Kulüpler yüklenirken hata:", error);
    } finally {
      setLoadingClubs(false);
    }
  };

  const loadAthletes = async (clubId: string) => {
    setLoadingAthletes(true);
    try {
      const response = await athleteApi.getAll({ club_id: clubId });
      setAthletes(response.data.data || []);
    } catch (error) {
      console.error("Sporcular yüklenirken hata:", error);
    } finally {
      setLoadingAthletes(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClub || selectedAthletes.length === 0) return;

    setLoading(true);
    try {
      const response = await testApi.createSession({
        club_id: selectedClub,
        test_date: formData.test_date,
        notes: formData.notes,
      });

      onSuccess(response.data.data);
      onClose();
    } catch (error) {
      console.error("Test oturumu oluşturulurken hata:", error);
      alert("Test oturumu oluşturulurken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleAthleteSelect = (athleteId: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(athleteId)
        ? prev.filter((id) => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAthletes.length === athletes.length) {
      setSelectedAthletes([]);
    } else {
      setSelectedAthletes(athletes.map((athlete) => athlete.id));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Yeni Test Oturumu Oluştur</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Club Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kulüp Seçin
            </label>
            {loadingClubs ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">
                  Kulüpler yükleniyor...
                </span>
              </div>
            ) : (
              <select
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Kulüp seçin...</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name} - {club.city} ({club.athlete_count} sporcu)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Athletes Selection */}
          {selectedClub && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Sporcuları Seçin
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedAthletes.length === athletes.length
                    ? "Tümünü Kaldır"
                    : "Tümünü Seç"}
                </button>
              </div>

              {loadingAthletes ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-gray-600">
                    Sporcular yükleniyor...
                  </span>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {athletes.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      Bu kulüpte sporcu bulunamadı
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {athletes.map((athlete) => (
                        <label
                          key={athlete.id}
                          className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAthletes.includes(athlete.id)}
                            onChange={() => handleAthleteSelect(athlete.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">
                              {athlete.first_name} {athlete.last_name}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({athlete.birth_date})
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedAthletes.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {selectedAthletes.length} sporcu seçildi
                </p>
              )}
            </div>
          )}

          {/* Test Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Tarihi
            </label>
            <input
              type="date"
              value={formData.test_date}
              onChange={(e) =>
                setFormData({ ...formData, test_date: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notlar (Opsiyonel)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Test hakkında notlar..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={
                !selectedClub || selectedAthletes.length === 0 || loading
              }
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Oluşturuluyor..." : "Test Oturumu Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TestSessionModal;
