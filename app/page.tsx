import { getServiceCategories } from "@/lib/services";
import HomeClient from "@/app/HomeClient";
import { Suspense } from "react";

export default async function Home() {
  const categories = await getServiceCategories();
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeClient categories={categories} />
    </Suspense>
  );
}
