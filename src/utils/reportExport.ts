import { toPng } from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { AthleteReportResponse } from "@/types/report";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import AthleteReport from "@/components/AthleteReport";

/**
 * Sanitize filename by removing special characters
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 50); // Limit length
}

/**
 * Render a single report to JPG image
 */
async function renderReportToImage(
  report: AthleteReportResponse
): Promise<Blob> {
  // Create hidden container
  const container = document.createElement("div");
  container.id = "report-export-container";
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.width = "1920px";
  container.style.height = "auto";
  document.body.appendChild(container);

  try {
    // Render React component
    const root = createRoot(container);
    const reportElement = createElement(AthleteReport, { report });

    // Mount component
    await new Promise<void>((resolve) => {
      root.render(reportElement);
      // Wait for render to complete
      setTimeout(resolve, 1000);
    });

    // Convert to PNG
    const dataUrl = await toPng(container, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: "#0a0e27",
    });

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Cleanup
    root.unmount();
    document.body.removeChild(container);

    return blob;
  } catch (error) {
    // Cleanup on error
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    throw error;
  }
}

/**
 * Export all athlete reports to a ZIP file
 */
export async function exportReportsToZip(
  reports: AthleteReportResponse[],
  sessionName: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();

  // Sequential processing
  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];

    // Update progress
    if (onProgress) {
      onProgress(i + 1, reports.length);
    }

    try {
      // Render report to image
      const imageBlob = await renderReportToImage(report);

      // Generate filename: 001_Ahmet_Yilmaz.jpg
      const index = String(i + 1).padStart(3, "0");
      const sanitizedName = sanitizeFileName(report.athlete.fullName);
      const fileName = `${index}_${sanitizedName}.jpg`;

      // Add to ZIP
      zip.file(fileName, imageBlob);
    } catch (error) {
      console.error(
        `Failed to export report for ${report.athlete.fullName}:`,
        error
      );
      // Continue with other reports
    }
  }

  // Generate ZIP
  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // Trigger download
  const sanitizedSessionName = sanitizeFileName(sessionName);
  saveAs(zipBlob, `${sanitizedSessionName}_raporlar.zip`);
}
