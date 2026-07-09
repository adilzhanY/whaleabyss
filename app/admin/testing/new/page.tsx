"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";

export default function NewTestServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/services/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setImageUrl(data.url);
    } catch (err) {
      alert("Ошибка загрузки изображения");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      slug: formData.get("slug"),
      title: formData.get("title"),
      subtitle: formData.get("subtitle"),
      description: formData.get("description"),
      price: formData.get("price"),
      imageUrl: imageUrl || null,
      isTestService: true,
    };

    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create service");
      }

      router.push("/admin/testing");
      router.refresh();
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/testing"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2.25} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Новая тестовая услуга</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Создайте тестовую услугу для проверки функционала
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Slug (URL)
            </label>
            <Input
              type="text"
              name="slug"
              required
              placeholder="test-service"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Название
            </label>
            <Input
              type="text"
              name="title"
              required
              placeholder="Test Service"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Подзаголовок
            </label>
            <Input
              type="text"
              name="subtitle"
              placeholder="Тестовая услуга"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Описание
            </label>
            <Textarea
              name="description"
              rows={4}
              placeholder="Описание тестовой услуги"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Цена (₽)
            </label>
            <Input
              type="number"
              name="price"
              required
              defaultValue="10"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Изображение
            </label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" strokeWidth={2.25} />
                <span className="text-sm font-medium">
                  {uploading ? "Загрузка..." : "Загрузить"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading || uploading}
            className="btn-primary !px-6 text-sm"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />}
            Создать
          </button>
          <Link
            href="/admin/testing"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
