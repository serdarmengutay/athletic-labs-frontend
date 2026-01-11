"use client";

import React, { useState, useRef } from "react";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { QRCodeData } from "@/types";

interface BulkQRPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  athletes: QRCodeData[];
  clubName: string;
  sessionId: string;
}

const BulkQRPrintModal: React.FC<BulkQRPrintModalProps> = ({
  isOpen,
  onClose,
  athletes,
  clubName,
  sessionId,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedQRCodes, setGeneratedQRCodes] = useState<{
    [key: string]: string;
  }>({});
  const printRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && athletes.length > 0) {
      generateAllQRCodes();
    }
  }, [isOpen, athletes]);

  const generateAllQRCodes = async () => {
    setIsGenerating(true);
    setProgress(0);
    const qrCodes: { [key: string]: string } = {};

    try {
      // Backend'den QR kodları toplu olarak al
      const athleteIds = athletes.map((athlete) => athlete.athlete_id);

      const response = await fetch("/api/qr/bulk-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          athlete_ids: athleteIds,
        }),
      });

      if (!response.ok) {
        throw new Error("QR kod oluşturulamadı");
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Backend'den gelen QR kodları kullan
        for (const qrData of result.data) {
          qrCodes[qrData.athlete_id] = qrData.qr_code;
        }
        setProgress(100);
      } else {
        throw new Error(result.message || "QR kod oluşturulamadı");
      }
    } catch (error) {
      console.error("Backend QR kod oluşturma hatası:", error);

      // Fallback: Frontend'de QR kod oluştur
      for (let i = 0; i < athletes.length; i++) {
        const athlete = athletes[i];
        try {
          const qrData = JSON.stringify({
            athlete_id: athlete.athlete_id,
            first_name: athlete.first_name,
            last_name: athlete.last_name,
            birth_date: athlete.birth_date,
            club_name: athlete.club_name,
          });

          const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: 200,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });

          qrCodes[athlete.athlete_id] = qrCodeDataURL;
          setProgress(((i + 1) / athletes.length) * 100);
        } catch (qrError) {
          console.error(
            `QR kod oluşturulurken hata (${athlete.first_name}):`,
            qrError
          );
        }
      }
    }

    setGeneratedQRCodes(qrCodes);
    setIsGenerating(false);
  };

  const handleBulkPrint = async () => {
    try {
      setIsGenerating(true);

      // Her sporcu için ayrı PDF oluştur
      for (let i = 0; i < athletes.length; i++) {
        const athlete = athletes[i];
        const qrCodeUrl = generatedQRCodes[athlete.athlete_id];

        if (!qrCodeUrl) {
          console.warn(
            `QR kod bulunamadı: ${athlete.first_name} ${athlete.last_name}`
          );
          continue;
        }

        // Her sporcu için ayrı PDF oluştur (20x20 cm)
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [200, 200], // 20x20 cm = 200x200 mm
        });

        const pageWidth = 200; // 20 cm
        const pageHeight = 200; // 20 cm

        // QR kod boyutu ve konumu - daha büyük ve merkezi
        const qrSize = 140; // QR kod boyutu (mm) - daha büyük
        const qrX = (pageWidth - qrSize) / 2; // Ortala
        const qrY = 15; // Üstten 15mm

        // QR kodunu ortala
        pdf.addImage(qrCodeUrl, "PNG", qrX, qrY, qrSize, qrSize);

        // Sporcu bilgilerini QR kodun altına ekle
        const textY = qrY + qrSize + 15; // QR kodun altından 15mm
        const textX = pageWidth / 2; // Ortala

        // Doğum yılı formatını düzenle
        let birthYear = "Bilinmiyor";
        if (athlete.birth_date) {
          // birth_date formatından yıl çıkar (YYYY-MM-DD veya DD/MM/YYYY)
          const dateStr = athlete.birth_date.toString();
          if (dateStr.includes("-")) {
            birthYear = dateStr.split("-")[0]; // YYYY-MM-DD formatı
          } else if (dateStr.includes("/")) {
            birthYear = dateStr.split("/")[2]; // DD/MM/YYYY formatı
          } else if (dateStr.length === 4) {
            birthYear = dateStr; // Sadece yıl
          }
        }

        // Tek satırda ad soyad - doğum yılı
        const fullText = `${athlete.first_name} ${athlete.last_name} - ${birthYear}`;

        // Font ayarları - daha büyük ve net
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");

        // Metni ortala
        const textWidth = pdf.getTextWidth(fullText);
        pdf.text(fullText, textX - textWidth / 2, textY);

        // PDF'i indir
        const fileName = `${athlete.first_name}_${athlete.last_name}_QR.pdf`;
        pdf.save(fileName);

        console.log(
          `QR kod oluşturuldu: ${athlete.first_name} ${athlete.last_name} (${
            i + 1
          }/${athletes.length})`
        );
      }

      alert(
        `${athletes.length} sporcu için QR kod PDF'leri oluşturuldu ve indirildi!`
      );
    } catch (error) {
      console.error("PDF oluşturulurken hata:", error);
      alert("PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              QR Kod Yazdırma
            </h2>
            <p className="text-gray-600 mt-1">
              Sporcular için QR kodları oluşturun ve yazdırın
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Club Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-bold text-blue-900 text-lg mb-3">
              Test Oturumu Bilgileri
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-blue-700 font-medium">Kulüp:</span>
                <p className="text-blue-900 font-semibold">{clubName}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">
                  Sporcu Sayısı:
                </span>
                <p className="text-blue-900 font-semibold">
                  {athletes.length} sporcu
                </p>
              </div>
            </div>
          </div>

          {/* Progress */}
          {isGenerating && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-green-600 rounded-full animate-pulse"></div>
                </div>
                <h3 className="font-bold text-green-900 text-lg">
                  QR Kodlar Oluşturuluyor
                </h3>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-green-700 font-medium">
                {Math.round(progress)}% tamamlandı (
                {Object.keys(generatedQRCodes).length}/{athletes.length} QR kod)
              </p>
            </div>
          )}

          {/* QR Codes Preview */}
          {Object.keys(generatedQRCodes).length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 text-lg mb-4">
                QR Kod Önizleme
              </h3>
              <div
                ref={printRef}
                className="grid grid-cols-4 gap-6 p-6 border-2 border-gray-300 rounded-xl bg-white"
              >
                {athletes.slice(0, 8).map((athlete) => {
                  const qrCodeUrl = generatedQRCodes[athlete.athlete_id];
                  if (!qrCodeUrl) return null;

                  return (
                    <div
                      key={athlete.athlete_id}
                      className="text-center bg-gray-50 rounded-lg p-4"
                    >
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="mx-auto mb-3 shadow-lg"
                        style={{ width: "100px", height: "100px" }}
                      />
                      <div className="text-sm text-gray-700">
                        <p className="font-bold truncate">
                          {athlete.first_name} {athlete.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {athlete.birth_date}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {athletes.length > 8 && (
                  <div className="col-span-4 text-center text-gray-500 text-sm py-4 bg-gray-100 rounded-lg">
                    ... ve {athletes.length - 8} QR kod daha
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Print Instructions */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <h3 className="font-bold text-orange-900 text-lg mb-3">
              📋 Yazdırma Talimatları
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-orange-800">
              <div className="space-y-2">
                <p className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                  <span>Tüm QR kodlar A4 kağıda yazdırılacak</span>
                </p>
                <p className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                  <span>Her QR kod 20x20cm boyutunda olacak</span>
                </p>
                <p className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                  <span>Yapışkanlı kağıt kullanın</span>
                </p>
              </div>
              <div className="space-y-2">
                <p className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                  <span>
                    QR kodları kesip sporcuların formalarına yapıştırın
                  </span>
                </p>
                <p className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                  <span>
                    Her QR kodun altında sporcu adı ve doğum tarihi yazacak
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
            >
              İptal
            </button>
            <button
              onClick={handleBulkPrint}
              disabled={
                Object.keys(generatedQRCodes).length === 0 || isGenerating
              }
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
            >
              {isGenerating ? "Yazdırılıyor..." : "📄 PDF Oluştur ve İndir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkQRPrintModal;
