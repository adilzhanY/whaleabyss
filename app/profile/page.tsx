import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getProfileOverview } from "@/lib/profileOverview";
import ProfileClient from "./ProfileClient";

/** Personal data, and it changes on every order — never cache it. */
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  // Server-side redirect: the old client-side one flashed an empty page first.
  if (!session?.user?.id) redirect("/");

  const overview = await getProfileOverview(session.user.id);
  if (!overview) redirect("/");

  return <ProfileClient overview={overview} />;
}
