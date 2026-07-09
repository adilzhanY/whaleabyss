import { requireAdminPage } from "@/lib/auth/requireAdmin";
import AdminShell from "./AdminShell";
import OrderNotifier from "./_components/OrderNotifier";

export const metadata = {
  title: "Admin · Whale Abyss",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminPage();
  const user = session.user;

  return (
    // suppressHydrationWarning: the inline script below may add `admin-dark`
    // before React hydrates (same pattern as next-themes).
    <div id="admin-root" suppressHydrationWarning>
      {/* Applies the saved admin theme synchronously during HTML parse (the
          parent div already exists when this runs) — no light-theme flash
          before hydration. Key must match ThemeSwitch's ADMIN_THEME_KEY. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem("whaleabyss:admin:theme")==="dark")document.currentScript.parentElement.classList.add("admin-dark")}catch(e){}`,
        }}
      />
      <AdminShell
        userName={user.name ?? "Admin"}
        userEmail={user.email ?? ""}
      >
        {children}
      </AdminShell>
      {/* New-order "kaching" + toast — admin pages only */}
      <OrderNotifier />
    </div>
  );
}
