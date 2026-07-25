"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Plus, GripVertical, Trash2, Check, X } from "lucide-react";
import Link from "next/link";
import PageHeader from "../../_components/PageHeader";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";

interface Category {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  order: number;
}

function SortableCategory({
  category,
  onDelete,
}: {
  category: Category;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900">{category.title}</div>
        <div className="text-xs text-slate-500 font-mono">{category.slug}</div>
        {category.description && (
          <div className="text-sm text-slate-600 mt-1">{category.description}</div>
        )}
      </div>

      <button
        onClick={() => onDelete(category.id)}
        className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);

      const reordered = arrayMove(categories, oldIndex, newIndex);
      setCategories(reordered);

      const categoryOrders = reordered.map((cat, index) => ({
        id: cat.id,
        order: index,
      }));

      try {
        await fetch("/api/admin/categories/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryOrders }),
        });
      } catch (error) {
        console.error("Failed to save order:", error);
        fetchCategories();
      }
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newSlug.trim()) {
      alert("Заполните название и slug");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          slug: newSlug,
          description: newDescription || null,
        }),
      });

      if (res.ok) {
        const newCategory = await res.json();
        setCategories([...categories, newCategory]);
        setNewTitle("");
        setNewSlug("");
        setNewDescription("");
        setShowNewForm(false);
      } else {
        alert("Ошибка при создании категории");
      }
    } catch (error) {
      console.error("Failed to create category:", error);
      alert("Ошибка при создании категории");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить эту категорию? Все услуги в ней останутся без категории.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCategories(categories.filter((c) => c.id !== id));
      } else {
        alert("Ошибка при удалении категории");
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      alert("Ошибка при удалении категории");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/services"
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <PageHeader subtitle="Перетаскивайте категории для изменения порядка" />
        <div className="flex-1" />
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary !px-4 text-sm"
          >
            <Plus className="w-4 h-4" />
            Новая категория
          </button>
        )}
      </div>

      {showNewForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Создать категорию</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Название *
              </label>
              <Input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Витая Бездна"
                className="text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Slug (для URL) *
              </label>
              <Input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="abyss"
                className="text-base font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Описание
              </label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Описание категории..."
                rows={2}
                className="text-base"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="btn-primary flex-1 !px-4 !py-3"
              >
                <Check className="w-4 h-4" />
                {saving ? "Создание..." : "Создать"}
              </button>
              <button
                onClick={() => {
                  setShowNewForm(false);
                  setNewTitle("");
                  setNewSlug("");
                  setNewDescription("");
                }}
                className="px-4 py-3 rounded-full border-2 border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
          <p className="text-slate-500 mb-4">Категорий пока нет</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary inline-flex items-center gap-2 !py-2 !px-4"
          >
            <Plus className="w-4 h-4" />
            Создать первую категорию
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {categories.map((category) => (
                <SortableCategory key={category.id} category={category} onDelete={handleDelete} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
