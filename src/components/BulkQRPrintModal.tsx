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
}

const BulkQRPrintModal: React.FC<BulkQRPrintModalProps> = ({
  isOpen,
  onClose,
  athletes,
  clubName,
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
      } catch (error) {
        console.error(
          `QR kod oluşturulurken hata (${athlete.first_name}):`,
          error
        );
      }
    }

    setGeneratedQRCodes(qrCodes);
    setIsGenerating(false);
  };

  const handleBulkPrint = async () => {
    if (!printRef.current) return;

    try {
      setIsGenerating(true);
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const qrSize = 80; // 20x20cm = 80x80mm
      const qrSpacing = 10; // QR kodlar arası boşluk
      const qrPerRow = Math.floor(pageWidth / (qrSize + qrSpacing));
      const qrPerCol = Math.floor(pageHeight / (qrSize + qrSpacing));

      let currentPage = 0;
      let qrCount = 0;

      for (let i = 0; i < athletes.length; i++) {
        const athlete = athletes[i];
        const qrCodeUrl = generatedQRCodes[athlete.athlete_id];

        if (!qrCodeUrl) continue;

        const row = Math.floor(qrCount % (qrPerRow * qrPerCol)) % qrPerRow;
        const col = Math.floor(qrCount % (qrPerRow * qrPerCol)) / qrPerRow;

        if (qrCount > 0 && qrCount % (qrPerRow * qrPerCol) === 0) {
          pdf.addPage();
          currentPage++;
        }

        const x = row * (qrSize + qrSpacing) + qrSpacing;
        const y = col * (qrSize + qrSpacing) + qrSpacing;

        pdf.addImage(qrCodeUrl, "PNG", x, y, qrSize, qrSize);

        // Sporcu adını QR kodun altına ekle
        pdf.setFontSize(8);
        pdf.text(
          `${athlete.first_name} ${athlete.last_name}`,
          x,
          y + qrSize + 5
        );
        pdf.text(athlete.birth_date, x, y + qrSize + 10);

        qrCount++;
      }

      pdf.save(`${clubName}_QR_Kodlar.pdf`);
    } catch (error) {
      console.error("Toplu PDF oluşturulurken hata:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Toplu QR Kod Yazdır</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Club Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">
              Kulüp Bilgileri
            </h3>
            <div className="text-sm">
              <p>
                <span className="font-medium">Kulüp:</span> {clubName}
              </p>
              <p>
                <span className="font-medium">Sporcu Sayısı:</span>{" "}
                {athletes.length}
              </p>
            </div>
          </div>

          {/* Progress */}
          {isGenerating && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">
                QR Kodlar Oluşturuluyor
              </h3>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-blue-700 mt-2">
                {Math.round(progress)}% tamamlandı (
                {Object.keys(generatedQRCodes).length}/{athletes.length})
              </p>
            </div>
          )}

          {/* QR Codes Preview */}
          {Object.keys(generatedQRCodes).length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">
                QR Kod Önizleme
              </h3>
              <div
                ref={printRef}
                className="grid grid-cols-4 gap-4 p-4 border-2 border-gray-300 rounded-lg bg-white"
              >
                {athletes.slice(0, 8).map((athlete) => {
                  const qrCodeUrl = generatedQRCodes[athlete.athlete_id];
                  if (!qrCodeUrl) return null;

                  return (
                    <div key={athlete.athlete_id} className="text-center">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="mx-auto mb-2"
                        style={{ width: "80px", height: "80px" }}
                      />
                      <div className="text-xs text-gray-600">
                        <p className="font-semibold truncate">
                          {athlete.first_name} {athlete.last_name}
                        </p>
                        <p className="text-xs">{athlete.birth_date}</p>
                      </div>
                    </div>
                  );
                })}
                {athletes.length > 8 && (
                  <div className="col-span-4 text-center text-gray-500 text-sm">
                    ... ve {athletes.length - 8} QR kod daha
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Print Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">
              Yazdırma Talimatları
            </h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Tüm QR kodlar A4 kağıda yazdırılacak</li>
              <li>Her QR kod 20x20cm boyutunda olacak</li>
              <li>Yapışkanlı kağıt kullanın</li>
              <li>QR kodları kesip sporcuların formalarına yapıştırın</li>
              <li>Her QR kodun altında sporcu adı ve doğum tarihi yazacak</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              onClick={handleBulkPrint}
              disabled={
                Object.keys(generatedQRCodes).length === 0 || isGenerating
              }
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Yazdırılıyor..." : "Toplu Yazdır"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkQRPrintModal;
