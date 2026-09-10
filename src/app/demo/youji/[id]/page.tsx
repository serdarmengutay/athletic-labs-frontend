"use client";

import { use } from "react";
import Image from "next/image";
import { Activity, CalendarDays, ShieldCheck, Users } from "lucide-react";
import {
  calculateDemoBodyComposition,
  getDemoYoujiReport,
} from "@/lib/demoYoujiReports";

// Tanıtım raporundaki QR kodları bu sayfayı açar; giriş istemeden örnek veri gösterilir.
export default function DemoYoujiReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const report = getDemoYoujiReport(id);

  if (!report) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070e0e] px-4 text-center text-white">
        <div className="max-w-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e4fc55]">
            Athletic Labs
          </p>
          <h1 className="mt-3 text-2xl font-bold">Örnek rapor bulunamadı</h1>
          <p className="mt-3 text-sm leading-6 text-[#b8b8bd]">
            Bu bağlantı bir tanıtım örneğine aittir. QR kodu antrenör raporundaki
            haliyle okutulduğunda ilgili örnek sporcunun verisi açılır.
          </p>
        </div>
      </main>
    );
  }

  const composition = calculateDemoBodyComposition(report);
  const measurementDate = new Date(report.measurementDate).toLocaleDateString(
    "tr-TR",
    { day: "numeric", month: "long", year: "numeric" },
  );

  const rows = [
    { label: "Boy", value: `${report.height} cm` },
    { label: "Kilo", value: `${report.weight.toFixed(1)} kg` },
    { label: "Vücut Kitle İndeksi", value: report.bmi.toFixed(1) },
    { label: "FFMI", value: report.ffmi.toFixed(1) },
    { label: "Yağ Oranı", value: `% ${report.bodyFatPercent.toFixed(1)}` },
    { label: "Yağ Kütlesi", value: `${composition.fatMass.toFixed(1)} kg` },
    { label: "Yağsız Kütle", value: `${composition.leanMass.toFixed(1)} kg` },
    { label: "Kas Kütlesi", value: `${composition.muscleMass.toFixed(1)} kg` },
    { label: "Vücut Suyu", value: `${composition.bodyWater.toFixed(1)} kg` },
    { label: "Protein", value: `${report.proteinAmount.toFixed(1)} kg` },
    { label: "Mineral", value: `${report.mineralAmount.toFixed(1)} kg` },
    {
      label: "Bazal Metabolizma",
      value: `${composition.basalMetabolicRate} kcal`,
    },
  ];

  return (
    <main className="min-h-screen bg-[#070e0e] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="flex items-center gap-3">
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
            <h1 className="text-2xl font-bold tracking-tight">
              Örnek Youji Health Verisi
            </h1>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#e4fc55]/30 bg-[#e4fc55]/10 px-4 py-3 text-sm leading-6 text-[#e9f7b0]">
          Bu sayfa tanıtım amaçlı bir örnektir. Gösterilen sporcu ve ölçümler
          kurgudur; gerçek kullanıcı verileri kullanılmamıştır.
        </div>

        <section className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:rounded-[28px] sm:p-7">
          <h2 className="text-xl font-bold">{report.fullName}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="shrink-0 text-[#e4fc55]" />
              <dt className="sr-only">Kulüp</dt>
              <dd className="text-[#d6d6d8]">{report.club}</dd>
            </div>
            <div className="flex items-center gap-3">
              <Users size={18} className="shrink-0 text-[#e4fc55]" />
              <dt className="sr-only">Grup</dt>
              <dd className="text-[#d6d6d8]">
                {report.group} · {report.birthYear} doğumlu
              </dd>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="shrink-0 text-[#e4fc55]" />
              <dt className="sr-only">Ölçüm tarihi</dt>
              <dd className="text-[#d6d6d8]">{measurementDate}</dd>
            </div>
          </dl>

          <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-5">
            <Activity size={18} className="text-[#e4fc55]" />
            <h3 className="text-base font-bold">Vücut Kompozisyonu</h3>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {rows.map((row) => (
              <div
                key={row.label}
                className="rounded-2xl border border-white/10 bg-[#091312] px-4 py-3"
              >
                <p className="text-xs font-semibold text-[#8f9698]">
                  {row.label}
                </p>
                <p className="mt-1 text-lg font-bold text-white">{row.value}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-[#6f7679]">
          Athletic Labs · Performans Bugünden, Başarı Yarın.
          <br />
          Gerçek ölçümlerde bu ekran sporcunun Youji Health cihaz raporunu
          gösterir.
        </p>
      </div>
    </main>
  );
}
