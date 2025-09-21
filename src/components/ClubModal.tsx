"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { clubApi } from "@/lib/api";

interface ClubModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClubModal({ onClose, onSuccess }: ClubModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    contact_person_name: "",
    contact_person_phone: "",
    contact_person_email: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await clubApi.create(formData);
      onSuccess();
    } catch (error) {
      console.error("Kulüp oluşturulurken hata:", error);
      alert("Kulüp oluşturulurken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Yeni Kulüp Ekle</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Kulüp Adı
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
              placeholder="Örn: Bursaspor"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Şehir
            </label>
            <input
              type="text"
              required
              value={formData.city}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
              placeholder="Örn: Bursa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              İletişim Kişisi Adı
            </label>
            <input
              type="text"
              required
              value={formData.contact_person_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact_person_name: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
              placeholder="Örn: Ahmet Yılmaz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              İletişim Telefonu
            </label>
            <input
              type="tel"
              required
              value={formData.contact_person_phone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact_person_phone: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
              placeholder="Örn: 0532 123 45 67"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              İletişim E-posta
            </label>
            <input
              type="email"
              required
              value={formData.contact_person_email}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact_person_email: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
              placeholder="Örn: ahmet@bursaspor.com"
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
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
