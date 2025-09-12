"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { testApi } from "@/lib/api";
import { Club, Athlete } from "@/types";

interface TestModalProps {
  clubs: Club[];
  athletes: Athlete[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function TestModal({
  clubs,
  athletes,
  onClose,
  onSuccess,
}: TestModalProps) {
  const [step, setStep] = useState(1);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [testSessionId, setTestSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    test_date: new Date().toISOString().split("T")[0],
    notes: "",
    flexibility: "",
    sprint_30m_first: "",
    sprint_30m_second: "",
    agility: "",
    vertical_jump: "",
    ffmi: "",
  });

  const selectedClub = clubs.find((c: Club) => c.id === selectedClubId);
  const filteredAthletes = selectedClub
    ? athletes.filter((athlete) => athlete.club_id === selectedClub.id)
    : [];

  console.log("Debug - selectedClubId:", selectedClubId);
  console.log("Debug - selectedClub:", selectedClub);
  console.log("Debug - filteredAthletes:", filteredAthletes);
  console.log("Debug - selectedAthlete:", selectedAthlete);

  const handleCreateSession = async () => {
    console.log("handleCreateSession called");
    console.log("selectedClubId:", selectedClubId);
    console.log("selectedClub:", selectedClub);
    console.log("formData:", formData);

    if (!selectedClubId || !selectedClub) {
      console.log(
        "Validation failed - selectedClubId or selectedClub is missing"
      );
      return;
    }

    setLoading(true);
    try {
      console.log("Sending request to create session...");
      const response = await testApi.createSession({
        club_id: selectedClubId, // number olarak gönder
        test_date: formData.test_date,
        notes: formData.notes,
      });
      console.log("Session created successfully:", response);
      setTestSessionId(response.data.data.id);
      setSelectedAthlete(null); // Step 2'ye geçerken sporcu seçimini sıfırla
      setStep(2);
    } catch (error) {
      console.error("Test oturumu oluşturulurken hata:", error);
      alert("Test oturumu oluşturulurken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthlete || !testSessionId) return;

    setLoading(true);
    try {
      await testApi.addResult({
        athlete_id: selectedAthlete.id,
        test_session_id: testSessionId.toString(),
        flexibility: parseFloat(formData.flexibility),
        sprint_30m_first: parseFloat(formData.sprint_30m_first),
        sprint_30m_second: parseFloat(formData.sprint_30m_second),
        agility: parseFloat(formData.agility),
        vertical_jump: parseFloat(formData.vertical_jump),
        ffmi: parseFloat(formData.ffmi),
      });
      onSuccess();
    } catch (error) {
      console.error("Test sonucu eklenirken hata:", error);
      alert("Test sonucu eklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            {step === 1 ? "Test Oturumu Oluştur" : "Test Sonucu Ekle"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Kulüp Seçin
              </label>
              <select
                required
                value={selectedClubId || ""}
                onChange={(e) => {
                  setSelectedClubId(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
              >
                <option value="">Kulüp seçin</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name} - {club.city}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-sm text-gray-300">
                Seçilen kulüp:{" "}
                {selectedClub
                  ? `${selectedClub.name} - ${selectedClub.city}`
                  : "Hiçbiri"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Test Tarihi
              </label>
              <input
                type="date"
                required
                value={formData.test_date}
                onChange={(e) =>
                  setFormData({ ...formData, test_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Notlar (Opsiyonel)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                rows={3}
                placeholder="Test hakkında notlar..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500"
              >
                İptal
              </button>
              <button
                onClick={handleCreateSession}
                disabled={!selectedClubId || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Oluşturuluyor..." : "Devam Et"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitTest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Sporcu Seçin
              </label>
              <select
                required
                value={selectedAthlete?.id || ""}
                onChange={(e) => {
                  console.log("Athlete selection changed:", e.target.value);
                  const athleteId = e.target.value;
                  const athlete = filteredAthletes.find(
                    (a) => a.id === athleteId
                  );
                  console.log("Found athlete:", athlete);
                  setSelectedAthlete(athlete || null);
                }}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
              >
                <option value="">Sporcu seçin</option>
                {filteredAthletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.uuid} - {athlete.first_name} {athlete.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Esneklik (cm)
                </label>
                <input
                  type="number"
                  required
                  step="0.1"
                  value={formData.flexibility}
                  onChange={(e) =>
                    setFormData({ ...formData, flexibility: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                  placeholder="7"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  İlk 30m Koşu (sn)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.sprint_30m_first}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sprint_30m_first: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                  placeholder="4.98"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  İkinci 30m Koşu (sn)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.sprint_30m_second}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sprint_30m_second: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                  placeholder="5.12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Çeviklik (sn)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.agility}
                  onChange={(e) =>
                    setFormData({ ...formData, agility: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                  placeholder="18.42"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Dikey Sıçrama (cm)
                </label>
                <input
                  type="number"
                  required
                  step="0.1"
                  value={formData.vertical_jump}
                  onChange={(e) =>
                    setFormData({ ...formData, vertical_jump: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                  placeholder="24.36"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  FFMI
                </label>
                <input
                  type="number"
                  required
                  step="0.1"
                  value={formData.ffmi}
                  onChange={(e) =>
                    setFormData({ ...formData, ffmi: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                  placeholder="14.6"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={!selectedAthlete || loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? "Kaydediliyor..." : "Test Sonucunu Kaydet"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
