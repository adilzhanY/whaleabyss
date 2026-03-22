import locationsData from "@/services/locations.json";
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
  "linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #4f46e5 100%)",
  "linear-gradient(135deg, #818cf8 0%, #4338ca 50%, #312e81 100%)"
];

export const SERVICES: ServiceItem[] = locationsData.map((item, index) => {
  const is_wide = item.name.includes("+") ||
    item.name.includes("Тропики и Пустыня") ||
    (item.name === "Мондштадт 100%") ||
    (item.name === "Сбор диковинок") ||
    item.name.includes("Ли Юэ + Долина Чэньюй") ||
    item.name.includes("Араньяка +");

  return {
    id: `${generateSlug(item.name)}-${index}`,
    title: item.name.toUpperCase(),
    subtitle: item.name.replace(" 100%", "").replace(/\+/g, "и").trim(),
    price: item.price,
    description: item.description,
    background: item.background,
    isWide: is_wide,
    gradient: gradients[index % gradients.length]
  };
});

export function getServiceBySlug(slug: string): ServiceItem | undefined {
  return SERVICES.find(s => s.id === slug);
}