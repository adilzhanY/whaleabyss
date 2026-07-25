"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import Input from "@/components/Input";
import { stripNonLatin } from "@/lib/validators";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Отсутствует токен сброса пароля");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Отсутствует токен сброса пароля");
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Не удалось сбросить пароль");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/?login=true");
      }, 2000);
    } catch (err) {
      setError("Произошла ошибка. Попробуйте снова.");
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
        <Header onAuthOpen={() => {}} />
        <main className="mx-auto max-w-md px-4 pt-32 pb-8">
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Пароль изменён!
            </h1>
            <p className="text-slate-600 mb-4">
              Ваш пароль успешно изменён. Перенаправляем на страницу входа...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => {}} />
      <main className="mx-auto max-w-md px-4 pt-32 pb-8">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
            Создать новый пароль
          </h1>
          <p className="text-center text-slate-600 mb-6">
            Введите новый пароль для вашего аккаунта
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Новый пароль
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sanitize={stripNonLatin}
                  placeholder="Минимум 6 символов"
                  className="pr-12"
                  disabled={isLoading || !token}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Подтвердите пароль
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  sanitize={stripNonLatin}
                  placeholder="Повторите пароль"
                  className="pr-12"
                  disabled={isLoading || !token}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !token}
              className="btn-primary w-full !py-3"
            >
              {isLoading ? "Сохранение..." : "Сохранить новый пароль"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
        <Header onAuthOpen={() => {}} />
        <main className="mx-auto max-w-md px-4 pt-32 pb-8">
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
            <p className="text-slate-600">Загрузка...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
