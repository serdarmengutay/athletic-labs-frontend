"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardList,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Oturum Oluştur", href: "/", icon: ClipboardList },
  { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { label: "Test Girişi", href: "/test-data-entry", icon: Activity },
  { label: "Scouting", href: "/scouting", icon: ShieldCheck },
  { label: "Kullanıcılar", href: "/users", icon: Users },
  { label: "Takvim", href: "/test-session", icon: CalendarDays },
];

export default function AppShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#070e0e] text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-[#070e0e]/95 lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#e4fc55]/40 bg-[#e4fc55]/10 text-[#e4fc55]">
            AL
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-[#e4fc55]">
              ATHLETIC
            </p>
            <p className="text-lg font-bold leading-none">LABS</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-white/10 text-[#e4fc55] shadow-[inset_3px_0_0_#e4fc55]"
                    : "text-[#b8b8bd] hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-white/10 p-4">
          <button className="flex w-full items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-left text-sm text-[#b8b8bd] transition hover:bg-white/5 hover:text-white">
            <Settings className="h-5 w-5" />
            Ayarlar
          </button>
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#070e0e]">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {user?.email?.split("@")[0] || "Athletic Labs"}
              </p>
              <p className="truncate text-xs text-[#b8b8bd]">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-[#b8b8bd] hover:bg-white/10 hover:text-white"
              aria-label="Çıkış yap"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070e0e]/86 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#e4fc55]">
                Athletic Labs
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-[#b8b8bd]">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2">{action}</div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
