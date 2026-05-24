"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AvatarEditor from "@/components/AvatarEditor";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Settings, Edit3 } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import Input from "@/components/Input";

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [receiptEmail, setReceiptEmail] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [gameUsername, setGameUsername] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      // Fetch fresh profile data to get social links
      fetch("/api/user/profile")
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            if (data.receiptEmail) setReceiptEmail(data.receiptEmail);
            if (data.telegramUsername) setTelegramUsername(data.telegramUsername);
            if (data.gameUsername) setGameUsername(data.gameUsername);
          }
        })
        .catch(err => console.error("Failed to load profile details", err));
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
        body: JSON.stringify({ name, receiptEmail, telegramUsername, gameUsername }),
      });

      if (res.ok) {
        setMessage("Профиль успешно обновлен!");
        await update({ name });
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

  const handleDeleteConfirm = async () => {
    if (deleteConfirmationText !== "удалить") return;

    setIsDeleting(true);
    setDeleteMessage("");
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/?deleted=true" });
      } else {
        const data = await res.json();
        setDeleteMessage(data.error || "Не удалось удалить аккаунт.");
      }
    } catch {
      setDeleteMessage("Ошибка соединения с сервером.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />
      <main className="pt-24 pb-10">
        <div className="mx-auto max-w-4xl px-4 space-y-6">
          <Breadcrumb />        {/* Profile Header Block */}
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
              <h1 className="text-4xl font-black text-blue-950 mb-1" style={{ fontFamily: "var(--font-primary), sans-serif" }}>
                {session.user.name || "Пользователь"}
              </h1>
              <p className="text-sm font-medium mb-6" style={{ color: "var(--text-secondary)" }}>
                {session.user.email}
              </p>

              <div className="flex gap-3 flex-wrap justify-center md:justify-start">
                <button
                  onClick={() => { setIsEditing(!isEditing); setIsSettingsOpen(false); }}
                  className="btn-primary !px-6 !py-2.5 !rounded-full !font-semibold flex items-center gap-2"
                >
                  Редактировать профиль
                </button>
                <button
                  onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsEditing(false); }}
                  className="btn-primary !px-6 !py-2.5 !rounded-full !font-semibold flex items-center gap-2 !bg-[#B9E8E8] !text-[#0B5B5B] !border-[#9ed6d6] hover:!bg-[#a5dede]"
                >
                  Настройки аккаунта
                </button>
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
                  <Input
                    type="email"
                    value={email}
                    disabled
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>Имя</label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>Ник в игре</label>
                  <Input
                    type="text"
                    value={gameUsername}
                    onChange={(e) => setGameUsername(e.target.value)}
                    placeholder="Ваш игровой ник"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>Telegram</label>
                  <Input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="@username"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>E-mail для чека</label>
                  <Input
                    type="email"
                    value={receiptEmail}
                    onChange={(e) => setReceiptEmail(e.target.value)}
                    placeholder="name@example.com"
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
                    className="btn-primary flex-1 !rounded-full !px-4 !py-3 !font-semibold"
                  >
                    {loading ? "Сохранение..." : "Сохранить изменения"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="btn-primary !rounded-full !px-4 !py-3 !font-semibold !bg-white !text-[#1e3a8a] !border-[#1e3a8a] hover:!bg-[#eef2ff]"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Settings Section */}
          {isSettingsOpen && (
            <div className="rounded-3xl p-6 sm:p-10 shadow-lg" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--accent-border)" }}>
              <h2 className="mb-6 text-xl font-bold" style={{ color: "var(--accent-primary)" }}>Настройки аккаунта</h2>

              <div className="space-y-6 max-w-xl">
                <div className="flex flex-col gap-4">
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="btn-primary flex-1 !rounded-full !px-4 !py-3 !font-semibold !bg-[#f1f5f9] !text-[#0f172a] !border-[#e2e8f0] hover:!bg-[#e2e8f0]"
                  >
                    Выйти из аккаунта
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteWarningOpen(true)}
                    className="btn-primary flex-1 !rounded-full !px-4 !py-3 !font-semibold !bg-[#dc2626] hover:!bg-[#b91c1c]"
                    style={{ backgroundColor: "#dc2626" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#b91c1c"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#dc2626"}
                  >
                    Удалить аккаунт
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Warning Modal */}
          {deleteWarningOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl relative text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Внимание!</h2>
                <p className="text-gray-700 mb-6">
                  Вы собираетесь удалить свой аккаунт. Вы не сможете восстановить этот аккаунт после удаления, и все данные о ваших заказах будут безвозвратно удалены.
                </p>

                <div className="mb-6 text-left">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Для подтверждения напишите слово «удалить»:</label>
                  <Input
                    type="text"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="удалить"
                  />
                </div>

                {deleteMessage && (
                  <p className="mb-6 font-semibold text-red-600 p-3 bg-red-50 rounded-xl border border-red-200">
                    {deleteMessage}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setDeleteWarningOpen(false);
                      setDeleteConfirmationText("");
                      setDeleteMessage("");
                    }}
                    className="btn-primary flex-1 !rounded-full !px-4 !py-3 !font-semibold !bg-gray-200 !text-gray-800 hover:!bg-gray-300"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting || deleteConfirmationText !== "удалить"}
                    className="btn-primary flex-1 !rounded-full !px-4 !py-3 !font-semibold !bg-[#dc2626] hover:!bg-[#b91c1c]"
                    style={{ backgroundColor: "#dc2626" }}
                    onMouseEnter={(e) => { if (!isDeleting && deleteConfirmationText === "удалить") e.currentTarget.style.backgroundColor = "#b91c1c" }}
                    onMouseLeave={(e) => { if (!isDeleting) e.currentTarget.style.backgroundColor = "#dc2626" }}
                  >
                    {isDeleting ? "Загрузка..." : "Удалить"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}
