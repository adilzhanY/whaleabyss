import { getSiteStats } from "@/lib/siteStats";
import InfoClient from "./InfoClient";

export default async function InfoPage() {
  const stats = await getSiteStats();
  return <InfoClient stats={stats} />;
}
