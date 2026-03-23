"use client";

import { X, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "login" | "register";

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>("login");

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
          style={{ backgroundColor: "var(--bg-card)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2
              className="text-xl font-bold"
              style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "var(--text-primary)" }}
            >
              {tab === "login" ? "Вход в аккаунт" : "Регистрация"}
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-100"
            >
              <X className="h-5 w-5" style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>

          {/* Tabs */}
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

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Авторизация в разработке");
            }}
            className="space-y-4"
          >
            {tab === "register" && (
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Имя пользователя
                </label>
                <input
                  type="text"
                  placeholder="Введите имя"
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
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#1e3a8a]"
                style={{ borderColor: "var(--accent-border)", color: "var(--text-primary)", backgroundColor: "var(--bg-main)" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Пароль
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#1e3a8a]"
                style={{ borderColor: "var(--accent-border)", color: "var(--text-primary)", backgroundColor: "var(--bg-main)" }}
              />
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-lg py-3 text-sm font-bold text-white transition-colors"
              style={{ backgroundColor: "var(--accent-primary)", borderRadius: "var(--btn-radius)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-primary-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-primary)")}
            >
              {tab === "login" ? "Войти" : "Зарегистрироваться"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
