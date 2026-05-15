import { getServiceCategories } from "@/lib/services";
import ServicesClient from "./ServicesClient";

export const revalidate = 0;

export default async function ServicesPage() {
  const categories = await getServiceCategories();
  return <ServicesClient categories={categories} />;
}
