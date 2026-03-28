import servicesData from "@/services/services_list.json";
import { generateSlug } from "./slug";

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
}

export interface ServiceCategory {
  id: string;
  title: string;
  items: ServiceItem[];
}

const gradients = [
  "linear-gradient(135deg, #74b9ff 0%, #0984e3 50%, #60a5fa 100%)",
  "linear-gradient(135deg, #b2bec3 0%, #636e72 50%, #74b9ff 100%)",
  "linear-gradient(135deg, #55efc4 0%, #00b894 50%, #0984e3 100%)",
  "linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 50%, #e17055 100%)",
  "linear-gradient(135deg, #fd79a8 0%, #e05a6b 50%, #2d3436 100%)",
  "linear-gradient(135deg, #e17055 0%, #fdcb6e 40%, #f97316 100%)",
  "linear-gradient(135deg, #00cec9 0%, #55efc4 50%, #81ecec 100%)",
  "linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)",
  "linear-gradient(135deg, #2d3436 0%, #636e72 40%, #f97316 100%)",
  "linear-gradient(135deg, #f97316 0%, #fb923c 40%, #2d3436 100%)",
  "linear-gradient(135deg, #60a5fa 0%, #1e3a8a 50%, #1e3a8a 100%)",
  "linear-gradient(135deg, #818cf8 0%, #4338ca 50%, #312e81 100%)"
];

const categoryTitles: Record<string, string> = {
  locations: "Исследование регионов",
  boost: "Буст",
  missions: "Задания",
  abyss_theater: "Бездна и Театр"
};

let globalIndex = 0;

export const SERVICE_CATEGORIES: ServiceCategory[] = Object.entries(servicesData as Record<string, any[]>).map(([catKey, items]) => {
  return {
    id: catKey,
    title: categoryTitles[catKey] || catKey.toUpperCase(),
    items: items.map((item, _loopIndex) => {
      const nameLower = item.name.toLowerCase();

      const is_wide = item.name.includes("+") ||
        item.name.includes("Тропики и Пустыня") ||
        item.name.includes("Мондштадт 100%") ||
        item.name.includes("Сбор диковинок") ||
        item.name.includes("Аранары 100%") ||
        item.name.includes("Араньяка 100%") ||
        item.name.includes("Ли Юэ + Долина Чэньюй") ||
        item.name.includes("Араньяка +");

      const is_nod_krai = nameLower.includes("нод-край");
      const is_plot = nameLower.includes("сюжет");

      const is_square = nameLower.includes("задание") || is_nod_krai;
      const is_tall = is_plot && !is_nod_krai;
      const is_extra_tall = is_tall && !nameLower.includes("мондштадт");

      const index = globalIndex++;

      return {
        id: `${generateSlug(item.name)}-${index}`,
        title: item.name.toUpperCase(),
        subtitle: item.name.replace(" 100%", "").replace(/\+/g, "и").trim(),
        price: item.price,
        description: item.description,
        background: item.background,
        isWide: is_wide,
        isTall: is_tall,
        isExtraTall: is_extra_tall,
        isSquare: is_square,
        gradient: gradients[index % gradients.length]
      };
    })
  };
});

export const SERVICES: ServiceItem[] = SERVICE_CATEGORIES.flatMap(cat => cat.items);

export function getServiceBySlug(slug: string): ServiceItem | undefined {
  return SERVICES.find(s => s.id === slug);
}