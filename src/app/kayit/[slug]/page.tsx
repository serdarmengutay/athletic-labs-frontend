"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AxiosError } from "axios";
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import Image from "next/image";
import { publicRegistrationApi } from "@/lib/api";

type FormState = {
  fullName: string;
  birthDate: string;
  parentPhone: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialFormState: FormState = {
  fullName: "",
  birthDate: "",
  parentPhone: "",
};

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeTurkishMobileDigits(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("90")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

function formatTurkishMobileDigits(value: string): string {
  const digits = normalizeTurkishMobileDigits(value);
  const parts = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 8),
    digits.slice(8, 10),
  ].filter(Boolean);
  return parts.join(" ");
}

function toE164TurkeyMobile(value: string): string {
  const digits = normalizeTurkishMobileDigits(value);
  return digits.length === 10 ? `+90${digits}` : value.trim();
}

function isValidTurkeyMobileDigits(value: string): boolean {
  return /^5\d{9}$/.test(normalizeTurkishMobileDigits(value));
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const fullName = normalizeWhitespace(form.fullName);
  const today = getTodayIsoDate();

  if (!fullName) {
    errors.fullName = "Lütfen sporcu ad soyad bilgisini giriniz.";
  } else if (fullName.split(" ").filter(Boolean).length < 2) {
    errors.fullName = "Lütfen ad ve soyad bilgisini birlikte giriniz.";
  }

  if (!form.birthDate) {
    errors.birthDate = "Lütfen tam doğum tarihini giriniz.";
  } else if (form.birthDate > today) {
    errors.birthDate = "Doğum tarihi gelecek bir tarih olamaz.";
  }

  if (!normalizeTurkishMobileDigits(form.parentPhone)) {
    errors.parentPhone = "Lütfen veli telefon numarasını giriniz.";
  } else if (!isValidTurkeyMobileDigits(form.parentPhone)) {
    errors.parentPhone = "Lütfen geçerli bir numara giriniz.";
  }

  return errors;
}

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;

  if (axiosError.response?.status === 409) {
    return "Bu kişi için bu test listesinde daha önce kayıt oluşturulmuştur.";
  }

  return (
    axiosError.response?.data?.message ||
    "Kayıt oluşturulamadı. Lütfen bilgileri kontrol edip tekrar deneyin."
  );
}

export default function PublicRegistrationPage() {
  const params = useParams<{ slug: string }>();
  const rawSlug = params?.slug;
  const testSessionSlug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const today = useMemo(() => getTodayIsoDate(), []);

  const updateField = (field: keyof FormState, value: string) => {
    const nextValue =
      field === "parentPhone" ? formatTurkishMobileDigits(value) : value;
    setForm((current) => ({ ...current, [field]: nextValue }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    setSubmitError("");
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0 || !testSessionSlug) {
      return;
    }

    const payload = {
      fullName: normalizeWhitespace(form.fullName),
      birthDate: form.birthDate,
      parentPhone: toE164TurkeyMobile(form.parentPhone),
    };

    setSubmitting(true);
    try {
      await publicRegistrationApi.registerAthlete(testSessionSlug, payload);
      setSuccessMessage(
        "Kaydınız alınmıştır. Athletic Labs ekibi test günü kayıt bilgilerinizi bu liste üzerinden görecektir."
      );
      setForm(initialFormState);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070e0e] px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-xl flex-col justify-center sm:min-h-[calc(100vh-4rem)]">
        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          <Image
            src="/athleticlabs_logo.png"
            alt="Athletic Labs"
            width={48}
            height={48}
            className="rounded-full object-cover"
            priority
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e4fc55]">
              Athletic Labs
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Test Ön Kaydı
            </h1>
          </div>
        </div>

        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl sm:rounded-[28px] sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">
              Sporcu Bilgileri
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#b8b8bd]">
              Test listesine eklenebilmek için aşağıdaki bilgileri doldurun.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <label className="block">
              <span className="text-sm font-semibold text-[#d6d6d8]">
                Sporcu Adı Soyadı
              </span>
              <input
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                type="text"
                autoComplete="name"
                placeholder="Adı Soyadı"
                className="mt-2 block w-full min-w-0 max-w-full rounded-2xl border border-white/10 !bg-[#091312] px-4 py-4 text-base !text-white outline-none transition placeholder:!text-[#6f6f73] focus:border-[#e4fc55]/80"
                aria-invalid={Boolean(errors.fullName)}
              />
              {errors.fullName && (
                <p className="mt-2 text-sm font-medium text-[#c03744]">
                  {errors.fullName}
                </p>
              )}
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#d6d6d8]">
                Doğum Tarihi
              </span>
              <div className="mt-2 w-full max-w-full overflow-hidden rounded-2xl border border-white/10 bg-[#091312] transition focus-within:border-[#e4fc55]/80">
                <input
                  value={form.birthDate}
                  onChange={(event) =>
                    updateField("birthDate", event.target.value)
                  }
                  type="date"
                  max={today}
                  className="block h-[58px] w-full min-w-0 max-w-full appearance-none border-0 !bg-[#091312] px-4 py-0 text-base leading-none !text-white outline-none [color-scheme:dark]"
                  aria-invalid={Boolean(errors.birthDate)}
                />
              </div>
              {errors.birthDate && (
                <p className="mt-2 text-sm font-medium text-[#c03744]">
                  {errors.birthDate}
                </p>
              )}
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#d6d6d8]">
                Veli Telefon Numarası
              </span>
              <div className="mt-2 flex overflow-hidden rounded-2xl border border-white/10 bg-[#091312] transition focus-within:border-[#e4fc55]/80">
                <div className="flex items-center border-r border-white/10 px-4 text-base font-semibold text-[#e4fc55]">
                  +90
                </div>
                <input
                  value={form.parentPhone}
                  onChange={(event) =>
                    updateField("parentPhone", event.target.value)
                  }
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="5XX XXX XX XX"
                  className="min-w-0 flex-1 border-0 !bg-[#091312] px-4 py-4 text-base !text-white outline-none placeholder:!text-[#6f6f73]"
                  aria-invalid={Boolean(errors.parentPhone)}
                />
              </div>
              <p className="mt-2 text-xs text-[#8f9996]">
                Başında 0 olmadan Türkiye mobil numarasını giriniz.
              </p>
              {errors.parentPhone && (
                <p className="mt-2 text-sm font-medium text-[#c03744]">
                  {errors.parentPhone}
                </p>
              )}
            </label>

            {submitError && (
              <div
                role="alert"
                className="flex gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 flex-none" />
                <span>{submitError}</span>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="flex gap-3 rounded-2xl border border-[#e4fc55]/30 bg-[#e4fc55]/10 px-4 py-3 text-sm font-semibold text-[#e4fc55]"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e4fc55] px-5 py-4 text-sm font-bold text-[#070e0e] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#6f6f73]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Kaydediliyor
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Kaydol
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
