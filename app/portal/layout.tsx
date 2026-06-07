import { getBoosterContext } from "@/lib/portalAuth";
import PortalShell from "./PortalShell";

export const metadata = {
  title: "Портал качера · Whale Abyss",
};

export const dynamic = "force-dynamic";

/**
 * Portal layout. The edge middleware already requires role='booster'; this
 * server gate additionally resolves the boosters.user_id FK — a booster-role
 * account without a linked (active) roster row gets a clear message instead
 * of the shell.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getBoosterContext();

  if (!ctx) {
    return (
      <div
        className="min-h-screen bg-slate-50 flex items-center justify-center p-6"
        style={{ fontFamily: "Onest, sans-serif" }}
      >
        <div className="bg-white rounded-3xl border border-slate-200 p-10 max-w-md text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Аккаунт не привязан</h1>
          <p className="text-sm text-slate-500">
            Ваш аккаунт не привязан к профилю качера или профиль деактивирован.
            Обратитесь к администратору.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PortalShell boosterName={`${ctx.booster.firstName} ${ctx.booster.lastName}`}>
      {children}
    </PortalShell>
  );
}
