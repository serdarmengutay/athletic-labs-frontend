"use client";

import { UserRound } from "lucide-react";
import AppShell from "@/components/AppShell";

const fieldAccounts = [
  "serdar@athleticlabs.com",
  "selcuk@athleticlabs.com",
  "erhan@athleticlabs.com",
  "osman@athleticlabs.com",
  "huseyin@athleticlabs.com",
  "mustafa@athleticlabs.com",
  "cemal@athleticlabs.com",
];

export default function UsersPage() {
  return (
    <AppShell
      title="Kullanıcılar"
      subtitle="Saha testlerinde kullanılacak Athletic Labs giriş hesapları."
    >
      <div className="grid gap-6">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-lg font-semibold">Saha Hesapları</h2>
            <p className="mt-1 text-sm text-[#b8b8bd]">
              Bu ekran şu an tanımlı hesap listesini gösterir. Firebase’den canlı
              kullanıcı listelemek için backend Admin endpoint gerekir.
            </p>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {fieldAccounts.map((email) => (
              <div
                key={email}
                className="rounded-2xl border border-white/10 bg-[#091312] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#070e0e]">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{email}</p>
                    <p className="mt-1 text-xs text-[#b8b8bd]">Aktif saha hesabı</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </AppShell>
  );
}
