import EventsClient from "./EventsClient";
import { generateMetadata as genMeta } from "@/lib/seo";

export const metadata = genMeta({
  title: "События и конкурсы Whale Abyss",
  description: "Актуальные события, конкурсы и акции от Whale Abyss. Участвуйте в розыгрышах призов, получайте скидки на прокачку аккаунтов Genshin Impact.",
  keywords: "события whale abyss, конкурсы genshin, акции прокачка, розыгрыши призов, скидки буст",
  canonical: "https://whaleabyss.ru/events",
});

export default async function EventsPage() {
  return <EventsClient />;
}
