"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { ExcelAthleteData, ExcelImportResult } from "@/types";
import { clubApi } from "@/lib/api";

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  sessionId: string;
  onImportSuccess: (result: ExcelImportResult) => void;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: string[] | string;
    };
  };
}

const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  clubId,
  sessionId,
  onImportSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [importedData, setImportedData] = useState<ExcelAthleteData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setSelectedFile(file);
    setIsLoading(true);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          worksheet
        );

        // Excel verilerini doğrula ve dönüştür
        const athletes: ExcelAthleteData[] = [];
        const validationErrors: string[] = [];

        jsonData.forEach((row, index: number) => {
          const rowNumber = index + 2; // Excel'de satır numarası (header dahil)

          // Sütun sırasına göre veri al (1. sütun: Ad, 2. sütun: Soyad, 3. sütun: Doğum Yılı)
          const rowValues = Object.values(row);
          const firstName = rowValues[0]?.toString().trim();
          const lastName = rowValues[1]?.toString().trim();
          const birthYearStr = rowValues[2]?.toString().trim();

          if (!firstName || !lastName || !birthYearStr) {
            validationErrors.push(
              `Satır ${rowNumber}: 1. sütun (Ad), 2. sütun (Soyad) ve 3. sütun (Doğum Yılı) alanları zorunludur`
            );
            return;
          }

          // Doğum yılını kontrol et
          let birthYear: number;

          // Sadece yıl verilmişse (4 haneli sayı)
          if (/^\d{4}$/.test(birthYearStr)) {
            birthYear = parseInt(birthYearStr);
          } else {
            // Tam tarih formatından yıl çıkar
            const birthDate = new Date(birthYearStr);
            if (isNaN(birthDate.getTime())) {
              validationErrors.push(
                `Satır ${rowNumber}: Geçersiz doğum yılı formatı (${birthYearStr})`
              );
              return;
            }
            birthYear = birthDate.getFullYear();
          }

          if (
            isNaN(birthYear) ||
            birthYear < 1900 ||
            birthYear > new Date().getFullYear()
          ) {
            validationErrors.push(
              `Satır ${rowNumber}: Geçersiz doğum yılı (${birthYearStr}) - 1900-${new Date().getFullYear()} arasında olmalı`
            );
            return;
          }

          athletes.push({
            first_name: firstName,
            last_name: lastName,
            birth_date: new Date(birthYear, 0, 1).toISOString().split("T")[0], // 1 Ocak olarak ayarla
          });
        });

        if (validationErrors.length > 0) {
          setErrors(validationErrors);
          setIsLoading(false);
          return;
        }

        setImportedData(athletes);
        setIsLoading(false);
      } catch {
        setErrors([
          "Excel dosyası okunurken hata oluştu. Lütfen dosya formatını kontrol edin.",
        ]);
        setIsLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

  const handleImport = async () => {
    if (!selectedFile || importedData.length === 0) return;

    setIsLoading(true);
    try {
      // Backend'in beklediği formatta yeni Excel dosyası oluştur
      const workbook = XLSX.utils.book_new();
      // Sütun sırasına göre Excel oluştur (1. sütun: Ad, 2. sütun: Soyad, 3. sütun: Doğum Yılı)
      const worksheetData = [
        ["Ad", "Soyad", "Doğum Yılı"], // Header
        ...importedData.map((athlete) => [
          athlete.first_name,
          athlete.last_name,
          new Date(athlete.birth_date).getFullYear(), // Sadece yıl (number olarak)
        ]),
      ];

      // Eğer yukarıdaki çalışmazsa, alternatif formatları dene
      // const worksheetData = [
      //   ["first_name", "last_name", "birth_year"], // Alternatif 1
      //   ...importedData.map((athlete) => [
      //     athlete.first_name,
      //     athlete.last_name,
      //     new Date(athlete.birth_date).getFullYear().toString(),
      //   ]),
      // ];

      // Alternatif formatları da dene
      console.log("Orijinal veri:", importedData);
      console.log("Dönüştürülen veri:", worksheetData);

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sporcular");

      // Yeni Excel dosyasını oluştur
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const newFile = new File([excelBuffer], "athletes.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Debug: Gönderilen veriyi kontrol et
      console.log("Gönderilen Excel verisi:", worksheetData);
      console.log("Oluşturulan dosya:", newFile);

      // Backend'e gönder
      const response = await clubApi.importAthletes(clubId, sessionId, newFile);

      const result: ExcelImportResult = {
        success: response.data.success,
        imported_count:
          response.data.data?.imported_count || importedData.length,
        errors: response.data.data?.errors || [],
        athletes: response.data.data?.athletes || [],
      };

      onImportSuccess(result);
      onClose();
    } catch (error: unknown) {
      console.error("Import error:", error);
      const apiError = error as ApiError;
      console.error("Error response:", apiError.response?.data);

      // Backend'den gelen hata mesajını göster
      if (apiError.response?.data?.message) {
        setErrors([apiError.response.data.message]);
      } else if (apiError.response?.data?.errors) {
        setErrors(
          Array.isArray(apiError.response.data.errors)
            ? apiError.response.data.errors
            : [apiError.response.data.errors]
        );
      } else {
        setErrors(["Sporcu verileri yüklenirken hata oluştu."]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Sporcu Listesi İçe Aktar</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Excel Template Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">
              Excel Dosyası Formatı
            </h3>
            <p className="text-sm text-blue-700">
              Excel dosyanızda sütun sırası önemlidir. Sütun adları farklı
              olabilir, önemli olan sıralama:
            </p>
            <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
              <li>
                <strong>1. Sütun:</strong> Sporcu adı (sütun adı farklı
                olabilir)
              </li>
              <li>
                <strong>2. Sütun:</strong> Sporcu soyadı (sütun adı farklı
                olabilir)
              </li>
              <li>
                <strong>3. Sütun:</strong> Doğum yılı (sadece yıl: 2003, 2004,
                1993, 1992)
              </li>
            </ul>
            <div className="mt-3 p-3 bg-blue-100 rounded border border-blue-200">
              <p className="text-xs text-blue-800 font-medium">
                💡 Sütun adları farklı olabilir - önemli olan sıralama!
              </p>
              <p className="text-xs text-blue-800 font-medium mt-1">
                📅 Doğum Yılı: Sadece yıl formatında (2003, 2004, 1993, 1992)
              </p>
            </div>
          </div>

          {/* File Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-2">
              <div className="text-4xl">📁</div>
              {isDragActive ? (
                <p className="text-blue-600">Dosyayı buraya bırakın...</p>
              ) : (
                <div>
                  <p className="text-gray-600">
                    Excel dosyasını buraya sürükleyin veya tıklayarak seçin
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    .xlsx veya .xls formatında
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Dosya işleniyor...</p>
            </div>
          )}

          {/* Imported Data Preview */}
          {importedData.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">
                İçe Aktarılacak Veriler ({importedData.length} sporcu)
              </h3>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Ad</th>
                      <th className="text-left p-2">Soyad</th>
                      <th className="text-left p-2">Doğum Tarihi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedData.slice(0, 10).map((athlete, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{athlete.first_name}</td>
                        <td className="p-2">{athlete.last_name}</td>
                        <td className="p-2">{athlete.birth_date}</td>
                      </tr>
                    ))}
                    {importedData.length > 10 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-2 text-center text-gray-500"
                        >
                          ... ve {importedData.length - 10} sporcu daha
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">Hatalar</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="list-disc list-inside">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedFile || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "İçe Aktarılıyor..." : "İçe Aktar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelImportModal;
