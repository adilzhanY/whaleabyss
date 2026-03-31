"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AvatarEditor from "@/components/AvatarEditor";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Settings, Edit3 } from "lucide-react";

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div className="p-8 text-center text-black">Loading...</div>;
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
        await update({ name });
        // Optional timeout to allow user to see message before closing
        setTimeout(() => setIsEditing(false), 1500);
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

  const handleAvatarUpload = async (newUrl: string) => {
    await update({ image: newUrl });
  };

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <main className="py-10">
        <div className="mx-auto max-w-4xl px-4 space-y-6">        {/* Profile Header Block */}
          <div
            className="rounded-[2rem] p-6 sm:p-10 shadow-sm flex flex-col md:flex-row items-center md:items-center gap-8 relative overflow-hidden"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
            {/* Avatar Section */}
            <div className="relative z-10 flex-shrink-0">
              <AvatarEditor
                currentAvatarUrl={session.user.image}
                userName={session.user.name || "User"}
                onUploadSuccess={handleAvatarUpload}
              />
            </div>

            {/* User Info Section */}
            <div className="flex-1 flex flex-col z-10 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-extrabold mb-1" style={{ color: "var(--text-primary)" }}>
                {session.user.name || "Пользователь"}
              </h1>
              <p className="text-sm font-medium mb-6" style={{ color: "var(--text-secondary)" }}>
                {session.user.email}
              </p>

              <div className="flex gap-3 flex-wrap justify-center md:justify-start">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all"
                  style={{ backgroundColor: "var(--accent-primary)", color: "white" }}
                >
                  Редактировать профиль
                </button>
                <button
                  className="px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all"
                  style={{ backgroundColor: "#B9E8E8", color: "#0B5B5B" }}
                >
                  Настройки аккаунта
                </button>
              </div>
            </div>

            {/* Stats Section */}
            <div className="flex gap-3 z-10 mt-6 md:mt-0 md:ml-auto">
              <div className="rounded-2xl p-4 flex flex-col items-center justify-center min-w-[90px] h-[90px]" style={{ backgroundColor: "var(--bg-input)" }}>
                <span className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--accent-primary)" }}>Заказы</span>
                <span className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>12</span>
              </div>
              <div className="rounded-2xl p-4 flex flex-col items-center justify-center min-w-[90px] h-[90px]" style={{ backgroundColor: "var(--bg-input)" }}>
                <span className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--accent-primary)" }}>Рейтинг</span>
                <span className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>4.9</span>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="rounded-3xl p-6 sm:p-10 shadow-lg" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--accent-border)" }}>
              <h2 className="mb-6 text-xl font-bold" style={{ color: "var(--accent-primary)" }}>Изменить данные</h2>
              <form onSubmit={handleSave} className="space-y-6 max-w-xl">
                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>E-mail (нельзя изменить)</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full rounded-lg border px-4 py-3 outline-none"
                    style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--accent-border)", color: "var(--text-secondary)", opacity: 0.7, cursor: "not-allowed" }}
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
                    style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--accent-border)", color: "var(--text-primary)" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--accent-border)")}
                  />
                </div>

                {message && (
                  <div className={`rounded-xl p-3 text-sm ${message.includes("успешно") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {message}
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-xl px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: "var(--accent-primary)" }}
                  >
                    {loading ? "Сохранение..." : "Сохранить изменения"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl border px-4 py-3 font-semibold transition-colors"
                    style={{ borderColor: "var(--accent-primary)", color: "var(--accent-primary)" }}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sign out button */}
          <div className="flex justify-center md:justify-start pt-4">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm font-semibold transition-colors flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "red"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
            >
              Выйти из аккаунта
            </button>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
