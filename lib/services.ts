import { db } from '@/lib/db';
import { categories, services } from '@/lib/schema';
import { cache } from 'react';

export interface ServiceItem {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  description: string;
  gradient: string;
  background: string;
  isWide?: boolean;
  isTall?: boolean;
  isExtraTall?: boolean;
  isSquare?: boolean;
  isPerDay?: boolean;
}

export interface ServiceCategory {
  id: string;
  title: string;
  items: ServiceItem[];
}

const gradients = [
  'linear-gradient(135deg, #74b9ff 0%, #0984e3 50%, #60a5fa 100%)',
  'linear-gradient(135deg, #b2bec3 0%, #636e72 50%, #74b9ff 100%)',
  'linear-gradient(135deg, #55efc4 0%, #00b894 50%, #0984e3 100%)',
  'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 50%, #e17055 100%)',
  'linear-gradient(135deg, #fd79a8 0%, #e05a6b 50%, #2d3436 100%)',
  'linear-gradient(135deg, #e17055 0%, #fdcb6e 40%, #f97316 100%)',
  'linear-gradient(135deg, #00cec9 0%, #55efc4 50%, #81ecec 100%)',
  'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)',
  'linear-gradient(135deg, #2d3436 0%, #636e72 40%, #f97316 100%)',
  'linear-gradient(135deg, #f97316 0%, #fb923c 40%, #2d3436 100%)',
  'linear-gradient(135deg, #60a5fa 0%, #1e3a8a 50%, #1e3a8a 100%)',
  'linear-gradient(135deg, #818cf8 0%, #4338ca 50%, #312e81 100%)'
];

function enrichItemUI(item: any, index: number): Omit<ServiceItem, 'id' | 'title' | 'subtitle' | 'price' | 'description' | 'background'> {
  const nameLower = (item.subtitle || item.title).toLowerCase();

  const is_wide = item.subtitle?.includes('+') ||
    item.subtitle?.includes('Тропики и Пустыня') ||
    item.subtitle?.includes('Мондштадт 100%') ||
    item.subtitle?.includes('Сбор диковинок') ||
    item.subtitle?.includes('Аранары 100%') ||
    item.subtitle?.includes('Араньяка 100%') ||
    item.subtitle?.includes('Ли Юэ + Долина Чэньюй') ||
    item.subtitle?.includes('Араньяка +');

  const is_nod_krai = nameLower.includes('нод-край');
  const is_plot = nameLower.includes('сюжет');
  const is_square = nameLower.includes('задание') || is_nod_krai;
  const is_tall = is_plot && !is_nod_krai;
  const is_extra_tall = is_tall && !nameLower.includes('мондштадт');
  const is_per_day = nameLower.includes('уход за аккаунтом');

  return {
    isWide: is_wide,
    isTall: is_tall,
    isExtraTall: is_extra_tall,
    isSquare: is_square,
    isPerDay: is_per_day,
    gradient: gradients[index % gradients.length]
  };
}

export const getServiceCategories = cache(async (): Promise<ServiceCategory[]> => {
  const allCategories = await db.select().from(categories);
  const allServices = await db.select().from(services);

  let globalIndex = 0;

  return allCategories.map(cat => {
    const catServices = allServices.filter(s => s.categoryId === cat.id);
    return {
      id: cat.slug,
      title: cat.title,
      items: catServices.map(s => {
        const idx = globalIndex++;
        return {
          id: s.slug,
          title: s.title,
          subtitle: s.subtitle || s.title,
          price: parseFloat(s.price),
          description: s.description || '',
          background: s.imageUrl || '',
          ...enrichItemUI(s, idx)
        };
      })
    };
  });
});

export const getAllServices = cache(async (): Promise<ServiceItem[]> => {
  const cats = await getServiceCategories();
  return cats.flatMap(c => c.items);
});

export const getServiceBySlug = cache(async (slug: string): Promise<ServiceItem | undefined> => {
  const all = await getAllServices();
  return all.find(s => s.id === slug);
});
