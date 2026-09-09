/* eslint-disable @typescript-eslint/no-require-imports -- Node test yükleyicisi CommonJS kullanır. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Projedeki TypeScript yardımcıları ek bir test bağımlılığı olmadan yüklenir.
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return originalResolve.call(
    this,
    request.startsWith("@/")
      ? path.resolve(__dirname, "../src", request.slice(2))
      : request,
    ...args,
  );
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    const { outputText } = ts.transpileModule(
      fs.readFileSync(filename, "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
          target: ts.ScriptTarget.ES2020,
        },
        fileName: filename,
      },
    );
    module._compile(outputText, filename);
  };
}
require.extensions[".css"] = (module) => {
  module.exports = {};
};
const { getAthleteReportData } = require("../src/utils/reportExport.tsx");
const { selectCoachReports } = require("../src/utils/coachReportExport.tsx");
const {
  buildCoachReportRows,
  getCoachReportColumns,
} = require("../src/components/CoachReport.tsx");
const metric = (value, score = 75) => ({
  value,
  score,
  percentile: 25,
  target: null,
});
const athlete = (id) => ({
  athleteId: id,
  fullName: `Sporcu ${id}`,
  birthYear: 2010,
  measurements: {
    height: 165,
    weight: 56,
    sprint30m: 5,
    sprint30mSecond: 4,
    flexibility: -2,
    passCount: 0,
    handgrip: 23,
  },
  metrics: {
    sprint1: metric(5),
    sprint2: metric(4),
    agility: metric(8),
    flexibility: metric(-2),
    verticalJump: metric(30),
    passCount: metric(0),
    bmi: metric(null),
    fatigueIndex: metric(25),
  },
  overallPerformance: 82.3,
  youjiSummary: { deviceReportUrl: `https://example.com/${id}`, reportId: id },
});
const session = {
  testSessionId: "test",
  clubName: "Test",
  reportGeneratedAt: "2026-09-09",
  athletes: [athlete("a"), athlete("b"), athlete("c")],
};

test("seçilen kimlikler dışındaki sporcular ve QR hedefleri çıktıya alınmaz", () => {
  const selected = selectCoachReports(session, ["c", "a", "a"]);
  assert.deepEqual(
    selected.athletes.map((row) => row.athleteId),
    ["a", "c"],
  );
  assert.deepEqual(
    selected.athletes.map((row) => row.youjiSummary.deviceReportUrl),
    ["https://example.com/a", "https://example.com/c"],
  );
  assert.equal(session.athletes.length, 3);
});
test("boş seçim ve sunucuda bulunmayan karne sessizce dışa aktarılmaz", () => {
  assert.throws(() => selectCoachReports(session, []), /En az bir/);
  assert.throws(
    () => selectCoachReports(session, ["a", "missing"]),
    /1 seçili/,
  );
});
test("antrenör raporu karnenin sprint sıralamasını ve genel performansını kullanır", () => {
  const data = getAthleteReportData(athlete("a"));
  assert.equal(data.sprint1, 4);
  assert.equal(data.sprint2, 5);
  assert.equal(data.overallPercentile, 82.3);
  const [row] = buildCoachReportRows({ ...session, athletes: [athlete("a")] });
  assert.deepEqual(row.performanceRows, data.performanceRows);
  assert.deepEqual(row.physicalRows, data.physicalRows);
  assert.deepEqual(row.radarData, data.radarData);
});
test("sıfır pas ve negatif esneklik eksik veri sayılmaz", () => {
  const data = getAthleteReportData(athlete("a"));
  assert.equal(
    data.performanceRows.find((row) => row.label === "Pas").rawValue,
    0,
  );
  assert.equal(
    data.performanceRows.find((row) => row.label === "Esneklik").rawValue,
    -2,
  );
});
test("kapalı testler ve VALD sıçrama alanı çıktıya eklenmez", () => {
  const data = getAthleteReportData(athlete("a"), true, [
    "sprint30m",
    "verticalJump",
  ]);
  assert.deepEqual(
    data.performanceRows.map((row) => row.label),
    ["30m Koşu"],
  );
  assert.equal(data.physicalRows.length, 0);
});
test("sayfalar farklı eksik alanları olsa da aynı seçim sütunlarını paylaşır", () => {
  const missing = athlete("empty");
  missing.measurements = {};
  missing.metrics = Object.fromEntries(
    Object.keys(missing.metrics).map((key) => [key, metric(null, null)]),
  );
  missing.youjiSummary = undefined;
  const rows = buildCoachReportRows({
    ...session,
    athletes: [missing, athlete("a")],
  });
  assert.equal(rows[0].hasAnyMeasuredValue, false);
  assert.equal(
    getCoachReportColumns(rows, "performanceRows").some(
      (column) => column.label === "Handgrip",
    ),
    true,
  );
  assert.equal(rows[0].performanceRows.length, 0);
});

const {
  calculateCoachReportAverages,
  formatCoachAverage,
} = require("../src/utils/coachReportSummary.ts");
const { buildCoachReportPages } = require("../src/components/CoachReport.tsx");

test("takım ortalaması seçilen sporcuların ham değerlerini kullanır; eksikler sıfır sayılmaz", () => {
  const first = athlete("first");
  const second = athlete("second");
  second.measurements.passCount = 12;
  second.measurements.flexibility = 6;
  second.measurements.height = 180;
  second.measurements.weight = 80;
  first.overallPerformance = 0;
  second.overallPerformance = 100;
  const missing = athlete("missing");
  missing.measurements = {};
  missing.metrics = Object.fromEntries(
    Object.keys(missing.metrics).map((key) => [key, metric(null, null)]),
  );
  missing.youjiSummary = undefined;
  const selected = selectCoachReports(
    { ...session, athletes: [first, second, missing, athlete("unselected")] },
    ["first", "second", "missing"],
  );
  const averages = calculateCoachReportAverages(buildCoachReportRows(selected));
  assert.equal(
    averages.performance.find((item) => item.label === "Pas").value,
    6,
  );
  assert.equal(
    averages.performance.find((item) => item.label === "Pas").count,
    2,
  );
  assert.equal(
    averages.performance.find((item) => item.label === "Esneklik").value,
    2,
  );
  assert.equal(averages.overall.value, 50);
  assert.equal(averages.overall.count, 2);
  assert.equal(
    averages.physical.find((item) => item.label === "Boy").value,
    172.5,
  );
  assert.equal(
    averages.physical.find((item) => item.label === "VKI").value,
    (56 / 1.65 ** 2 + 80 / 1.8 ** 2) / 2,
  );
});

test("geçersiz değerler ortalama hesabına girmez ve kesirli pas ortalaması korunur", () => {
  const rows = buildCoachReportRows(session);
  rows.forEach((row, i) => {
    row.performanceRows = [{ label: "Pas", rawValue: [1, 2, NaN][i] }];
    row.physicalRows = [{ label: "Boy", rawValue: Infinity }];
    row.overallPercentile = NaN;
  });
  const averages = calculateCoachReportAverages(rows);
  assert.equal(formatCoachAverage(averages.performance[0]), "1.5 adet / 30 sn");
  assert.equal(averages.performance[0].count, 2);
  assert.equal(averages.physical[0].value, null);
  assert.equal(formatCoachAverage(averages.overall), "-");
});

test("rapor büyük QR sayfalarından sonra tüm grubun takım ortalamasıyla biter", () => {
  const rows = buildCoachReportRows({
    ...session,
    athletes: Array.from({ length: 60 }, (_, i) => athlete(String(i))),
  });
  const pages = buildCoachReportPages(rows);
  assert.equal(pages.length, 17);
  assert.equal(pages.at(-1).kind, "averages");
  for (const kind of ["measurements", "health"]) {
    const section = pages.filter((page) => page.kind === kind);
    assert.deepEqual(
      section.flatMap((page) => page.rows.map((row) => row.athlete.athleteId)),
      rows.map((row) => row.athlete.athleteId),
    );
    assert.equal(section.at(-1).startIndex, 56);
    assert.equal(section.at(-1).rows.length, 4);
  }
});

test("ölçüm tablolarının her sütunu için ortalama satırında bir karşılık vardır", () => {
  const rows = buildCoachReportRows(session);
  const averages = calculateCoachReportAverages(rows);
  for (const [kind, items] of [
    ["performanceRows", averages.performance],
    ["physicalRows", averages.physical],
  ]) {
    const labels = getCoachReportColumns(rows, kind).map(
      (column) => column.label,
    );
    assert.ok(labels.length > 0);
    assert.deepEqual(
      labels.filter((label) => !items.some((item) => item.label === label)),
      [],
    );
  }
});
