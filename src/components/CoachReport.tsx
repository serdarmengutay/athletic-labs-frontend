import { CalendarDays, Users, Shield, ScanLine, Info } from "lucide-react";
import type { SessionReportResponse } from "@/types/report";
import { getAthleteReportData } from "@/utils/reportExport";
import styles from "./CoachReport.module.css";

export const COACH_REPORT_WIDTH = 1700;
export const COACH_REPORT_HEIGHT = 1300;
export const COACH_REPORT_PAGE_SIZE = 8;

// Her satır karnenin ortak veri modelinden hazırlanır; QR hedefi de karneyle aynıdır.
export function buildCoachReportRows(session: SessionReportResponse) {
  return session.athletes.map((athlete) => ({
    athlete,
    ...getAthleteReportData(
      athlete,
      Boolean(session.valdEnabled),
      session.enabledMeasurementFields,
    ),
  }));
}

export type CoachReportRow = ReturnType<typeof buildCoachReportRows>[number];

// Tüm seçimin sütunları sayfalar arasında sabit tutulur.
export function getCoachReportColumns(
  rows: CoachReportRow[],
  kind: "performanceRows" | "physicalRows",
) {
  return Array.from(
    new Map(
      rows.flatMap((row) =>
        row[kind].map((cell) => [cell.label, cell] as const),
      ),
    ).values(),
  );
}

interface CoachReportProps {
  session: SessionReportResponse;
  rows: CoachReportRow[];
  allRows: CoachReportRow[];
  groupName: string;
  pageNumber: number;
  pageCount: number;
  qrImages: Record<string, string>;
}

// Yatay çıktı, sekiz sporcunun performansını ve fiziksel ölçümlerini birlikte gösterir.
export default function CoachReport({
  session,
  rows,
  allRows,
  groupName,
  pageNumber,
  pageCount,
  qrImages,
}: CoachReportProps) {
  const performanceColumns = getCoachReportColumns(allRows, "performanceRows");
  const physicalColumns = getCoachReportColumns(allRows, "physicalRows");
  const years = [
    ...new Set(allRows.map((row) => row.athlete.birthYear).filter(Boolean)),
  ].sort();
  const date = session.testDate ? new Date(session.testDate) : null;
  const dateLabel =
    date && Number.isFinite(date.getTime())
      ? date.toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Belirtilmedi";

  return (
    <article
      className={styles.page}
      style={{ width: COACH_REPORT_WIDTH, height: COACH_REPORT_HEIGHT }}
    >
      <header className={styles.brandRow}>
        <div className={styles.logoCrop}>
          {/* Kaynak logonun beyaz kenarları yalnızca sunum alanında gizlenir. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/coach-report/athletic-labs.png"
            alt="Athletic Labs - Sports Performance Testing"
          />
        </div>
        <div className={styles.motto}>
          ÖLÇ
          <br />
          ANALİZ ET
          <br />
          GELİŞTİR
        </div>
      </header>
      <div className={styles.headingRow}>
        <div className={styles.heading}>
          <h1>Takım Genel Raporu</h1>
          <p>{groupName || "Seçilen Sporcular. Tek Bakışta."}</p>
          <div className={styles.accent} />
        </div>
        <div className={styles.metadata}>
          <div>
            <Shield />
            <span>
              Takım<strong>{session.clubName || "Belirtilmedi"}</strong>
            </span>
          </div>
          <div>
            <Users />
            <span>
              Doğum Yılı<strong>{years.join(" · ") || "Belirtilmedi"}</strong>
            </span>
          </div>
          <div>
            <CalendarDays />
            <span>
              Test Tarihi<strong>{dateLabel}</strong>
            </span>
          </div>
          <div>
            <Users />
            <span>
              Seçilen Sporcu<strong>{allRows.length}</strong>
            </span>
          </div>
        </div>
      </div>
      <section>
        <table className={styles.performance}>
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: 185 }} />
            <col style={{ width: 65 }} />
            {performanceColumns.map((column) => (
              <col key={column.label} />
            ))}
            <col style={{ width: 105 }} />
            <col style={{ width: 125 }} />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th className={styles.name}>Sporcu Adı</th>
              <th>
                Doğum
                <br />
                Yılı
              </th>
              {performanceColumns.map((column) => (
                <th key={column.label}>
                  <column.icon size={22} />
                  <span>{column.label}</span>
                </th>
              ))}
              <th>
                <ScanLine size={22} />
                <span>
                  Fiziksel
                  <br />
                  Tarama QR
                </span>
              </th>
              <th>Genel Performans</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.athlete.athleteId}>
                <td>{(pageNumber - 1) * COACH_REPORT_PAGE_SIZE + index + 1}</td>
                <td className={styles.name}>{row.athlete.fullName}</td>
                <td>{row.athlete.birthYear || "-"}</td>
                {performanceColumns.map((column) => {
                  const cell = row.performanceRows.find(
                    (item) => item.label === column.label,
                  );
                  const score = row.radarData.find(
                    (item) => item.label === column.label,
                  )?.athleteScore;
                  return (
                    <td key={column.label}>
                      <div className={styles.metric}>
                        <strong>{cell?.value ?? "-"}</strong>
                        {score != null && cell && (
                          <>
                            <div className={styles.track}>
                              <i
                                style={{
                                  width: `${Math.max(0, Math.min(100, score))}%`,
                                }}
                              />
                            </div>
                            <small>Skor {score.toFixed(1)}</small>
                          </>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td>
                  {qrImages[row.athlete.athleteId] ? (
                    <a href={row.athlete.youjiSummary?.deviceReportUrl}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className={styles.qr}
                        src={qrImages[row.athlete.athleteId]}
                        alt={`${row.athlete.fullName} cihaz raporu QR`}
                      />
                    </a>
                  ) : (
                    <span className={styles.missing}>QR yok</span>
                  )}
                </td>
                <td>
                  {row.hasAnyMeasuredValue ? (
                    <div className={styles.overall}>
                      <strong>%{row.overallPercentile.toFixed(1)}</strong>
                      <small>Yüzdelik dilim</small>
                    </div>
                  ) : (
                    <span className={styles.missing}>Veri yok</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {physicalColumns.length > 0 && (
        <section className={styles.physicalSection}>
          <h2>Fiziksel Ölçümler</h2>
          <table className={styles.physical}>
            <colgroup>
              <col style={{ width: 225 }} />
              {physicalColumns.map((column) => (
                <col key={column.label} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className={styles.name}>Sporcu Adı</th>
                {physicalColumns.map((column) => (
                  <th key={column.label}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.athlete.athleteId}>
                  <td className={styles.name}>{row.athlete.fullName}</td>
                  {physicalColumns.map((column) => (
                    <td key={column.label}>
                      {row.physicalRows.find(
                        (cell) => cell.label === column.label,
                      )?.value ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <div className={styles.notes}>
        <div>
          <span className={styles.noteTitle}>Performans değerleri</span>
          <p>
            Hücrelerde ölçüm sonucu, çubuklarda karnedeki 0–100 performans skoru
            gösterilir. Genel performans, karnedeki yüzdelik dilimdir.
          </p>
        </div>
        <div>
          <ScanLine />
          <span>
            <span className={styles.noteTitle}>Detaylı Fiziksel Tarama</span>
            <p>
              Her sporcunun QR kodu, kendi karnesinde yer alan cihaz raporunu
              açar.
            </p>
          </span>
        </div>
        <div className={styles.info}>
          <Info />
          <p>
            Eksik ölçümler “-” ile gösterilir. Bu rapor yalnızca seçilen{" "}
            {allRows.length} sporcuyu içerir.
          </p>
        </div>
      </div>
      <footer>
        <span>
          <b>Athletic Labs</b>　|　Performans Bugünden, Başarı Yarın.
        </span>
        <span>
          Antrenör Raporu　|　{pageNumber} / {pageCount}
        </span>
      </footer>
    </article>
  );
}
