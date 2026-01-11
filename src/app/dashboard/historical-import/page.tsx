"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  Upload,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface ImportResult {
  totalRows: number;
  imported: number;
  failed: number;
}

export default function HistoricalImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await api.post("/historical-tests/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult(response.data);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(
        err.response?.data?.message || "Dosya yüklenirken bir hata oluştu"
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              Geçmiş Test Verisi Yükleme
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Description */}
          <p className="text-gray-600 mb-8">
            Geçmiş test verilerini içeren Excel dosyasını (.xlsx) yükleyerek
            sporcuların geçmiş performans verilerini sisteme aktarabilirsiniz.
          </p>

          {/* File Input */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 mb-6">
            <div className="text-center">
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />

              {selectedFile ? (
                <div className="space-y-2">
                  <p className="text-gray-900 font-medium">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Dosyayı Kaldır
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">
                    Excel dosyasını seçin veya sürükleyip bırakın
                  </p>
                  <label className="inline-block cursor-pointer">
                    <span className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Dosya Seç
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all ${
              selectedFile && !isUploading
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Yükleniyor...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>Yükle</span>
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
              <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-800">Hata</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <h3 className="font-semibold text-green-800">
                  Yükleme Tamamlandı
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {result.totalRows}
                  </p>
                  <p className="text-sm text-gray-500">Toplam Satır</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {result.imported}
                  </p>
                  <p className="text-sm text-gray-500">Başarılı</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {result.failed}
                  </p>
                  <p className="text-sm text-gray-500">Başarısız</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
