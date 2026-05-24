"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Trash2, Upload, Sparkles, X, ImageIcon } from "lucide-react";
import { generateSlug } from "@/lib/slug";
import CustomSelect from "@/components/CustomSelect";

export interface Category {
  id: string;
  title: string;
}

export interface ServiceInitial {
  id?: string;
  slug?: string;
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  price?: string | number;
  imageUrl?: string | null;
  categoryId?: string | null;
}

export default function ServiceForm({
  initial,
  categories,
  mode,
}: {
  initial: ServiceInitial;
  categories: Category[];
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    slug: initial.slug ?? "",
    title: initial.title ?? "",
    subtitle: initial.subtitle ?? "",
    description: initial.description ?? "",
    price: initial.price?.toString() ?? "",
    categoryId: initial.categoryId ?? "",
  });

  // Image state — separated from the main form.
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
    initial.imageUrl ?? null
  );
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  /** `true` when user clicks "Удалить изображение" on an existing one. */
  const [imageCleared, setImageCleared] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Выбранный файл не является изображением.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Файл слишком большой (максимум 8 МБ).");
      return;
    }
    setError(null);
    setNewFile(file);
    setNewPreview(URL.createObjectURL(file));
    setImageCleared(false);
  }

  function clearPickedFile() {
    setNewFile(null);
    if (newPreview) URL.revokeObjectURL(newPreview);
    setNewPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function clearCurrentImage() {
    clearPickedFile();
    setImageCleared(true);
    setCurrentImageUrl(null);
  }

  function onGenerateSlug() {
    const generated = generateSlug(form.title);
    if (generated) setForm((f) => ({ ...f, slug: generated }));
  }

  async function uploadImageIfNeeded(slug: string): Promise<{
    imageUrl: string | null;
    changed: boolean;
  }> {
    // No new file, user didn't clear → keep existing URL untouched.
    if (!newFile && !imageCleared) {
      return { imageUrl: currentImageUrl, changed: false };
    }

    // User cleared the image and didn't pick a new one.
    if (!newFile && imageCleared) {
      return { imageUrl: null, changed: true };
    }

    // New file — upload it.
    const fd = new FormData();
    fd.set("file", newFile!);
    fd.set("slug", slug);
    if (initial.imageUrl) fd.set("oldImageUrl", initial.imageUrl);

    const res = await fetch("/api/admin/services/upload", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Не удалось загрузить изображение (HTTP ${res.status})`);
    }
    const data = (await res.json()) as { imageUrl: string };
    return { imageUrl: data.imageUrl, changed: true };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("Укажите название услуги.");
      return;
    }
    if (!form.slug.trim()) {
      setError("Укажите slug (можно сгенерировать из названия).");
      return;
    }

    setSaving(true);
    try {
      // 1) Upload image first so we can include the final URL in the service payload.
      const { imageUrl, changed } = await uploadImageIfNeeded(form.slug);

      // 2) Build service payload.
      const payload: Record<string, unknown> = {
        ...form,
        categoryId: form.categoryId || null,
      };
      // Only send imageUrl if it actually changed (so untouched edits don't overwrite).
      if (mode === "create") payload.imageUrl = imageUrl;
      else if (changed) payload.imageUrl = imageUrl;

      const url =
        mode === "create"
          ? "/api/admin/services"
          : `/api/admin/services/${initial.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      startTransition(() => {
        router.push("/admin/services");
        router.refresh();
      });
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!initial.id) return;
    if (!confirm("Удалить услугу? Это действие нельзя отменить.")) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/services/${initial.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      startTransition(() => {
        router.push("/admin/services");
        router.refresh();
      });
    } catch (e: any) {
      setError(e.message);
      setDeleting(false);
    }
  }

  const titleTrimmed = form.title.trim();
  const canGenerate = titleTrimmed.length > 0;
  const displayImage = newPreview ?? currentImageUrl;

  return (
    <form onSubmit={submit} className="space-y-6 max-w-3xl">
      <Field label="Название" required>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          className={inputClass}
        />
      </Field>

      <Field
        label="Slug (URL)"
        required
        hint="Латиницей, строчные буквы, дефисы. Пример: my-service"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
            pattern="[a-z0-9-]+"
            className={`${inputClass} font-mono text-xs flex-1`}
          />
          <button
            type="button"
            onClick={onGenerateSlug}
            disabled={!canGenerate}
            title={canGenerate ? "Сгенерировать slug из названия" : "Сначала введите название"}
            className={[
              "inline-flex items-center gap-1.5 px-3.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap",
              canGenerate
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "bg-slate-100 text-slate-400 cursor-not-allowed",
            ].join(" ")}
          >
            <Sparkles className="w-4 h-4" strokeWidth={2.25} />
            Сгенерировать
          </button>
        </div>
      </Field>

      <Field label="Подзаголовок">
        <input
          type="text"
          value={form.subtitle ?? ""}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          className={inputClass}
        />
      </Field>

      <Field label="Описание">
        <textarea
          value={form.description ?? ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={4}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Цена (₽)" required>
          <input
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
            min="0"
            step="0.01"
            className={inputClass}
          />
        </Field>
        <Field label="Категория">
          <CustomSelect
            value={form.categoryId ?? ""}
            onChange={(v) => setForm({ ...form, categoryId: v })}
            className="w-full"
            buttonClassName="bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
            options={[
              { value: "", label: "— без категории —" },
              ...categories.map((c) => ({ value: c.id, label: c.title })),
            ]}
          />
        </Field>
      </div>

      {/* Image picker */}
      <Field
        label="Изображение"
        hint="PNG/JPEG/WebP, до 8 МБ. Будет сохранено в Yandex Object Storage."
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={onPickFile}
        />

        <div className="flex items-start gap-4">
          {/* Preview / placeholder */}
          <div className="w-28 h-28 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            {displayImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayImage}
                alt=""
                className="w-full h-full object-cover"
              />
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
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                <Upload className="w-4 h-4" strokeWidth={2.25} />
                {displayImage ? "Заменить" : "Выбрать файл"}
              </button>

              {newFile && (
                <button
                  type="button"
                  onClick={clearPickedFile}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={2.25} />
                  Отменить выбор
                </button>
              )}

              {!newFile && currentImageUrl && (
                <button
                  type="button"
                  onClick={clearCurrentImage}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2.25} />
                  Удалить изображение
                </button>
              )}
            </div>

            {newFile ? (
              <div className="text-xs text-slate-500 truncate">
                Новый файл: <span className="font-medium">{newFile.name}</span>{" "}
                ({(newFile.size / 1024).toFixed(0)} КБ)
              </div>
            ) : currentImageUrl ? (
              <div className="text-xs text-slate-500 truncate font-mono" title={currentImageUrl}>
                {currentImageUrl}
              </div>
            ) : imageCleared ? (
              <div className="text-xs text-rose-500">
                Изображение будет удалено при сохранении.
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Изображение не выбрано.
              </div>
            )}
          </div>
        </div>
      </Field>

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 rounded-xl p-3">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Сохраняю…" : mode === "create" ? "Создать" : "Сохранить"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Отмена
        </button>
        <div className="flex-1" />
        {mode === "edit" && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" strokeWidth={2.25} />
            {deleting ? "Удаляю…" : "Удалить"}
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </div>
      {children}
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </label>
  );
}

const inputClass =
  "w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors";
