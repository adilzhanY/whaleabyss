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
    // id="admin-root" on purpose, portal or not: the entire dark palette in
    // globals.css is scoped to `body:has(#admin-root.admin-dark)`, and the
    // portal is built from the same slate/white utility vocabulary as the
    // admin — one anchor id gives it the identical theme with zero new CSS.
    // The theme preference is shared with /admin via the same storage key;
    // that is a feature (one mechanism), not an accident.
    // suppressHydrationWarning: the inline script below may add `admin-dark`
    // before React hydrates (same pattern as app/admin/layout.tsx).
    <div id="admin-root" suppressHydrationWarning>
      {/* Applies the saved theme synchronously during HTML parse — no
          light-theme flash. Key must match ThemeSwitch's ADMIN_THEME_KEY. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem("whaleabyss:admin:theme")==="dark")document.currentScript.parentElement.classList.add("admin-dark")}catch(e){}`,
        }}
      />
      <PortalShell boosterName={`${ctx.booster.firstName} ${ctx.booster.lastName}`}>
        {children}
      </PortalShell>
    </div>
  );
}
