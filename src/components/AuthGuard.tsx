"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const PUBLIC_ROUTES = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (loading) return;

    if (!user && !isPublicRoute) {
      // Unauthenticated user trying to access protected route
      router.replace("/login");
    } else if (user && isPublicRoute) {
      // Authenticated user trying to access login page
      router.replace("/");
    }
  }, [user, loading, isPublicRoute, pathname, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Prevent rendering protected content for unauthenticated users
  if (!user && !isPublicRoute) {
    return null;
  }

  // Prevent rendering login page for authenticated users
  if (user && isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}
