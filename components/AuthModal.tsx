/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { X, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "login" | "register";

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>("login");
  const [show, setShow] = useState(false);
  const [animate, setAnimate] = useState(false);

  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // OTP states
  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      setTimeout(() => setAnimate(true), 10);
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    setError("");
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setStep("form");
    setOtpValues(Array(6).fill(""));
  }, [tab, isOpen]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (pastedData.length === 0) return;

    const newOtp = [...otpValues];
    pastedData.forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtpValues(newOtp);
    const nextIndex = Math.min(pastedData.length, 5);
    if (nextIndex < 6) {
      document.getElementById(`otp-${nextIndex}`)?.focus();
    } else {
      document.getElementById(`otp-5`)?.focus();
    }
  };

  const sendOtp = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка отправки кода");
      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (tab === "register") {
      if (step === "form") {
        if (password !== confirmPassword) {
          setError("Пароли не совпадают");
          return;
        }
        if (password.length < 6) {
          setError("Пароль должен быть не менее 6 символов");
          return;
        }
        await sendOtp();
      } else if (step === "otp") {
        const fullOtp = otpValues.join("");
        if (fullOtp.length < 6) return setError("Введите код полностью");
        setIsLoading(true);
        try {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password, otp: fullOtp }),
          });
          const data = await res.json();
          if (!res.ok) {
            triggerShake();
            throw new Error(data.error || "Неверный код");
          }

          const signInRes = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (signInRes?.error) {
            throw new Error(signInRes.error || "Ошибка при входе");
          }

          setStep("success");
          setOtpValues(Array(6).fill(""));
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      }
    } else {
      setIsLoading(true);
      try {
        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (res?.error) {
          throw new Error("Неверный email или пароль");
        }
        onClose();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${animate ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-md rounded-2xl p-8 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${animate ? "translate-y-0 scale-100 opacity-100" : "translate-y-8 scale-95 opacity-0"}`}
        style={{ backgroundColor: "var(--bg-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "var(--text-primary)" }}
          >
            {step === "success" ? "Успешно" : tab === "login" ? "Вход в аккаунт" : step === "otp" ? "Подтверждение Email" : "Регистрация"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5" style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {step === "form" && (
          <div
            className="mb-6 flex rounded-lg p-1"
            style={{ backgroundColor: "var(--bg-highlight)" }}
          >
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: tab === t ? "var(--bg-card)" : "transparent",
                  color: tab === t ? "var(--accent-primary)" : "var(--text-secondary)",
                  boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {t === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {t === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>
        )}

        {step === "success" ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-2">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-center" style={{ color: "var(--text-primary)" }}>
              Успешная регистрация!
            </h3>
            <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              Ваш аккаунт создан, и вы вошли в систему.
            </p>
            <button
              onClick={() => {
                onClose();
                window.location.reload();
              }}
              className="mt-6 w-full rounded-lg py-3 text-sm font-bold text-white transition-colors"
              style={{ backgroundColor: "var(--accent-primary)", borderRadius: "var(--btn-radius)" }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--accent-primary-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--accent-primary)"}
            >
              Продолжить покупки
            </button>
          </div>
        ) : tab === "register" && step === "otp" ? (
          <div className={`space-y-6 text-center transition-all duration-300 ${isShaking ? "animate-shake" : ""}`}>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Мы отправили код подтверждения на ваш email.</p>
            <div className="flex justify-center gap-2 mt-4">
              {otpValues.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={handleOtpPaste}
                  onFocus={(e) => e.target.select()}
                  className="w-10 sm:w-12 h-12 sm:h-14 text-center text-xl font-bold rounded-xl outline-none focus:ring-2 transition-all border"
                  style={{ color: "var(--text-primary)", borderColor: "var(--accent-border)", backgroundColor: "var(--bg-main)" }}
                />
              ))}
            </div>
            {error && <p className="text-red-500 text-sm font-medium mt-2">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={isLoading || otpValues.join("").length < 6}
              className={`mt-6 w-full rounded-lg py-3 text-sm font-bold text-white transition-colors ${isLoading || otpValues.join("").length < 6 ? "opacity-50 cursor-not-allowed" : ""}`}
              style={{ backgroundColor: "var(--accent-primary)", borderRadius: "var(--btn-radius)" }}
              onMouseEnter={(e) => { if (!isLoading && otpValues.join("").length === 6) e.currentTarget.style.backgroundColor = "var(--accent-primary-hover)" }}
              onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = "var(--accent-primary)" }}
            >
              {isLoading ? "Проверка..." : "Подтвердить"}
            </button>
            <div className="text-sm mt-4">
              <span style={{ color: "var(--text-secondary)" }}>Не получили код? </span>
              <button
                type="button"
                onClick={sendOtp}
                disabled={isLoading}
                className="font-bold hover:underline transition-all"
                style={{ color: "var(--accent-primary)" }}
              >
                Отправить снова
              </button>
            </div>
            <button
              type="button"
              onClick={() => setStep("form")}
              className="text-sm hover:underline mt-2 block mx-auto transition-all"
              style={{ color: "var(--text-secondary)" }}
            >
              Вернуться назад
            </button>
          </div >
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "register" && (
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Имя пользователя
                </label>
                <input
                  type="text"
                  placeholder="Введите имя"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#1e3a8a]"
                  style={{ borderColor: "var(--accent-border)", color: "var(--text-primary)", backgroundColor: "var(--bg-main)" }}
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Email
              </label>
              <input
                type="email"
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#1e3a8a]"
                style={{ borderColor: "var(--accent-border)", color: "var(--text-primary)", backgroundColor: "var(--bg-main)" }}
              />
            </div>
            <div className="relative">
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Пароль
              </label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors pr-10 focus:border-[#1e3a8a]"
                style={{ borderColor: "var(--accent-border)", color: "var(--text-primary)", backgroundColor: "var(--bg-main)" }}
              />
              <button
                type="button"
                className="absolute right-3 top-6.5 p-1 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {tab === "register" && (
              <div className="relative">
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Повторите пароль
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors pr-10 focus:border-[#1e3a8a]"
                  style={{ borderColor: "var(--accent-border)", color: "var(--text-primary)", backgroundColor: "var(--bg-main)" }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-6.5 p-1 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {error && <p className="text-red-500 text-xs font-medium mt-1">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className={`mt-2 w-full rounded-lg py-3 text-sm font-bold text-white transition-colors ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              style={{ backgroundColor: "var(--accent-primary)", borderRadius: "var(--btn-radius)" }}
              onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = "var(--accent-primary-hover)" }}
              onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = "var(--accent-primary)" }}
            >
              {isLoading ? "Обработка..." : tab === "login" ? "Войти" : "Зарегистрироваться"}
            </button>
          </form >
        )
        }
      </div >
    </div >
  );
}
