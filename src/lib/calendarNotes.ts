"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calendarNoteApi,
  CalendarNotePayload,
  CalendarNoteResponse,
} from "./api";

// Takvim notları ekipçe ortaktır ve backend'de saklanır. Başkalarının
// değişiklikleri sekmeye dönüldüğünde ve dakikada bir yenilenerek görünür.
const REFRESH_INTERVAL_MS = 60_000;

export type CalendarNoteCategory = CalendarNoteResponse["category"];

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
  createdByEmail?: string;
  updatedByEmail?: string;
}

export type CalendarNoteInput = Pick<
  CalendarNote,
  "dateKey" | "sessionId" | "text" | "time" | "category"
>;

export type CalendarNoteChanges = Partial<
  Pick<CalendarNote, "text" | "time" | "category" | "done">
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

const fromResponse = (note: CalendarNoteResponse): CalendarNote => ({
  id: note.id,
  dateKey: note.noteDate,
  sessionId: note.testSessionId || undefined,
  text: note.text,
  time: note.noteTime || undefined,
  category: note.category in NOTE_CATEGORIES ? note.category : "note",
  done: note.isDone,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
  createdByEmail: note.createdByEmail || undefined,
  updatedByEmail: note.updatedByEmail || undefined,
});

const toPayload = (changes: CalendarNoteChanges): CalendarNotePayload => {
  const payload: CalendarNotePayload = {};
  if (changes.text !== undefined) payload.text = changes.text.trim();
  if (changes.time !== undefined) payload.noteTime = changes.time || null;
  if (changes.category !== undefined) payload.category = changes.category;
  if (changes.done !== undefined) payload.isDone = changes.done;
  return payload;
};

const getStatus = (error: unknown) =>
  (error as { response?: { status?: number } })?.response?.status;

export const compareNotes = (first: CalendarNote, second: CalendarNote) => {
  const firstTime = first.time || "99:99";
  const secondTime = second.time || "99:99";
  if (firstTime !== secondTime) return firstTime.localeCompare(secondTime);
  return first.createdAt.localeCompare(second.createdAt);
};

export function useCalendarNotes() {
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const notesRef = useRef<CalendarNote[]>([]);
  // Yenileme bir değişiklikle yarışırsa ekrandaki güncel hâli ezmesin.
  const mutationsInFlight = useRef(0);
  const mutationVersion = useRef(0);

  const applyNotes = useCallback(
    (updater: (current: CalendarNote[]) => CalendarNote[]) => {
      setNotes((current) => {
        const next = updater(current);
        notesRef.current = next;
        return next;
      });
    },
    []
  );

  const refresh = useCallback(async () => {
    const versionAtStart = mutationVersion.current;
    try {
      const response = await calendarNoteApi.getAll();
      if (
        mutationsInFlight.current > 0 ||
        versionAtStart !== mutationVersion.current
      ) {
        return;
      }
      const serverNotes = (response.data?.data || []).map(fromResponse);
      applyNotes(() => serverNotes);
      setLoadError(false);
    } catch (error) {
      console.error("Takvim notları yüklenemedi:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [applyNotes]);

  useEffect(() => {
    refresh();
    const handleFocus = () => refresh();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  const runMutation = useCallback(async <T,>(task: () => Promise<T>) => {
    mutationsInFlight.current += 1;
    mutationVersion.current += 1;
    try {
      return await task();
    } finally {
      mutationsInFlight.current -= 1;
    }
  }, []);

  /** Kayıt başarılıysa true döner; form ancak o zaman temizlenir. */
  const addNote = useCallback(
    (input: CalendarNoteInput) =>
      runMutation(async () => {
        try {
          const response = await calendarNoteApi.create({
            noteDate: input.dateKey,
            noteTime: input.time || null,
            testSessionId: input.sessionId || null,
            text: input.text.trim(),
            category: input.category,
          });
          const saved = fromResponse(response.data.data);
          applyNotes((current) => [...current, saved]);
          return true;
        } catch (error) {
          console.error("Takvim notu kaydedilemedi:", error);
          alert("Not kaydedilemedi. Bağlantıyı kontrol edip tekrar deneyin.");
          return false;
        }
      }),
    [applyNotes, runMutation]
  );

  /** Kayıt başarılıysa true döner; düzenleme formu ancak o zaman kapanır. */
  const updateNote = useCallback(
    (id: string, changes: CalendarNoteChanges) =>
      runMutation(async () => {
        const previous = notesRef.current.find((note) => note.id === id);
        if (!previous) return false;

        applyNotes((current) =>
          current.map((note) =>
            note.id === id
              ? {
                  ...note,
                  ...changes,
                  text: (changes.text ?? note.text).trim(),
                  time:
                    changes.time !== undefined ? changes.time || undefined : note.time,
                }
              : note
          )
        );
        try {
          const response = await calendarNoteApi.update(id, toPayload(changes));
          const saved = fromResponse(response.data.data);
          applyNotes((current) =>
            current.map((note) => (note.id === id ? saved : note))
          );
          return true;
        } catch (error) {
          console.error("Takvim notu güncellenemedi:", error);
          if (getStatus(error) === 404) {
            applyNotes((current) => current.filter((note) => note.id !== id));
            alert("Bu not başka bir ekip üyesi tarafından silinmiş.");
            return true;
          }
          applyNotes((current) =>
            current.map((note) => (note.id === id ? previous : note))
          );
          alert("Not güncellenemedi. Bağlantıyı kontrol edip tekrar deneyin.");
          return false;
        }
      }),
    [applyNotes, runMutation]
  );

  const deleteNote = useCallback(
    (id: string) =>
      runMutation(async () => {
        const previous = notesRef.current.find((note) => note.id === id);
        if (!previous) return;

        applyNotes((current) => current.filter((note) => note.id !== id));
        try {
          await calendarNoteApi.delete(id);
        } catch (error) {
          // Başka biri zaten sildiyse sonuç aynı.
          if (getStatus(error) === 404) return;
          console.error("Takvim notu silinemedi:", error);
          applyNotes((current) =>
            current.some((note) => note.id === id) ? current : [...current, previous]
          );
          alert("Not silinemedi. Bağlantıyı kontrol edip tekrar deneyin.");
        }
      }),
    [applyNotes, runMutation]
  );

  return { notes, loading, loadError, refresh, addNote, updateNote, deleteNote };
}
