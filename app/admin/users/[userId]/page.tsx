"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Mail, User, Calendar, DollarSign, ShoppingBag, Star } from "lucide-react";
import OrderStatusBadge from "../../_components/OrderStatusBadge";

interface UserDetails {
  id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  telegramUsername: string | null;
  gameUsername: string | null;
  receiptEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  status: string;
  totalPrice: string;
  paymentId: string | null;
  userNotes: string | null;
  promocode: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Review {
  id: string;
  rating: string;
  description: string;
  status: string;
  createdAt: string;
}

interface Stats {
  totalSpent: number;
  totalOrders: number;
  paidOrders: number;
  totalReviews: number;
}

interface TopService {
  serviceId: string;
  title: string;
  count: number;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserDetails | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/users/${userId}`);

      if (!res.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await res.json();
      setUser(data.user);
      setOrders(data.orders);
      setReviews(data.reviews);
      setStats(data.stats);
      setTopServices(data.topServices);
    } catch (error) {
      console.error("Failed to fetch user details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      user: "bg-blue-100 text-blue-700 border-blue-200",
      admin: "bg-purple-100 text-purple-700 border-purple-200",
      booster: "bg-green-100 text-green-700 border-green-200",
    };
    const labels = {
      user: "Пользователь",
      admin: "Администратор",
      booster: "Бустер",
    };

    return (
      <span
        className={`px-3 py-1 rounded-lg text-sm font-semibold border ${
          styles[role as keyof typeof styles] || styles.user
        }`}
      >
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6" style={{ fontFamily: "Onest, sans-serif" }}>
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-500">Пользователь не найден</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ fontFamily: "Onest, sans-serif" }}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/users')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Профиль пользователя</h1>
          <p className="text-sm text-slate-600 mt-1">Детальная информация о пользователе</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.username}
                width={120}
                height={120}
                className="rounded-full border-4 border-slate-200"
              />
            ) : (
              <div className="w-30 h-30 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-slate-200">
                <User className="h-16 w-16 text-white" />
              </div>
            )}
          </div>

          {/* User Details */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold text-slate-900">{user.username}</h2>
              {getRoleBadge(user.role)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm font-medium text-slate-700">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Дата регистрации</p>
                  <p className="text-sm font-medium text-slate-700">
                    {new Date(user.createdAt).toLocaleString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {user.telegramUsername && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Telegram</p>
                    <p className="text-sm font-medium text-slate-700">{user.telegramUsername}</p>
                  </div>
                </div>
              )}

              {user.gameUsername && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Игровой ник</p>
                    <p className="text-sm font-medium text-slate-700">{user.gameUsername}</p>
                  </div>
                </div>
              )}

              {user.receiptEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Email для чеков</p>
                    <p className="text-sm font-medium text-slate-700">{user.receiptEmail}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <p className="text-xs text-slate-500 font-mono">ID: {user.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Потрачено</p>
                <p className="text-xl font-bold text-slate-900">
                  {stats.totalSpent.toLocaleString("ru-RU")} ₽
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingBag className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Всего заказов</p>
                <p className="text-xl font-bold text-slate-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <ShoppingBag className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Оплаченных</p>
                <p className="text-xl font-bold text-slate-900">{stats.paidOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Star className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Отзывов</p>
                <p className="text-xl font-bold text-slate-900">{stats.totalReviews}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Services */}
      {topServices.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Топ-3 услуги</h3>
          <div className="space-y-3">
            {topServices.map((service, index) => (
              <div
                key={service.serviceId}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{service.title}</p>
                    <p className="text-xs text-slate-500 font-mono">ID: {service.serviceId.slice(0, 8)}...</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{service.count}</p>
                  <p className="text-xs text-slate-500">покупок</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Заказы ({orders.length})</h3>
        {orders.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Заказов пока нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="text-left font-medium px-4 py-3">ID заказа</th>
                  <th className="text-left font-medium px-4 py-3">Статус</th>
                  <th className="text-right font-medium px-4 py-3">Сумма</th>
                  <th className="text-left font-medium px-4 py-3">ID платежа</th>
                  <th className="text-right font-medium px-4 py-3">Дата</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status ?? "pending"} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {Number(order.totalPrice).toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {order.paymentId ? `${order.paymentId.slice(0, 12)}...` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleString("ru-RU", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reviews Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Отзывы ({reviews.length})</h3>
        {reviews.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Отзывов пока нет</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-amber-500">
                      {parseFloat(review.rating).toFixed(1)}★
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(review.createdAt).toLocaleString("ru-RU", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      review.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : review.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {review.status === "approved"
                      ? "Одобрен"
                      : review.status === "rejected"
                      ? "Отклонён"
                      : "На модерации"}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{review.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
