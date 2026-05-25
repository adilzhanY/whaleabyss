/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { X, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Checkbox from "@/components/Checkbox";
import Input from "@/components/Input";
import { stripNonLatin, passwordSchema, firstError } from "@/lib/validators";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "login" | "register";

const SMARTCAPTCHA_SITEKEY = process.env.NEXT_PUBLIC_YANDEX_SMARTCAPTCHA_CLIENT_KEY;

/** Loads the Yandex SmartCaptcha script once and resolves when the global API
 *  is actually available (the script's load event can fire slightly early). */
function loadSmartCaptchaScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return;
    if ((window as any).smartCaptcha) return resolve();

    if (!document.getElementById("ya-smartcaptcha-script")) {
      const script = document.createElement("script");
      script.id = "ya-smartcaptcha-script";
      script.src = "https://smartcaptcha.cloud.yandex.ru/captcha.js";
      script.defer = true;
      document.head.appendChild(script);
    }

    const start = Date.now();
    const tick = () => {
      if ((window as any).smartCaptcha) return resolve();
      if (Date.now() - start > 8000) return reject(new Error("SmartCaptcha load timeout"));
      setTimeout(tick, 50);
    };
    tick();
  });
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>("login");
  const [show, setShow] = useState(false);
  const [animate, setAnimate] = useState(false);

  const router = useRouter();

  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  // OTP states
  const [step, setStep] = useState<"form" | "captcha" | "otp" | "success">("form");
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const [isShaking, setIsShaking] = useState(false);

  // Captcha
  const captchaRef = useRef<HTMLDivElement>(null);
  const captchaWidgetId = useRef<number | undefined>(undefined);
  const sendOtpRef = useRef<(token: string) => void>(() => {});

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
    setAgreedToPrivacy(false);
    setStep("form");
    setOtpValues(Array(6).fill(""));
    setShowForgotPassword(false);
    setForgotPasswordEmail("");
    setForgotPasswordSuccess(false);
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

  const sendOtp = async (captchaToken: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка отправки кода");
      setStep("otp");
    } catch (err: any) {
      setError(err.message);
      // The captcha token is single-use — re-arm the widget so the user can
      // solve it again (or go back to fix their details).
      const w = window as any;
      if (w.smartCaptcha && captchaWidgetId.current !== undefined) {
        try {
          w.smartCaptcha.reset(captchaWidgetId.current);
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  };
  // Keep the widget callback pointing at the latest sendOtp closure.
  sendOtpRef.current = sendOtp;

  // Render the SmartCaptcha widget whenever we enter the captcha step. On a
  // successful solve the callback fires with a token, which sends the OTP.
  useEffect(() => {
    if (step !== "captcha" || !SMARTCAPTCHA_SITEKEY) return;
    let cancelled = false;
    const container = captchaRef.current;
    if (!container) return;

    loadSmartCaptchaScript()
      .then(() => {
        if (cancelled || !captchaRef.current) return;
        const w = window as any;
        container.innerHTML = "";
        captchaWidgetId.current = w.smartCaptcha.render(container, {
          sitekey: SMARTCAPTCHA_SITEKEY,
          hl: "ru",
          callback: (token: string) => sendOtpRef.current(token),
        });
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setError("Не удалось загрузить капчу. Обновите страницу.");
      });

    return () => {
      cancelled = true;
      const w = window as any;
      if (w.smartCaptcha && captchaWidgetId.current !== undefined) {
        try {
          w.smartCaptcha.destroy(captchaWidgetId.current);
        } catch {}
        captchaWidgetId.current = undefined;
      }
    };
  }, [step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (tab === "register") {
      if (step === "form") {
        if (password !== confirmPassword) {
          setError("Пароли не совпадают");
          return;
        }
        const passwordError = firstError(passwordSchema, password);
        if (passwordError) {
          setError(passwordError);
          return;
        }
        if (!agreedToPrivacy) {
          setError("Необходимо согласиться на обработку персональных данных");
          return;
        }
        // Show the captcha before sending the OTP. Once solved, the widget
        // callback sends the OTP and advances to the code-entry step.
        if (SMARTCAPTCHA_SITEKEY) {
          setStep("captcha");
        } else {
          await sendOtp("");
        }
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

          // Ensure the session cookie is committed before continuing.
          await getSession();
          setStep("success");
          setOtpValues(Array(6).fill(""));
          router.refresh();
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
        // Wait until the session cookie is actually committed & readable
        // server-side before letting the user navigate — otherwise the first
        // hit to a server-guarded route (e.g. /admin) can miss the fresh
        // cookie and bounce back to home ("log in twice" bug).
        await getSession();
        onClose();
        router.refresh();
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
            style={{ fontFamily: "var(--font-primary), sans-serif", color: "var(--text-primary)" }}
          >
            {step === "success"
              ? "Успешно"
              : tab === "login"
                ? "Вход в аккаунт"
                : step === "otp"
                  ? "Подтверждение Email"
                  : step === "captcha"
                    ? "Проверка"
                    : "Регистрация"}
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
            className="mb-6 flex rounded-full p-1"
            style={{ backgroundColor: "var(--bg-highlight)" }}
          >
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold transition-all"
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
              className="btn-primary mt-6 w-full !py-3 !text-sm"
            >
              Продолжить покупки
            </button>
          </div>
        ) : tab === "register" && step === "captcha" ? (
          <div className="space-y-5 text-center">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Подтвердите, что вы не робот, чтобы получить код подтверждения.
            </p>
            <div ref={captchaRef} className="flex justify-center min-h-[100px]" />
            {isLoading && (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Отправляем код...
              </p>
            )}
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button
              type="button"
              onClick={() => setStep("form")}
              className="text-sm hover:underline mt-2 block mx-auto transition-all"
              style={{ color: "var(--text-secondary)" }}
            >
              Вернуться назад
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
              className="btn-primary mt-6 w-full !py-3 !text-sm"
            >
              {isLoading ? "Проверка..." : "Подтвердить"}
            </button>
            <div className="text-sm mt-4">
              <span style={{ color: "var(--text-secondary)" }}>Не получили код? </span>
              <button
                type="button"
                onClick={() => setStep("captcha")}
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
        ) : showForgotPassword ? (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Введите ваш email, и мы отправим вам ссылку для сброса пароля.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Email
              </label>
              <Input
                type="email"
                placeholder="example@mail.com"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                required
                className="text-sm"
              />
            </div>

            {error && <p className="text-red-500 text-xs font-medium mt-1">{error}</p>}

            {forgotPasswordSuccess ? (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                Письмо отправлено! Проверьте вашу почту.
              </div>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setError("");
                  if (!forgotPasswordEmail) {
                    setError("Введите email");
                    return;
                  }
                  setIsLoading(true);
                  try {
                    const res = await fetch("/api/auth/forgot-password", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: forgotPasswordEmail }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Ошибка отправки");
                    setForgotPasswordSuccess(true);
                  } catch (err: any) {
                    setError(err.message);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="btn-primary w-full !py-3 !text-sm"
              >
                {isLoading ? "Отправка..." : "Отправить ссылку"}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setForgotPasswordEmail("");
                setForgotPasswordSuccess(false);
                setError("");
              }}
              className="text-sm hover:underline mt-2 block mx-auto transition-all"
              style={{ color: "var(--text-secondary)" }}
            >
              Вернуться к входу
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "register" && (
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Имя пользователя
                </label>
                <Input
                  type="text"
                  placeholder="Введите имя"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  sanitize={stripNonLatin}
                  required
                  className="text-sm"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Email
              </label>
              <Input
                type="email"
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-sm"
              />
            </div>
            <div className="relative">
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Пароль
              </label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sanitize={stripNonLatin}
                required
                className="text-sm pr-12"
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
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  sanitize={stripNonLatin}
                  required
                  className="text-sm pr-12"
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

            {tab === "register" && (
              <div className="mt-2 flex items-start gap-2.5 select-none">
                <Checkbox
                  checked={agreedToPrivacy}
                  onChange={setAgreedToPrivacy}
                  size={20}
                  aria-label="Согласие на обработку персональных данных"
                />
                <span
                  onClick={() => setAgreedToPrivacy(!agreedToPrivacy)}
                  className="text-xs font-medium cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Я согласен на обработку моих персональных данных и принимаю условия{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="underline hover:opacity-80 transition-opacity"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    Политики конфиденциальности
                  </Link>
                  {" "}и{" "}
                  <Link
                    href="/public_offer"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="underline hover:opacity-80 transition-opacity"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    Пользовательского соглашения
                  </Link>
                  .
                </span>
              </div>
            )}

            {error && <p className="text-red-500 text-xs font-medium mt-1">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary mt-2 w-full !py-3 !text-sm"
            >
              {isLoading ? "Обработка..." : tab === "login" ? "Войти" : "Зарегистрироваться"}
            </button>

            {tab === "login" && !showForgotPassword && (
              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm hover:underline transition-all"
                  style={{ color: "var(--accent-primary)" }}
                >
                  Забыли пароль?
                </button>
              </div>
            )}
          </form >
        )
        }
      </div >
    </div >
  );
}
