import { CalendarDays, Users, Shield, ScanLine, Info } from "lucide-react";
import type { SessionReportResponse } from "@/types/report";
import { getAthleteReportData } from "@/utils/reportExport";
import styles from "./CoachReport.module.css";
import {
  calculateCoachReportAverages,
  formatCoachAverage,
  type CoachAverage,
} from "@/utils/coachReportSummary";

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

export type CoachReportPageKind = "measurements" | "health" | "averages";

// Ölçüm ve büyük QR sayfalarını seçilen grubun ortak ortalama sayfası izler.
export function buildCoachReportPages(rows: CoachReportRow[]) {
  const pages: {
    kind: CoachReportPageKind;
    rows: CoachReportRow[];
    startIndex: number;
  }[] = [];
  for (const kind of ["measurements", "health"] as const) {
    for (
      let startIndex = 0;
      startIndex < rows.length;
      startIndex += COACH_REPORT_PAGE_SIZE
    ) {
      pages.push({
        kind,
        rows: rows.slice(startIndex, startIndex + COACH_REPORT_PAGE_SIZE),
        startIndex,
      });
    }
  }
  if (rows.length) pages.push({ kind: "averages", rows: [], startIndex: 0 });
  return pages;
}

interface CoachReportProps {
  session: SessionReportResponse;
  rows: CoachReportRow[];
  allRows: CoachReportRow[];
  groupName: string;
  pageNumber: number;
  pageCount: number;
  qrImages: Record<string, string>;
  pageKind: CoachReportPageKind;
  startIndex: number;
}

// Ortak marka başlığı altında ölçüm, tarama ve takım ortalaması sayfaları oluşturulur.
export default function CoachReport({
  session,
  rows,
  allRows,
  groupName,
  pageNumber,
  pageCount,
  qrImages,
  pageKind,
  startIndex,
}: CoachReportProps) {
  const performanceColumns = getCoachReportColumns(allRows, "performanceRows");
  const physicalColumns = getCoachReportColumns(allRows, "physicalRows");
  // Ortalama satırı sayfa dilimine değil, rapora seçilen tüm sporculara dayanır.
  const averages = calculateCoachReportAverages(allRows);
  const averageOf = (items: CoachAverage[], label: string) => {
    const item = items.find((entry) => entry.label === label);
    return item ? formatCoachAverage(item) : "-";
  };
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
          <h1>
            {pageKind === "averages"
              ? "Takım Ortalaması"
              : "Takım Genel Raporu"}
          </h1>
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
      {pageKind === "measurements" && (
        <>
          <section>
            <table className={styles.performance}>
              <colgroup>
                <col style={{ width: 40 }} />
                <col style={{ width: 185 }} />
                <col style={{ width: 65 }} />
                {performanceColumns.map((column) => (
                  <col
                    key={column.label}
                    style={
                      column.label === "Yorgunluk Endeksi"
                        ? { width: 92 }
                        : undefined
                    }
                  />
                ))}
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
                  <th>Genel Performans</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.athlete.athleteId}>
                    <td>{startIndex + index + 1}</td>
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
                          <div
                            className={
                              column.label === "Yorgunluk Endeksi"
                                ? `${styles.metric} ${styles.fatigueMetric}`
                                : styles.metric
                            }
                          >
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
              <tfoot>
                <tr className={styles.averageRow}>
                  <td colSpan={3} className={styles.name}>
                    Takım Ortalaması
                  </td>
                  {performanceColumns.map((column) => (
                    <td key={column.label}>
                      {averageOf(averages.performance, column.label)}
                    </td>
                  ))}
                  <td>{formatCoachAverage(averages.overall)}</td>
                </tr>
              </tfoot>
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
                <tfoot>
                  <tr className={styles.averageRow}>
                    <td className={styles.name}>Takım Ortalaması</td>
                    {physicalColumns.map((column) => (
                      <td key={column.label}>
                        {averageOf(averages.physical, column.label)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </section>
          )}
        </>
      )}
      {pageKind === "health" && (
        <HealthScreeningTable
          rows={rows}
          startIndex={startIndex}
          qrImages={qrImages}
        />
      )}
      {pageKind === "averages" && (
        <TeamAverages rows={allRows} averages={averages} />
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
            <span className={styles.noteTitle}>Sağlık ve Genetik Tarama</span>
            <p>
              Büyük QR kodları ayrı tarama sayfalarında yer alır ve karnedeki
              cihaz raporunu açar.
            </p>
          </span>
        </div>
        <div className={styles.info}>
          <Info />
          <p>
            Tabloların altındaki ortalama satırı ve son sayfa, rapora seçilen{" "}
            {allRows.length} sporcuyu kapsar. Eksik ölçümler ortalamaya dahil
            edilmez.
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

// Dört satırlı iki tablo, her sporcuya adıyla eşleşen büyük ve tıklanabilir QR ayırır.
function HealthScreeningTable({
  rows,
  startIndex,
  qrImages,
}: Pick<CoachReportProps, "rows" | "startIndex" | "qrImages">) {
  return (
    <section className={styles.healthSection}>
      <h2>Sağlık ve Genetik Tarama</h2>
      <p>
        Sporcunun karnesinde yer alan cihaz raporu için karşısındaki QR kodunu
        okutun veya QR koduna tıklayın.
      </p>
      <div className={styles.healthTables}>
        {[rows.slice(0, 4), rows.slice(4, 8)]
          .filter((group) => group.length > 0)
          .map((group, groupIndex) => (
            <table className={styles.healthTable} key={groupIndex}>
              <colgroup>
                <col style={{ width: 44 }} />
                <col />
                <col style={{ width: 76 }} />
                <col style={{ width: 220 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th className={styles.name}>Sporcu Adı</th>
                  <th>Doğum Yılı</th>
                  <th>Tarama QR</th>
                </tr>
              </thead>
              <tbody>
                {group.map((row, index) => (
                  <tr key={row.athlete.athleteId}>
                    <td>{startIndex + groupIndex * 4 + index + 1}</td>
                    <td className={styles.name}>{row.athlete.fullName}</td>
                    <td>{row.athlete.birthYear || "-"}</td>
                    <td>
                      {qrImages[row.athlete.athleteId] ? (
                        <a href={row.athlete.youjiSummary?.deviceReportUrl}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className={styles.qr}
                            src={qrImages[row.athlete.athleteId]}
                            alt={`${row.athlete.fullName} tarama QR`}
                          />
                        </a>
                      ) : (
                        <span className={styles.missing}>QR yok</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </div>
    </section>
  );
}

// Son sayfa, sayfa dilimlerinden bağımsız olarak seçili grubun tamamını özetler.
function TeamAverages({
  rows,
  averages,
}: {
  rows: CoachReportRow[];
  averages: ReturnType<typeof calculateCoachReportAverages>;
}) {
  return (
    <section className={styles.averageSection}>
      <div className={styles.averageOverview}>
        <div>
          <span>RAPORA SEÇİLEN GRUP</span>
          <strong>{rows.length} sporcu</strong>
          <p>
            Her ölçümün ortalaması, o ölçümü bulunan sporculardan hesaplanır.
          </p>
        </div>
        <div>
          <span>GENEL PERFORMANS ORTALAMASI</span>
          <strong>{formatCoachAverage(averages.overall)}</strong>
          <p>
            {averages.overall.count} sporcunun karnedeki yüzdelik dilim
            ortalaması
          </p>
        </div>
      </div>
      <AverageCards
        title="Performans Testleri · Takım Ortalaması"
        averages={averages.performance}
      />
      <AverageCards
        title="Fiziksel Ölçümler · Takım Ortalaması"
        averages={averages.physical}
      />
    </section>
  );
}

// Geçerli ölçüm sayısı, eksik verisi olan testlerin ortalamasını anlaşılır kılar.
function AverageCards({
  title,
  averages,
}: {
  title: string;
  averages: CoachAverage[];
}) {
  return (
    <div className={styles.averageGroup}>
      <h2>{title}</h2>
      {averages.length ? (
        <div className={styles.averageGrid}>
          {averages.map((item) => (
            <div className={styles.averageCard} key={item.label}>
              <span>{item.label}</span>
              <strong>{formatCoachAverage(item)}</strong>
              <small>{item.count} sporcunun ölçümü</small>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.missing}>
          Ortalama hesaplanabilecek ölçüm bulunamadı.
        </p>
      )}
    </div>
  );
}
