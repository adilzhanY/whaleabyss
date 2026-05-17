"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const routeLabels: Record<string, string> = {
  "/": "Главная",
  "/services": "Услуги",
  "/cart": "Корзина",
  "/orders": "История заказов",
  "/profile": "Профиль",
  "/reviews": "Отзывы",
  "/events": "События",
  "/faq": "FAQ",
  "/about": "О нас",
  "/info": "Информация",
  "/payment": "Оплата",
  "/privacy": "Политика конфиденциальности",
  "/public_offer": "Публичная оферта",
  "/admin": "Админ панель",
  "/reset-password": "Сброс пароля",
};

export default function Breadcrumb() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [
    { label: "Главная", href: "/" },
  ];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = routeLabels[currentPath] || segment;
    breadcrumbs.push({ label, href: currentPath });
  }

  return (
    <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <div key={crumb.href} className="flex items-center gap-2">
            {isLast ? (
              <span className="text-blue-300">{crumb.label}</span>
            ) : (
              <>
                <Link href={crumb.href} className="hover:text-blue-900 transition-colors">
                  {crumb.label}
                </Link>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
