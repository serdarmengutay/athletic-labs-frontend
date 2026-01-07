"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, LogIn, AlertCircle } from "lucide-react";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("Login isteği gönderiliyor:", formData);

      const response = await authApi.coachLogin(
        formData.email,
        formData.password
      );

      console.log("Login yanıtı:", response.data);

      // Response yapısını kontrol et
      if (response.data && response.data.success && response.data.data) {
        // Token'ı localStorage'a kaydet
        localStorage.setItem("authToken", response.data.data.token);

        // Antrenör bilgilerini kaydet
        localStorage.setItem(
          "coachData",
          JSON.stringify(response.data.data.coach)
        );

        console.log("Token kaydedildi:", response.data.data.token);
        console.log("Antrenör bilgileri kaydedildi:", response.data.data.coach);

        // İstasyon sayfasına yönlendir
        // MVP: Station yerine data-entry sayfasına yönlendir
        // const stationId =
        //   response.data.data.coach.assigned_stations?.[0] || "ffmi-station";

        console.log("Yönlendiriliyor: /data-entry");
        router.push("/data-entry");
      } else {
        throw new Error("Geçersiz yanıt formatı");
      }
    } catch (err: any) {
      console.error("Login hatası:", err);

      let errorMessage = "Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.";

      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.response?.status === 401) {
        errorMessage = "E-posta veya şifre hatalı";
      } else if (err?.response?.status === 500) {
        errorMessage = "Sunucu hatası. Lütfen daha sonra tekrar deneyin";
      } else if (err?.code === "ECONNREFUSED") {
        errorMessage = "Sunucuya bağlanılamıyor. Backend çalışıyor mu?";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Antrenör Girişi
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            İstasyon paneline erişmek için giriş yapın
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                E-posta Adresi
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Antrenör@example.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Şifre
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Şifrenizi girin"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Giriş Yap
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </form>

        {/* Demo Hesaplar */}
        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Demo Hesaplar
          </h3>
          <div className="space-y-2 text-xs text-gray-600">
            <div>
              <strong>FFMI İstasyonu:</strong> ffmi@demo.com / demo123
            </div>
            <div>
              <strong>Sprint İstasyonu:</strong> sprint@demo.com / demo123
            </div>
            <div>
              <strong>Yönetici:</strong> admin@demo.com / admin123
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setFormData({ email: "ffmi@demo.com", password: "demo123" });
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              FFMI hesabını doldur
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
