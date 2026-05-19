import { getServiceCategories } from "@/lib/services";
import ServicesClient from "./ServicesClient";
import { generateMetadata as genMeta } from "@/lib/seo";

export const revalidate = 0;

export const metadata = genMeta({
  title: "Услуги прокачки Genshin Impact",
  description: "Полный каталог услуг по прокачке аккаунтов Genshin Impact: прохождение Спиральной Бездны, фарм ресурсов, прокачка персонажей, выполнение квестов. Профессиональные бустеры, безопасно и быстро.",
  keywords: "услуги прокачки genshin, буст genshin impact, прохождение бездны, фарм примогемов, прокачка персонажей, каталог услуг genshin",
  canonical: "https://whaleabyss.ru/services",
});

export default async function ServicesPage() {
  const categories = await getServiceCategories();
  return <ServicesClient categories={categories} />;
}
