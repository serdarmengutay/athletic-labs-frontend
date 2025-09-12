"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Copy, Check } from "lucide-react";

interface QRCodeGeneratorProps {
  athleteId: string;
  athleteName: string;
  sessionId: string;
  size?: number;
}

export default function QRCodeGenerator({
  athleteId,
  athleteName,
  sessionId,
  size = 200,
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrData = {
          athleteId,
          athleteName,
          sessionId,
          timestamp: new Date().toISOString(),
          type: "athletic_test",
        };
        const qrString = JSON.stringify(qrData);
        const dataUrl = await QRCode.toDataURL(qrString, {
          width: size,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error("QR kod oluşturulurken hata:", error);
      }
    };

    generateQR();
  }, [athleteId, athleteName, sessionId, size]);

  const downloadQR = () => {
    if (qrDataUrl) {
      const link = document.createElement("a");
      link.download = `qr-${athleteId}-${athleteName.replace(/\s+/g, "-")}.png`;
      link.href = qrDataUrl;
      link.click();
    }
  };

  const copyQRData = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(qrData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("QR verisi kopyalanırken hata:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-sm mx-auto">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {athleteName}
        </h3>
        <p className="text-sm text-gray-600 mb-4">Test QR Kodu</p>

        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className="border border-gray-200 rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <button
            onClick={downloadQR}
            disabled={!qrDataUrl}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>İndir</span>
          </button>

          <button
            onClick={copyQRData}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span>Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Veriyi Kopyala</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-2">QR Kod Verisi:</p>
          <pre className="text-xs text-gray-700 break-all">
            {JSON.stringify(qrData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
