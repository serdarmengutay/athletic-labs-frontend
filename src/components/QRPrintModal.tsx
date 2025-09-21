"use client";

import React, { useState, useRef } from "react";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { QRCodeData } from "@/types";

interface QRPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteData: QRCodeData;
}

const QRPrintModal: React.FC<QRPrintModalProps> = ({
  isOpen,
  onClose,
  athleteData,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && athleteData) {
      generateQRCode();
    }
  }, [isOpen, athleteData]);

  const generateQRCode = async () => {
    setIsGenerating(true);
    try {
      const qrData = JSON.stringify({
        athlete_id: athleteData.athlete_id,
        first_name: athleteData.first_name,
        last_name: athleteData.last_name,
        birth_date: athleteData.birth_date,
        club_name: athleteData.club_name,
      });

      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      setQrCodeUrl(qrCodeDataURL);
    } catch (error) {
      console.error("QR kod oluşturulurken hata:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!printRef.current) return;

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, 80], // 20x20cm = 80x80mm (1cm = 4mm)
      });

      const imgWidth = 80;
      const imgHeight = 80;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`${athleteData.first_name}_${athleteData.last_name}_QR.pdf`);
    } catch (error) {
      console.error("PDF oluşturulurken hata:", error);
    }
  };

  const handleBulkPrint = async () => {
    // Bu fonksiyon kulüp için toplu yazdırma için kullanılacak
    // Şimdilik tek sporcu için çalışıyor
    handlePrint();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">QR Kod Yazdır</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Athlete Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">
              Sporcu Bilgileri
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Ad Soyad:</span>
                <p>
                  {athleteData.first_name} {athleteData.last_name}
                </p>
              </div>
              <div>
                <span className="font-medium">Doğum Tarihi:</span>
                <p>{athleteData.birth_date}</p>
              </div>
              <div>
                <span className="font-medium">Kulüp:</span>
                <p>{athleteData.club_name}</p>
              </div>
            </div>
          </div>

          {/* QR Code Preview */}
          <div className="text-center">
            <h3 className="font-semibold text-gray-800 mb-4">
              QR Kod Önizleme
            </h3>
            <div
              ref={printRef}
              className="inline-block p-4 border-2 border-gray-300 rounded-lg bg-white"
              style={{ width: "200px", height: "200px" }}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : qrCodeUrl ? (
                <div className="text-center">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="mx-auto mb-2"
                    style={{ width: "120px", height: "120px" }}
                  />
                  <div className="text-xs text-gray-600">
                    <p className="font-semibold">
                      {athleteData.first_name} {athleteData.last_name}
                    </p>
                    <p>{athleteData.birth_date}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  QR kod oluşturuluyor...
                </div>
              )}
            </div>
          </div>

          {/* Print Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">
              Yazdırma Talimatları
            </h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>QR kod 20x20cm boyutunda yazdırılacak</li>
              <li>Yapışkanlı kağıt kullanın</li>
              <li>QR kod sporcunun formasına yapıştırılacak</li>
              <li>QR kodun altında sporcu adı ve doğum tarihi yazacak</li>
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
              onClick={handlePrint}
              disabled={!qrCodeUrl || isGenerating}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Oluşturuluyor..." : "Yazdır"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRPrintModal;
