"use client";

import { useState, useRef } from "react";
import {
  X,
  Upload,
  Download,
  FileText,
  Users,
  AlertCircle,
} from "lucide-react";
import { Club } from "@/types";

interface AthleteImportModalProps {
  onClose: () => void;
  onSuccess: (athletes: any[]) => void;
  club: Club;
}

interface ImportedAthlete {
  first_name: string;
  last_name: string;
  birth_date: string;
  height?: number;
  weight?: number;
}

export default function AthleteImportModal({
  onClose,
  onSuccess,
  club,
}: AthleteImportModalProps) {
  const [importedAthletes, setImportedAthletes] = useState<ImportedAthlete[]>(
    []
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError("");

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        throw new Error("Dosya en az 2 satır içermeli (başlık + veri)");
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const requiredHeaders = ["ad", "soyad", "doğum_tarihi"];

      // Başlık kontrolü
      const missingHeaders = requiredHeaders.filter(
        (h) => !headers.includes(h)
      );
      if (missingHeaders.length > 0) {
        throw new Error(`Eksik sütunlar: ${missingHeaders.join(", ")}`);
      }

      const athletes: ImportedAthlete[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());

        if (values.length < 3) continue;

        const athlete: ImportedAthlete = {
          first_name: values[headers.indexOf("ad")] || "",
          last_name: values[headers.indexOf("soyad")] || "",
          birth_date: values[headers.indexOf("doğum_tarihi")] || "",
        };

        // Opsiyonel alanlar
        if (headers.includes("boy") && values[headers.indexOf("boy")]) {
          athlete.height = parseFloat(values[headers.indexOf("boy")]);
        }
        if (headers.includes("kilo") && values[headers.indexOf("kilo")]) {
          athlete.weight = parseFloat(values[headers.indexOf("kilo")]);
        }

        // Tarih formatını kontrol et
        if (athlete.birth_date) {
          const date = new Date(athlete.birth_date);
          if (isNaN(date.getTime())) {
            throw new Error(
              `${i + 1}. satırda geçersiz tarih formatı: ${athlete.birth_date}`
            );
          }
        }

        athletes.push(athlete);
      }

      if (athletes.length === 0) {
        throw new Error("Geçerli sporcu verisi bulunamadı");
      }

      setImportedAthletes(athletes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Dosya işlenirken hata oluştu"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent =
      "Ad,Soyad,Doğum Tarihi,Boy,Kilo\n" +
      "Ahmet,Yılmaz,2000-01-15,180,75\n" +
      "Mehmet,Kaya,2001-03-20,175,70\n" +
      "Ayşe,Demir,2000-11-10,165,60";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sporcu_listesi_template.csv";
    link.click();
  };

  const handleImport = async () => {
    if (importedAthletes.length === 0) return;

    try {
      setIsProcessing(true);

      // API'ye gönder
      const athletesWithClub = importedAthletes.map((athlete) => ({
        ...athlete,
        club_id: club.id,
        height: athlete.height || 0,
        weight: athlete.weight || 0,
        bmi:
          athlete.height && athlete.weight
            ? athlete.weight / Math.pow(athlete.height / 100, 2)
            : 0,
      }));

      onSuccess(athletesWithClub);
    } catch (err) {
      setError("Sporcular kaydedilirken hata oluştu");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Sporcu Listesi İçe Aktar - {club.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Template İndirme */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">
              1. Template İndirin
            </h3>
            <p className="text-sm text-blue-700 mb-3">
              Önce aşağıdaki template dosyasını indirip sporcu bilgilerinizi
              doldurun.
            </p>
            <button
              onClick={downloadTemplate}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Template İndir (.csv)</span>
            </button>
          </div>

          {/* Dosya Yükleme */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">
              2. Dosyayı Yükleyin
            </h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                CSV veya Excel dosyasını seçin
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center space-x-2 mx-auto"
              >
                <Upload className="h-4 w-4" />
                <span>{isProcessing ? "İşleniyor..." : "Dosya Seç"}</span>
              </button>
            </div>
          </div>

          {/* Hata Mesajı */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Önizleme */}
          {importedAthletes.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">
                3. Önizleme ({importedAthletes.length} sporcu)
              </h3>
              <div className="max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Ad
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Soyad
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Doğum Tarihi
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Boy
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Kilo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importedAthletes.slice(0, 10).map((athlete, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {athlete.first_name}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {athlete.last_name}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {athlete.birth_date}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {athlete.height || "-"}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {athlete.weight || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importedAthletes.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2">
                    ... ve {importedAthletes.length - 10} sporcu daha
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Butonlar */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              İptal
            </button>
            <button
              onClick={handleImport}
              disabled={importedAthletes.length === 0 || isProcessing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>
                {isProcessing
                  ? "Kaydediliyor..."
                  : `${importedAthletes.length} Sporcu Ekle`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
