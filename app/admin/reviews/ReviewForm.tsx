"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, ImageIcon, UserX, Star } from "lucide-react";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";

/**
 * Admin form to create a fake review. Fields: rating, name, text, date, avatar.
 * The avatar picker mirrors the one in /admin/services (ServiceForm) — hidden
 * file input + preview + replace button — plus a "Без аватара" toggle that drops
 * the image so the card renders the first letter of the name (same as users with
 * no avatar). On success it returns to /admin/reviews.
 */
export default function ReviewForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Файл должен быть изображением");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Файл слишком большой (макс. 8 МБ)");
      return;
    }
    setError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function clearAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const firstLetter = authorName.trim() ? authorName.trim()[0].toUpperCase() : "?";

  // Whole-star rating selector — same UX as the user form (/reviews/new).
  const renderStarInput = (starValue: number) => {
    const isFilled = (hoveredRating || rating) >= starValue;
    return (
      <button
        type="button"
        key={starValue}
        onMouseEnter={() => setHoveredRating(starValue)}
        onMouseLeave={() => setHoveredRating(0)}
        onClick={() => setRating(starValue)}
        className="transition-transform hover:scale-110"
      >
        <Star className="h-8 w-8" style={{ color: "#f59e0b" }} fill={isFilled ? "#f59e0b" : "none"} />
      </button>
    );
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!authorName.trim()) {
      setError("Введите имя");
      return;
    }
    if (description.trim().length < 2) {
      setError("Введите текст отзыва");
      return;
    }

    setSubmitting(true);
    try {
      // 1) Upload the avatar first (if one was picked) to get its URL.
      let avatarUrl: string | null = null;
      if (avatarFile) {
        const fd = new FormData();
        fd.set("file", avatarFile);
        const up = await fetch("/api/admin/reviews/upload", { method: "POST", body: fd });
        if (!up.ok) {
          const data = await up.json().catch(() => ({}));
          throw new Error(data.error || "Не удалось загрузить аватар");
        }
        const data = await up.json();
        avatarUrl = data.imageUrl;
      }

      // 2) Create the fake review.
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: authorName.trim(),
          description: description.trim(),
          date: date || undefined,
          rating,
          avatarUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось создать отзыв");
      }

      startTransition(() => {
        router.push("/admin/reviews");
        router.refresh();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Произошла ошибка");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Оценка</label>
        <div className="flex gap-2">{[1, 2, 3, 4, 5].map(renderStarInput)}</div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Имя</label>
        <Input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Например, Максим"
          maxLength={255}
          className="text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Текст отзыва</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Текст отзыва…"
          rows={5}
          maxLength={1000}
          className="text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Дата</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm max-w-xs"
        />
        <p className="text-xs text-slate-400 mt-1">Если не указать — будет текущая дата.</p>
      </div>

      {/* Avatar picker (mirrors /admin/services) */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Аватар</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={onPickFile}
        />
        <div className="flex items-start gap-4">
          {/* Preview / first-letter fallback */}
          <div className="w-24 h-24 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
            ) : authorName.trim() ? (
              <span className="text-3xl font-bold text-slate-500">{firstLetter}</span>
            ) : (
              <ImageIcon className="w-8 h-8 text-slate-400" strokeWidth={1.75} />
            )}
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary !px-3.5 !py-2 text-sm"
              >
                <Upload className="w-4 h-4" strokeWidth={2.25} />
                {avatarPreview ? "Заменить" : "Выбрать файл"}
              </button>

              {avatarPreview && (
                <button
                  type="button"
                  onClick={clearAvatar}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <UserX className="w-4 h-4" strokeWidth={2.25} />
                  Без аватара
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {avatarFile
                ? `Файл: ${avatarFile.name} (${(avatarFile.size / 1024).toFixed(0)} КБ)`
                : "Без аватара будет показана первая буква имени."}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 rounded-xl p-3">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary text-sm"
        >
          {submitting ? "Сохранение…" : "Добавить отзыв"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/reviews")}
          disabled={submitting}
          className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
