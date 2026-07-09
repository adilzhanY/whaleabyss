"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useState } from "react";

export const dynamic = "force-dynamic";

interface TestService {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isTestService: boolean | null;
}

export default function AdminTestingPage({ services: testServices }: { services: TestService[] }) {
  const [buying, setBuying] = useState<string | null>(null);

  const handleBuy = async (service: TestService) => {
    setBuying(service.id);

    try {
      // Create order directly without cart
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            id: service.slug,
            title: service.title,
            subtitle: service.subtitle || service.title,
            price: Number(service.price),
            quantity: 1,
          }],
          total: Number(service.price),
          email: 'admin@test.com',
          telegram: '@admin',
          adventureRank: 60,
          method: 44, // SBP
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const data = await response.json();

      // Redirect to payment
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Ошибка при создании заказа');
      setBuying(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Тестирование</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Тестовые услуги для проверки функционала
          </p>
        </div>
        <Link
          href="/admin/testing/new"
          className="btn-primary !px-4 text-sm"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Новая тестовая услуга
        </Link>
      </div>

      {testServices.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
          Пока нет тестовых услуг.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {testServices.map((service) => (
            <div
              key={service.id}
              className="group flex flex-col rounded-2xl sm:rounded-3xl transition-all duration-300 w-full h-full p-3 sm:p-4 border-2 border-transparent relative hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/20 bg-white"
              style={{
                background: "linear-gradient(#ffffff, #ffffff) padding-box, linear-gradient(135deg, rgba(30,58,138,0.4) 0%, rgba(96,165,250,0.4) 100%) border-box",
              }}
            >
              {/* Image placeholder */}
              <div
                className="mb-3 sm:mb-4 w-full flex items-center justify-center relative overflow-hidden shrink-0 h-30 sm:h-45 transition-transform duration-300 group-hover:scale-105"
                style={{
                  borderRadius: "0.75rem",
                  background: service.imageUrl
                    ? `url('${service.imageUrl}') center / cover no-repeat`
                    : "linear-gradient(135deg, #60a5fa 0%, #1e40af 50%, #1e3a8a 100%)",
                }}
              />

              {/* Title/Subtitle */}
              <div className="flex-1 mb-3 sm:mb-4">
                <p className="text-xl sm:text-sm font-medium line-clamp-2 text-slate-700 transition-colors duration-300 group-hover:text-blue-900">
                  {service.subtitle || service.title}
                </p>
              </div>

              {/* Price + Buy button */}
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-2xl font-bold whitespace-nowrap text-[#1e3a8a] transition-colors duration-300 group-hover:text-blue-800">
                  {Number(service.price).toLocaleString("ru-RU")} ₽
                </span>
                <button
                  onClick={() => handleBuy(service)}
                  disabled={buying === service.id}
                  className="btn-primary !px-4 !py-2 text-sm"
                >
                  {buying === service.id ? 'Загрузка...' : 'Купить'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
