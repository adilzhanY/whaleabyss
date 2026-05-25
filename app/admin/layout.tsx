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
    <>
      <AdminShell
        userName={user.name ?? "Admin"}
        userEmail={user.email ?? ""}
      >
        {children}
      </AdminShell>
      {/* New-order "kaching" + toast — admin pages only */}
      <OrderNotifier />
    </>
  );
}
