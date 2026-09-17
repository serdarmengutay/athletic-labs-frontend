"use client";

import { useCallback, useEffect, useState } from "react";

// Takvim notları ana veritabanına yazılmaz; ekibin planlama defteri olarak
// bu cihazın tarayıcısında tutulur. Yedek dosyasıyla başka cihaza taşınabilir.
const STORAGE_KEY = "athleticLabsCalendarNotes:v1";

export type CalendarNoteCategory = "note" | "task" | "logistics" | "important";

export interface CalendarNote {
  id: string;
  /** YYYY-MM-DD; oturum notlarında notun eklendiği günkü oturum tarihi. */
  dateKey: string;
  /** Doluysa not bu oturuma bağlıdır ve oturum tarihi değişse de onunla gider. */
  sessionId?: string;
  text: string;
  time?: string;
  category: CalendarNoteCategory;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CalendarNoteInput = Pick<
  CalendarNote,
  "dateKey" | "sessionId" | "text" | "time" | "category"
>;

export const NOTE_CATEGORIES: Record<
  CalendarNoteCategory,
  { label: string; className: string; dotClassName: string }
> = {
  note: {
    label: "Not",
    className: "border-white/15 bg-white/[0.06] text-[#d6d6d8]",
    dotClassName: "bg-[#d6d6d8]",
  },
  task: {
    label: "Görev",
    className: "border-[#e4fc55]/40 bg-[#e4fc55]/10 text-[#e4fc55]",
    dotClassName: "bg-[#e4fc55]",
  },
  logistics: {
    label: "Lojistik",
    className: "border-sky-300/30 bg-sky-300/10 text-sky-100",
    dotClassName: "bg-sky-300",
  },
  important: {
    label: "Önemli",
    className: "border-rose-300/30 bg-rose-300/10 text-rose-100",
    dotClassName: "bg-rose-300",
  },
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

const isCalendarNote = (value: unknown): value is CalendarNote => {
  if (!value || typeof value !== "object") return false;
  const note = value as Partial<CalendarNote>;
  return (
    typeof note.id === "string" &&
    typeof note.dateKey === "string" &&
    DATE_KEY_PATTERN.test(note.dateKey) &&
    typeof note.text === "string" &&
    typeof note.category === "string" &&
    note.category in NOTE_CATEGORIES &&
    (note.sessionId === undefined || typeof note.sessionId === "string") &&
    (note.time === undefined ||
      (typeof note.time === "string" && TIME_PATTERN.test(note.time)))
  );
};

const normalizeNotes = (value: unknown): CalendarNote[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(isCalendarNote).map((note) => ({
    ...note,
    done: Boolean(note.done),
    createdAt: note.createdAt || new Date().toISOString(),
    updatedAt: note.updatedAt || note.createdAt || new Date().toISOString(),
  }));
};

const readNotes = (): CalendarNote[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeNotes(JSON.parse(raw)) : [];
  } catch (error) {
    console.error("Takvim notları okunamadı:", error);
    return [];
  }
};

const writeNotes = (notes: CalendarNote[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error("Takvim notları kaydedilemedi:", error);
    alert("Not kaydedilemedi. Tarayıcı depolaması dolu veya kapalı olabilir.");
  }
};

const createId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const compareNotes = (first: CalendarNote, second: CalendarNote) => {
  const firstTime = first.time || "99:99";
  const secondTime = second.time || "99:99";
  if (firstTime !== secondTime) return firstTime.localeCompare(secondTime);
  return first.createdAt.localeCompare(second.createdAt);
};

export function useCalendarNotes() {
  const [notes, setNotes] = useState<CalendarNote[]>([]);

  useEffect(() => {
    setNotes(readNotes());
    // Aynı cihazda açık başka sekmedeki değişiklikleri de yansıt.
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setNotes(readNotes());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const update = useCallback(
    (updater: (current: CalendarNote[]) => CalendarNote[]) => {
      const next = updater(readNotes());
      writeNotes(next);
      setNotes(next);
    },
    []
  );

  const addNote = useCallback(
    (input: CalendarNoteInput) => {
      const now = new Date().toISOString();
      update((current) => [
        ...current,
        {
          id: createId(),
          dateKey: input.dateKey,
          sessionId: input.sessionId || undefined,
          text: input.text.trim(),
          time: input.time || undefined,
          category: input.category,
          done: false,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    },
    [update]
  );

  const updateNote = useCallback(
    (
      id: string,
      changes: Partial<Pick<CalendarNote, "text" | "time" | "category" | "done">>
    ) => {
      update((current) =>
        current.map((note) =>
          note.id === id
            ? {
                ...note,
                ...changes,
                text: (changes.text ?? note.text).trim(),
                time:
                  changes.time !== undefined
                    ? changes.time || undefined
                    : note.time,
                updatedAt: new Date().toISOString(),
              }
            : note
        )
      );
    },
    [update]
  );

  const deleteNote = useCallback(
    (id: string) => {
      update((current) => current.filter((note) => note.id !== id));
    },
    [update]
  );

  /**
   * Yedek dosyasındaki notları birleştirir; aynı not varsa güncel olanı tutar.
   * Eklenen veya güncellenen not sayısını döndürür.
   */
  const importNotes = useCallback(
    (value: unknown): number => {
      const payload =
        value && typeof value === "object" && "notes" in value
          ? (value as { notes: unknown }).notes
          : value;
      const incoming = normalizeNotes(payload);
      if (incoming.length === 0) return 0;
      let changed = 0;
      update((current) => {
        const byId = new Map(current.map((note) => [note.id, note]));
        incoming.forEach((note) => {
          const existing = byId.get(note.id);
          if (!existing || existing.updatedAt < note.updatedAt) {
            byId.set(note.id, note);
            changed += 1;
          }
        });
        return [...byId.values()];
      });
      return changed;
    },
    [update]
  );

  return { notes, addNote, updateNote, deleteNote, importNotes };
}
