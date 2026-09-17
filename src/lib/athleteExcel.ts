import * as XLSX from "xlsx";

export interface ParsedAthleteRow {
  fullName: string;
  birthDate: string;
  birthYear?: number;
}

export const extractBirthYear = (birthDate: string): number | undefined => {
  const parts = birthDate.split(/[./-]/).filter(Boolean);
  const yearPart = parts.find((part) => part.length === 4) || parts.at(-1);
  const year = Number.parseInt(String(yearPart || ""), 10);
  return Number.isFinite(year) && year > 1900 ? year : undefined;
};

export const normalizeBirthDate = (birthDate: string): string | undefined => {
  const parts = birthDate.split(/[./-]/).filter(Boolean);
  if (parts.length !== 3) return undefined;
  const [day, month, year] = parts;
  if (year.length !== 4) return undefined;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

// Tarih biçimli Excel hücreleri seri numara olarak gelir (ör. 42370);
// yalnızca yıl yazılmış hücreler (ör. 2016) olduğu gibi kalır.
const cellToBirthDate = (value: unknown): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 1900 && value <= 2100) return String(value);
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y > 1900) {
      return `${String(parsed.d).padStart(2, "0")}.${String(parsed.m).padStart(
        2,
        "0"
      )}.${parsed.y}`;
    }
  }
  return String(value ?? "").trim();
};

// Excel'in "CSV UTF-8" çıktısı UTF-8, Türkçe Windows'taki düz CSV çıktısı
// Windows-1254 kodlamalıdır.
const decodeCsv = (buffer: ArrayBuffer): string => {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    text = new TextDecoder("windows-1254").decode(buffer);
  }
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
};

/** İlk sütun ad soyad, ikinci sütun doğum tarihi; ilk satır başlıktır. */
export const parseAthleteExcel = async (
  file: File
): Promise<ParsedAthleteRow[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = file.name.toLocaleLowerCase("en").endsWith(".csv")
    ? // CSV ham metin okunur: aksi halde Türkçe karakterler bozulur ve
      // 12.03.2016 gibi tarihler ay/gün sırası karışarak tarihe çevrilir.
      XLSX.read(decodeCsv(buffer), { type: "string", raw: true })
    : XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  return rows
    .slice(1)
    .filter((row) => Array.isArray(row) && row.length >= 2 && row[0])
    .map((row) => {
      const birthDate = cellToBirthDate(row[1]);
      return {
        fullName: String(row[0] ?? "").trim(),
        birthDate,
        birthYear: extractBirthYear(birthDate),
      };
    })
    .filter((athlete) => athlete.fullName);
};

export const getSessionGender = (sportType: string): "male" | "female" =>
  sportType.toLocaleLowerCase("tr").includes("kız") ? "female" : "male";

/** Aynı sporcunun oturuma ikinci kez eklenmesini önlemek için eşleştirme anahtarı. */
export const getAthleteMatchKey = (fullName: string, birthYear?: number) =>
  `${fullName.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim()}|${
    birthYear || ""
  }`;
