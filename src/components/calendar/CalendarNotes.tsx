"use client";

import { useState } from "react";
import { Check, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import {
  CalendarNote,
  CalendarNoteCategory,
  CalendarNoteChanges,
  NOTE_CATEGORIES,
} from "@/lib/calendarNotes";

const MAX_NOTE_LENGTH = 1000;

export interface NoteDraft {
  text: string;
  time: string;
  category: CalendarNoteCategory;
}

export function NoteComposer({
  initial,
  placeholder = "Not, görev veya program maddesi yazın...",
  submitLabel = "Ekle",
  autoFocus = false,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<NoteDraft>;
  autoFocus?: boolean;
  placeholder?: string;
  submitLabel?: string;
  /** false dönerse kayıt başarısız sayılır ve yazılan metin korunur. */
  onSubmit: (draft: NoteDraft) => boolean | void | Promise<boolean | void>;
  onCancel?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState(initial?.text ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [category, setCategory] = useState<CalendarNoteCategory>(
    initial?.category ?? "note"
  );

  const trimmed = text.trim();

  const submit = async () => {
    if (!trimmed || saving) return;
    setSaving(true);
    const result = await onSubmit({ text: trimmed, time, category });
    setSaving(false);
    if (result === false || initial) return;
    setText("");
    setTime("");
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="space-y-2 rounded-2xl border border-white/10 bg-[#070e0e] p-3"
    >
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
          }
          if (event.key === "Escape" && onCancel && !saving) onCancel();
        }}
        maxLength={MAX_NOTE_LENGTH}
        rows={2}
        autoFocus={autoFocus || Boolean(initial)}
        placeholder={placeholder}
        className="w-full resize-y rounded-xl border border-white/10 bg-[#091312] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#6f6f73] focus:border-[#e4fc55]/70"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {(Object.keys(NOTE_CATEGORIES) as CalendarNoteCategory[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            aria-pressed={category === key}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              category === key
                ? NOTE_CATEGORIES[key].className
                : "border-white/10 text-[#8f9996] hover:border-white/25 hover:text-white"
            }`}
          >
            {NOTE_CATEGORIES[key].label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#091312] px-2.5 py-1.5 text-xs text-[#b8b8bd]">
          <Clock className="h-3.5 w-3.5" />
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            aria-label="Saat (opsiyonel)"
            className="w-[5.5rem] bg-transparent text-white outline-none [color-scheme:dark]"
          />
        </label>
        <div className="ml-auto flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-[#b8b8bd] transition hover:text-white"
            >
              Vazgeç
            </button>
          )}
          <button
            type="submit"
            disabled={!trimmed || saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#e4fc55] px-3 py-2 text-xs font-bold text-[#070e0e] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#6f6f73]"
          >
            {initial ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {saving ? "Kaydediliyor..." : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

const getAuthorLabel = (note: CalendarNote) => {
  const author = note.createdByEmail?.split("@")[0];
  if (!author) return undefined;
  const editor = note.updatedByEmail?.split("@")[0];
  return editor && editor !== author
    ? `${author} ekledi · ${editor} düzenledi`
    : `${author} ekledi`;
};

export function NoteItem({
  note,
  onUpdate,
  onDelete,
}: {
  note: CalendarNote;
  onUpdate: (
    id: string,
    changes: CalendarNoteChanges
  ) => boolean | void | Promise<boolean | void>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const category = NOTE_CATEGORIES[note.category];
  const authorLabel = getAuthorLabel(note);

  if (editing) {
    return (
      <NoteComposer
        initial={{ text: note.text, time: note.time ?? "", category: note.category }}
        submitLabel="Kaydet"
        onSubmit={async (draft) => {
          const saved = await onUpdate(note.id, draft);
          if (saved !== false) setEditing(false);
          return saved;
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
      <button
        type="button"
        onClick={() => onUpdate(note.id, { done: !note.done })}
        aria-label={note.done ? "Tamamlanmadı olarak işaretle" : "Tamamlandı olarak işaretle"}
        className={`mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-md border transition ${
          note.done
            ? "border-[#e4fc55] bg-[#e4fc55] text-[#070e0e]"
            : "border-white/25 hover:border-[#e4fc55]"
        }`}
      >
        {note.done && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`whitespace-pre-wrap break-words text-sm ${
            note.done ? "text-[#6f6f73] line-through" : "text-white"
          }`}
        >
          {note.text}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={`rounded-full border px-2 py-0.5 ${category.className}`}>
            {category.label}
          </span>
          {note.time && (
            <span className="inline-flex items-center gap-1 text-[#b8b8bd]">
              <Clock className="h-3 w-3" />
              {note.time}
            </span>
          )}
          {authorLabel && <span className="text-[#8f9996]">{authorLabel}</span>}
        </div>
      </div>
      <div className="flex flex-none items-center gap-0.5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg p-1.5 text-[#8f9996] transition hover:bg-white/10 hover:text-white"
          aria-label="Notu düzenle"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Bu not ekipteki herkes için silinsin mi?")) {
              onDelete(note.id);
            }
          }}
          className="rounded-lg p-1.5 text-[#8f9996] transition hover:bg-rose-400/10 hover:text-rose-200"
          aria-label="Notu sil"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function AddNoteToggle({
  label,
  placeholder,
  onSubmit,
}: {
  label: string;
  placeholder?: string;
  onSubmit: (draft: NoteDraft) => boolean | void | Promise<boolean | void>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 px-3 py-2 text-xs font-semibold text-[#b8b8bd] transition hover:border-[#e4fc55]/50 hover:text-[#e4fc55]"
      >
        <Plus className="h-3.5 w-3.5" />
        {label}
      </button>
    );
  }

  return (
    <NoteComposer
      autoFocus
      placeholder={placeholder}
      onSubmit={async (draft) => {
        const saved = await onSubmit(draft);
        if (saved !== false) setOpen(false);
        return saved;
      }}
      onCancel={() => setOpen(false)}
    />
  );
}
