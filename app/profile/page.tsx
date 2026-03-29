"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div className="p-8 text-center text-white">Loading...</div>;
  }

  if (!session?.user) {
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        setMessage("Профиль успешно обновлен!");
        // We might need to force NextAuth session update, but reloading avoids caching bugs for now
        window.location.reload();
      } else {
        const errorData = await res.json();
        setMessage(errorData.error || "Ошибка сохранения");
      }
    } catch (err) {
      setMessage("Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-10" style={{ backgroundColor: "var(--bg-main)" }}>
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-2xl p-6 sm:p-10 shadow-lg" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--accent-border)" }}>
          <h1 className="mb-6 text-2xl font-bold" style={{ color: "var(--accent-primary)" }}>Ваш профиль</h1>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>E-mail (нельзя изменить)</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-lg border px-4 py-3 outline-none"
                style={{
                  backgroundColor: "var(--bg-input)",
                  borderColor: "var(--accent-border)",
                  color: "var(--text-secondary)",
                  opacity: 0.7,
                  cursor: "not-allowed"
                }}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>Имя</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border px-4 py-3 outline-none transition-colors"
                style={{
                  backgroundColor: "var(--bg-input)",
                  borderColor: "var(--accent-border)",
                  color: "var(--text-primary)"
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--accent-border)")}
              />
            </div>

            {message && (
              <div className={`rounded-lg p-3 text-sm ${message.includes("успешно") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {message}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                {loading ? "Сохранение..." : "Сохранить изменения"}
              </button>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="rounded-lg border px-4 py-3 font-semibold transition-colors"
                style={{
                  borderColor: "var(--accent-primary)",
                  color: "var(--accent-primary)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--accent-primary)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--accent-primary)";
                }}
              >
                Выйти из аккаунта
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
