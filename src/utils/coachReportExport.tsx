import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { saveAs } from "file-saver";
import type { SessionReportResponse } from "@/types/report";
import CoachReport, {
  buildCoachReportRows,
  COACH_REPORT_HEIGHT,
  buildCoachReportPages,
  COACH_REPORT_WIDTH,
} from "@/components/CoachReport";

// Seçim kimlikle doğrulanır; eksik rapor varsa sessizce eksik PDF indirilmez.
export function selectCoachReports(
  session: SessionReportResponse,
  athleteIds: string[],
): SessionReportResponse {
  const ids = new Set(athleteIds);
  if (!ids.size) throw new Error("En az bir sporcu seçin.");
  const athletes = session.athletes.filter((athlete) =>
    ids.has(athlete.athleteId),
  );
  const returnedIds = new Set(athletes.map((athlete) => athlete.athleteId));
  if (returnedIds.size !== ids.size)
    throw new Error(
      `${ids.size - returnedIds.size} seçili sporcunun karnesi bulunamadı. Ölçümleri kontrol edip tekrar deneyin.`,
    );
  return { ...session, athletes };
}

// Sayfalar sırayla işlenerek kalabalık gruplarda bellek tüketimi sınırlanır.
export async function createCoachReportPdf(
  session: SessionReportResponse,
  athleteIds: string[],
  groupName: string,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const selectedSession = selectCoachReports(session, athleteIds);
  const rows = buildCoachReportRows(selectedSession);
  const pages = buildCoachReportPages(rows);
  const pageCount = pages.length;
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [COACH_REPORT_WIDTH, COACH_REPORT_HEIGHT],
    hotfixes: ["px_scaling"],
    compress: true,
  });
  pdf.setProperties({
    title: `${session.clubName} - ${groupName || "Antrenör Raporu"}`,
    author: "Athletic Labs",
    subject: "Seçilen sporcuların performans ve fiziksel ölçüm raporu",
  });
  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${COACH_REPORT_WIDTH}px`,
    height: `${COACH_REPORT_HEIGHT}px`,
    zIndex: "-1",
    pointerEvents: "none",
  });
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      onProgress?.(pageIndex, pageCount);
      const currentPage = pages[pageIndex];
      const pageRows = currentPage.rows;
      const qrImages: Record<string, string> = {};
      for (const row of currentPage.kind === "health" ? pageRows : []) {
        const url = row.athlete.youjiSummary?.deviceReportUrl;
        if (url)
          qrImages[row.athlete.athleteId] = await QRCode.toDataURL(url, {
            width: 760,
            margin: 4,
            errorCorrectionLevel: "M",
          });
      }
      flushSync(() =>
        root.render(
          <CoachReport
            session={selectedSession}
            rows={pageRows}
            allRows={rows}
            groupName={groupName}
            pageNumber={pageIndex + 1}
            pageCount={pageCount}
            qrImages={qrImages}
            pageKind={currentPage.kind}
            startIndex={currentPage.startIndex}
          />,
        ),
      );
      await document.fonts.ready;
      await Promise.all(
        Array.from(container.querySelectorAll("img")).map((image) =>
          image.decode(),
        ),
      );
      const page = container.firstElementChild as HTMLElement;
      if (page.scrollHeight > COACH_REPORT_HEIGHT)
        throw new Error(
          "Rapor içeriği sayfaya sığmadı. Grup adını kısaltıp tekrar deneyin.",
        );
      const image = await toPng(page, {
        width: COACH_REPORT_WIDTH,
        height: COACH_REPORT_HEIGHT,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: false,
      });
      if (pageIndex)
        pdf.addPage([COACH_REPORT_WIDTH, COACH_REPORT_HEIGHT], "landscape");
      pdf.addImage(
        image,
        "PNG",
        0,
        0,
        COACH_REPORT_WIDTH,
        COACH_REPORT_HEIGHT,
        undefined,
        "FAST",
      );
      // PDF'deki QR alanı telefonda taramanın yanında tıklanarak da açılır.
      const pageBounds = page.getBoundingClientRect();
      page.querySelectorAll("a").forEach((link) => {
        const bounds = link.querySelector("img")?.getBoundingClientRect();
        if (bounds)
          pdf.link(
            bounds.x - pageBounds.x,
            bounds.y - pageBounds.y,
            bounds.width,
            bounds.height,
            { url: link.href },
          );
      });
      onProgress?.(pageIndex + 1, pageCount);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
    return pdf.output("blob");
  } finally {
    root.unmount();
    container.remove();
  }
}

// Tek dosya indirilir; antrenöre gönderim kullanıcıya bırakılır.
export async function exportCoachReportPdf(
  session: SessionReportResponse,
  athleteIds: string[],
  groupName: string,
  onProgress?: (current: number, total: number) => void,
) {
  const blob = await createCoachReportPdf(
    session,
    athleteIds,
    groupName,
    onProgress,
  );
  const name = [session.clubName, groupName, "Antrenor_Raporu"]
    .filter(Boolean)
    .join("_")
    .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_-]/g, "_")
    .slice(0, 140);
  saveAs(blob, `${name}.pdf`);
}
