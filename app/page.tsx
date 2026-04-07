import { getServiceCategories } from "@/lib/services";
import HomeClient from "@/app/HomeClient";

export default async function Home() {
  const categories = await getServiceCategories();
  return <HomeClient categories={categories} />;
}
