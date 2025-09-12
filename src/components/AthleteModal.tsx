"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { athleteApi } from "@/lib/api";
import { Club } from "@/types";

interface AthleteModalProps {
  clubs: Club[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AthleteModal({
  clubs,
  onClose,
  onSuccess,
}: AthleteModalProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    birth_date: "",
    height: "",
    weight: "",
    club_id: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Veri doğrulama
      if (!formData.first_name.trim()) {
        alert("Ad alanı boş olamaz");
        return;
      }
      if (!formData.last_name.trim()) {
        alert("Soyad alanı boş olamaz");
        return;
      }
      if (!formData.birth_date) {
        alert("Doğum tarihi seçilmelidir");
        return;
      }
      if (!formData.height || isNaN(parseFloat(formData.height))) {
        alert("Geçerli bir boy değeri giriniz");
        return;
      }
      if (!formData.weight || isNaN(parseFloat(formData.weight))) {
        alert("Geçerli bir kilo değeri giriniz");
        return;
      }
      if (!formData.club_id) {
        alert("Kulüp seçilmelidir");
        return;
      }

      const athleteData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        birth_date: formData.birth_date,
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        club_id: formData.club_id, // UUID string olarak gönder
      };

      console.log("Gönderilen veri:", athleteData);

      const response = await athleteApi.create(athleteData);
      console.log("Başarılı yanıt:", response);
      onSuccess();
    } catch (error: any) {
      console.error("Sporcu oluşturulurken hata:", error);

      // Daha detaylı hata mesajı
      let errorMessage = "Sporcu oluşturulurken hata oluştu";

      if (error.response) {
        // Backend'den gelen hata
        console.error("Backend hata yanıtı:", error.response.data);
        console.error("HTTP durum kodu:", error.response.status);
        errorMessage = `Backend hatası (${error.response.status}): ${
          error.response.data?.message ||
          error.response.data ||
          "Bilinmeyen hata"
        }`;
      } else if (error.request) {
        // İstek gönderildi ama yanıt alınamadı
        console.error("İstek gönderildi ama yanıt alınamadı:", error.request);
        errorMessage = "Backend'e bağlanılamıyor. Backend çalışıyor mu?";
      } else {
        // İstek hazırlanırken hata
        console.error("İstek hazırlanırken hata:", error.message);
        errorMessage = `İstek hatası: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Yeni Sporcu Ekle</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Ad
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                placeholder="Mehmet"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Soyad
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                placeholder="Deviren"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Doğum Tarihi
            </label>
            <input
              type="date"
              required
              value={formData.birth_date}
              onChange={(e) =>
                setFormData({ ...formData, birth_date: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Boy (cm)
              </label>
              <input
                type="number"
                required
                step="0.1"
                value={formData.height}
                onChange={(e) =>
                  setFormData({ ...formData, height: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                placeholder="153"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Kilo (kg)
              </label>
              <input
                type="number"
                required
                step="0.1"
                value={formData.weight}
                onChange={(e) =>
                  setFormData({ ...formData, weight: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
                placeholder="48"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Kulüp
            </label>
            <select
              required
              value={formData.club_id}
              onChange={(e) =>
                setFormData({ ...formData, club_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
            >
              <option value="">Kulüp seçin</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name} - {club.city}
                </option>
              ))}
            </select>
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
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
