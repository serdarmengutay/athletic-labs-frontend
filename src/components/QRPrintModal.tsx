"use client";

import { useState, useEffect } from "react";
import { X, Printer, Download, Users } from "lucide-react";
import QRCode from "qrcode";
import { Athlete, AdvancedTestSession } from "@/types";

interface QRPrintModalProps {
  onClose: () => void;
  session: AdvancedTestSession;
  athletes: Athlete[];
}

export default function QRPrintModal({
  onClose,
  session,
  athletes,
}: QRPrintModalProps) {
  const [qrCodes, setQrCodes] = useState<
    { athlete: Athlete; qrDataUrl: string }[]
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQRCodes = async () => {
    setIsGenerating(true);
    const qrDataArray = [];

    for (const athlete of athletes) {
      try {
        const qrData = {
          athleteId: athlete.id,
          athleteName: `${athlete.first_name} ${athlete.last_name}`,
          sessionId: session.id,
          clubId: session.club_id,
          timestamp: new Date().toISOString(),
          type: "athletic_test",
        };

        const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
          width: 200,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });

        qrDataArray.push({ athlete, qrDataUrl });
      } catch (error) {
        console.error(
          `QR kod oluşturulurken hata (${athlete.first_name}):`,
          error
        );
      }
    }

    setQrCodes(qrDataArray);
    setIsGenerating(false);
  };

  useEffect(() => {
    generateQRCodes();
  }, [athletes, session]); // eslint-disable-line react-hooks/exhaustive-deps

  const printQRCodes = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Kodlar - ${session.club?.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .qr-container { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 20px; 
              max-width: 800px; 
              margin: 0 auto;
            }
            .qr-card { 
              border: 1px solid #ddd; 
              padding: 15px; 
              text-align: center; 
              page-break-inside: avoid;
            }
            .qr-code { margin: 10px 0; }
            .athlete-name { font-weight: bold; font-size: 16px; margin: 10px 0; }
            .athlete-code { font-size: 14px; color: #666; }
            .session-info { font-size: 12px; color: #888; margin-top: 10px; }
            @media print {
              .qr-container { grid-template-columns: repeat(2, 1fr); }
              .qr-card { margin-bottom: 20px; }
            }
          </style>
        </head>
        <body>
          <h1 style="text-align: center; margin-bottom: 30px;">
            ${session.club?.name} - Test QR Kodları
          </h1>
          <div class="qr-container">
            ${qrCodes
              .map(
                ({ athlete, qrDataUrl }) => `
              <div class="qr-card">
                <div class="athlete-name">${athlete.first_name} ${
                  athlete.last_name
                }</div>
                <div class="athlete-code">${athlete.uuid}</div>
                <div class="qr-code">
                  <img src="${qrDataUrl}" alt="QR Code" style="width: 150px; height: 150px;" />
                </div>
                <div class="session-info">
                  ${new Date(session.test_date).toLocaleDateString("tr-TR")}
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const downloadQRCodes = async () => {
    const { default: JSZip } = await import("jszip");
    const zipFile = new JSZip();

    qrCodes.forEach(({ athlete, qrDataUrl }) => {
      const base64Data = qrDataUrl.split(",")[1];
      zipFile.file(
        `${athlete.uuid}_${athlete.first_name}_${athlete.last_name}.png`,
        base64Data,
        { base64: true }
      );
    });

    zipFile.generateAsync({ type: "blob" }).then((content: Blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${session.club?.name}_qr_kodlar.zip`;
      link.click();
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            QR Kod Yazdırma - {session.club?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {isGenerating ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">QR kodlar oluşturuluyor...</p>
            </div>
          ) : (
            <>
              {/* Kontroller */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-gray-600">
                      {qrCodes.length} sporcu için QR kod hazır
                    </span>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={downloadQRCodes}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>ZIP İndir</span>
                  </button>
                  <button
                    onClick={printQRCodes}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Yazdır</span>
                  </button>
                </div>
              </div>

              {/* QR Kod Önizleme */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                {qrCodes.map(({ athlete, qrDataUrl }) => (
                  <div
                    key={athlete.id}
                    className="border rounded-lg p-4 text-center"
                  >
                    <div className="font-medium text-sm mb-2">
                      {athlete.first_name} {athlete.last_name}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {athlete.uuid}
                    </div>
                    <div className="flex justify-center">
                      <img
                        src={qrDataUrl}
                        alt="QR Code"
                        className="w-20 h-20"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Yazdırma Talimatları */}
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-900 mb-2">
                  Yazdırma Talimatları
                </h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• QR kodları A4 kağıda yazdırın</li>
                  <li>• Her sporcuya bir QR kod kartı verin</li>
                  <li>• Kartları plastik koruyucu içine koyun</li>
                  <li>
                    • Test sırasında sporcular QR kodları yanlarında bulundursun
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
