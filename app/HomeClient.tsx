"use client";

import { useState, useEffect } from "react";
import {
	MousePointerClick,
	CreditCard,
	Trophy,
	Star,
	Clock,
	PlusCircle,
	ArrowRight,
	CheckCircle2,
	ShieldCheck,
} from "lucide-react";
import type { SiteStats } from "@/lib/siteStats";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartModal from "@/components/CartModal";
import AuthModal from "@/components/AuthModal";
import ServiceCard from "@/components/ServiceCard";
import SuggestServiceModal from "@/components/SuggestServiceModal";
import OrderCard from "@/components/OrderCard";
import Toast from "@/components/Toast";
import EventBanner from "@/components/EventBanner";
import { useCart } from "@/store/useCart";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getActiveEvent } from "@/lib/events";

const STEPS = [
	{
		icon: <MousePointerClick className="h-7 w-7" />,
		number: "01",
		title: "Выбираете услугу",
		desc: "Просмотрите каталог и добавьте нужную услугу в корзину одним кликом.",
	},
	{
		icon: <CreditCard className="h-7 w-7" />,
		number: "02",
		title: "Оплачиваете",
		desc: "Безопасная оплата онлайн через СБП (Систему быстрых платежей).",
	},
	{
		icon: <Trophy className="h-7 w-7" />,
		number: "03",
		title: "Получаете результат",
		desc: "Наши специалисты выполняют заказ быстро и конфиденциально. Мы уведомим вас о готовности.",
	},
];

/** Shape of GET /api/reviews — the same endpoint /reviews uses. */
interface HomeReview {
	id: string;
	rating: string;
	description: string;
	userName: string | null;
	userAvatar: string | null;
}

const REVIEWS_PAGE = 5;

/** Mirrors the half-star rendering on /reviews so both pages agree. */
function renderStars(rating: number) {
	const stars = [];
	for (let i = 0; i < Math.floor(rating); i++) {
		stars.push(
			<Star key={i} className="h-3.5 w-3.5 fill-current shrink-0" style={{ color: "#f59e0b" }} />
		);
	}
	if (rating % 1 !== 0) {
		stars.push(
			<div key="half" className="relative h-3.5 w-3.5 shrink-0">
				<Star className="h-3.5 w-3.5 absolute" style={{ color: "#f59e0b", opacity: 0.3 }} />
				<div className="overflow-hidden absolute" style={{ width: "50%" }}>
					<Star className="h-3.5 w-3.5 fill-current" style={{ color: "#f59e0b" }} />
				</div>
			</div>
		);
	}
	return stars;
}

interface OrderItem {
	serviceId?: string;
	serviceTitle?: string;
	serviceImage?: string;
	[key: string]: unknown;
}

interface OrderData {
	id: string;
	status: string;
	createdAt: string;
	totalAmount?: number | string;
	items?: OrderItem[];
	[key: string]: unknown;
}

/** Russian count forms: 1 отзыв / 2–4 отзыва / 5+ отзывов. */
function plural(n: number, one: string, few: string, many: string) {
	const m10 = n % 10;
	const m100 = n % 100;
	if (m10 === 1 && m100 !== 11) return one;
	if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
	return many;
}

/**
 * Product illustration for the right half of the fold.
 *
 * Replaces a 50% void. Deliberately a real-looking order card rather than a
 * hand-drawn SVG: it counterbalances the headline, shows what the product
 * actually is, and reinforces trust — all at once. Marked aria-hidden because
 * it is illustrative, not live data.
 */
function HeroOrderCard() {
	return (
		<div className="w-full max-w-sm mx-auto lg:mx-0" aria-hidden="true">
			<div className="rounded-[14px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_50px_-24px_rgba(15,27,45,0.4)] backdrop-blur-sm">
				<div className="flex items-center justify-between">
					<span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
						Ваш заказ
					</span>
					<span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
						Выполняется
					</span>
				</div>
				<p className="mt-3 text-lg font-bold text-slate-900">Спиральная Бездна</p>
				<p className="text-sm text-slate-500">Этажи 9–12, полное прохождение</p>
				<div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
					<div
						className="h-full w-3/4 rounded-full"
						style={{ backgroundColor: "var(--accent-primary)" }}
					/>
				</div>
				<div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
					<span>9 из 12 этажей</span>
					<span>75%</span>
				</div>
				<div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-xs font-bold text-white">
							К
						</div>
						<div className="leading-tight">
							<p className="text-xs font-semibold text-slate-700">Ваш качер</p>
							<p className="text-[11px] text-slate-400">на связи в Telegram</p>
						</div>
					</div>
					<ShieldCheck className="h-5 w-5 text-slate-300" />
				</div>
			</div>
		</div>
	);
}

export default function HomeClient({
	categories,
	stats,
}: {
	categories: any[];
	stats?: SiteStats;
}) {
	const { data: session } = useSession();
	const searchParams = useSearchParams();
	const router = useRouter();
	const clearCart = useCart((state) => state.clearCart);

	const [showDeletedModal, setShowDeletedModal] = useState(false);

	// Live reviews — same endpoint and page size as /reviews. The homepage used
	// to ship three hardcoded testimonials: invented praise attributed to named
	// people, which also never reflected a real new review.
	const [reviews, setReviews] = useState<HomeReview[]>([]);
	const [reviewsLoading, setReviewsLoading] = useState(true);
	const [reviewsMoreLoading, setReviewsMoreLoading] = useState(false);
	const [reviewsHasMore, setReviewsHasMore] = useState(false);

	const fetchReviews = async (offset = 0) => {
		if (offset === 0) setReviewsLoading(true);
		else setReviewsMoreLoading(true);
		try {
			const res = await fetch(`/api/reviews?offset=${offset}&limit=${REVIEWS_PAGE}`);
			if (!res.ok) throw new Error(`reviews request failed: ${res.status}`);
			const data = await res.json();
			const batch: HomeReview[] = Array.isArray(data.reviews) ? data.reviews : [];
			setReviews((prev) => (offset === 0 ? batch : [...prev, ...batch]));
			setReviewsHasMore(Boolean(data.hasMore));
		} catch (err) {
			// The section just doesn't render rather than showing a broken state.
			console.error("Failed to load reviews:", err);
			if (offset === 0) setReviews([]);
			setReviewsHasMore(false);
		} finally {
			setReviewsLoading(false);
			setReviewsMoreLoading(false);
		}
	};

	useEffect(() => {
		fetchReviews(0);
	}, []);

	// Trust figures come straight from the DB (lib/siteStats). Anything we
	// cannot back with a real number is omitted rather than invented — these
	// are claims made to paying customers, not decoration.
	const priceAnchor = stats?.minPrice
		? ` — от ${stats.minPrice.toLocaleString("ru-RU")} ₽`
		: "";
	const trustSignals: { icon: React.ReactNode; label: string }[] = [];
	if (stats?.rating != null && stats.reviewCount > 0) {
		trustSignals.push({
			icon: <Star className="h-4 w-4 fill-amber-400 text-amber-400" />,
			label: `${stats.rating.toFixed(1).replace(".", ",")} · ${stats.reviewCount} ${plural(
				stats.reviewCount,
				"отзыв",
				"отзыва",
				"отзывов",
			)}`,
		});
	}
	if (stats?.completedOrders) {
		trustSignals.push({
			icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
			label: `${stats.completedOrders} ${plural(
				stats.completedOrders,
				"выполненный заказ",
				"выполненных заказа",
				"выполненных заказов",
			)}`,
		});
	}
	trustSignals.push({
		icon: <CreditCard className="h-4 w-4 text-slate-400" />,
		label: "Оплата через СБП",
	});

	useEffect(() => {
		if (searchParams.get("deleted") === "true") {
			setShowDeletedModal(true);
			router.replace("/");
		}
		if (searchParams.get("status") === "success") {
			setShowSuccessToast(true);
			clearCart();
			router.replace("/");
		}
	}, [searchParams, router, clearCart]);

	const [authOpen, setAuthOpen] = useState(false);
	const [suggestOpen, setSuggestOpen] = useState(false);
	const [showSuccessToast, setShowSuccessToast] = useState(false);
	const [activeOrders, setActiveOrders] = useState<OrderData[]>([]);
	const [pastOrders, setPastOrders] = useState<OrderData[]>([]);
	const [loadingOrders, setLoadingOrders] = useState(true);

	// Check for active event
	const activeEvent = getActiveEvent();

	useEffect(() => {
		if (session?.user) {
			fetch("/api/user/orders/active")
				.then((res) => res.json())
				.then((data) => {
					if (Array.isArray(data)) {
						setActiveOrders(data);
					}
				})
				.catch(console.error)
				.finally(() => setLoadingOrders(false));

			fetch("/api/user/orders/past")
				.then((res) => res.json())
				.then((data) => {
					if (Array.isArray(data)) {
						setPastOrders(data);
					}
				})
				.catch(console.error);
		} else {
			setLoadingOrders(false);
		}
	}, [session]);

	return (
		<div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
			<Header onAuthOpen={() => setAuthOpen(true)} />
			<CartModal />
			<AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
			<SuggestServiceModal
				isOpen={suggestOpen}
				onClose={() => setSuggestOpen(false)}
			/>

			{/* HERO / DASHBOARD */}
			{session?.user ? (
				<section className="hero-mesh relative overflow-hidden pt-24 pb-16 sm:pb-24">
					<div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 sm:px-12 text-center sm:text-left">
						<div className="w-full">
							<h1
								className="mb-4 text-3xl font-black leading-tight sm:text-5xl tracking-tight text-slate-800"
								style={{
									fontFamily: "var(--font-primary), sans-serif",
								}}
							>
								Привет,{" "}
								<span style={{ color: "var(--accent-primary)" }}>
									{session.user.name}
								</span>
								!
							</h1>
							<p className="mb-10 max-w-xl text-lg text-slate-600 font-medium mx-auto sm:mx-0">
								Это ваша панель управления. Здесь вы можете следить за статусом
								текущих заказов и быстро оформлять новые.
							</p>
							{session.user.role === "booster" && (
								<div className="mb-10">
									<Link
										href="/portal"
										className="btn-primary inline-flex items-center justify-center !px-6 sm:!px-8 !py-3.5 !text-sm !font-bold w-full sm:w-auto"
									>
										Перейти на портал
									</Link>
								</div>
							)}
							<div className="w-full">
								<div className="flex items-center justify-between mb-6">
									<h2
										className="text-2xl font-black text-slate-800"
										style={{
											fontFamily:
												"var(--font-primary), sans-serif",
										}}
									>
										Активные заказы
									</h2>
								</div>

								{loadingOrders ? (
									<div className="text-slate-500 py-12 bg-slate-50 rounded-3xl border border-slate-100">
										<Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-300" />
										Загрузка заказов...
									</div>
								) : activeOrders.length === 0 ? (
									<div className="text-slate-500 py-16 px-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center">
										<div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm mb-4">
											<Clock className="w-8 h-8 text-slate-400" />
										</div>
										<p className="text-lg font-bold text-slate-700 mb-2">
											У вас пока нет активных заказов
										</p>
										<p className="text-sm text-slate-500 mb-6 max-w-md">
											Выберите интересующую вас услугу из каталога и оформите
											заказ, чтобы мы сразу могли приступить к делу.
										</p>
										<a
											href="#services"
											className="btn-primary inline-flex items-center justify-center gap-2 !px-6 !py-3 !font-bold"
										>
											<PlusCircle className="w-5 h-5" />
											Создать заказ
										</a>
									</div>
								) : (
									<>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											{activeOrders.slice(0, 4).map((order) => (
												<div key={order.id}>
													<OrderCard order={order} />
												</div>
											))}
										</div>
										{activeOrders.length > 4 && (
											<div className="mt-6 flex justify-center">
												<Link
													href="/orders"
													className="btn-primary inline-flex items-center justify-center gap-2 !px-6 sm:!px-8 !py-3 !font-bold w-full sm:w-auto"
												>
													Показать все заказы ({activeOrders.length})
												</Link>
											</div>
										)}
									</>
								)}
							</div>{" "}
							{pastOrders.length > 0 ? (
								<div className="w-full mt-12 z-20 relative">
									<div className="flex items-center justify-between mb-6">
										<h2
											className="text-2xl font-black text-slate-800"
											style={{
												fontFamily:
													"var(--font-primary), sans-serif",
											}}
										>
											Прошлые заказы
										</h2>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-75 hover:opacity-100 transition-opacity">
										{pastOrders.slice(0, 3).map((order) => (
											<div key={order.id}>
												<OrderCard order={order} isGrayscale />
											</div>
										))}
									</div>
									{pastOrders.length > 3 && (
										<div className="mt-6 flex justify-start pb-8 sm:pb-0">
											<Link
												href="/orders"
												className="btn-secondary !px-8 !py-3.5 !font-bold"
											>
												Посмотреть все заказы
											</Link>
										</div>
									)}
								</div>
							) : (
								<div className="w-full mt-12 z-20 relative">
									<div className="flex items-center justify-between mb-6">
										<h2
											className="text-2xl font-black text-slate-800"
											style={{
												fontFamily:
													"var(--font-primary), sans-serif",
											}}
										>
											Прошлые заказы
										</h2>
									</div>
									<div className="mt-6 flex justify-start pb-8 sm:pb-0">
										<Link
											href="/orders"
											className="btn-secondary !px-8 !py-3.5 !font-bold"
										>
											Посмотреть все заказы
										</Link>
									</div>
								</div>
							)}
						</div>
					</div>
				</section>
			) : (
				<section
					id="hero"
					className="hero-mesh relative overflow-hidden pt-24 pb-24 sm:pb-32"
				>
						{/* .site-gutter + .site-container reproduce the header pill's geometry, so
						    the badge, headline, paragraph and buttons land on the same vertical
						    line as the logo at every breakpoint (see globals.css). */}
						<div className="relative z-10 site-gutter">
							<div className="site-container grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-12">
								<div className="text-left w-full">
									{/* Chip, not a pill — 8px in the new radius scale. Cyrillic caps need
									    more tracking than the old value gave them. */}
									<span
										className="mb-5 inline-block rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase max-w-full"
										style={{
											backgroundColor: "rgba(30,58,138,0.06)",
											color: "var(--accent-primary)",
											border: "1px solid rgba(30,58,138,0.14)",
											letterSpacing: "0.14em",
										}}
									>
										Сопровождение Genshin Impact
									</span>
									{/* One colour: emphasis now comes from the background glow instead of a
									    second hue that the old mesh cancelled out anyway. The one-letter
									    preposition «в» is bound with a non-breaking space — leaving it at a
									    line end is a hard no in Russian typesetting. */}
									<h1
										className="mb-5 text-[2rem] font-black leading-[1.08] sm:text-5xl lg:text-[3.4rem] tracking-tight text-slate-900"
										style={{ fontFamily: "var(--font-primary), sans-serif", textWrap: "balance" }}
									>
										Ваш персональный игровой ассистент в&nbsp;Genshin&nbsp;Impact
									</h1>
									<p
										className="mb-8 text-[1.0625rem] sm:text-lg leading-relaxed text-slate-700"
										style={{ maxWidth: "58ch", textWrap: "pretty" }}
									>
										Быстро, безопасно и с гарантией результата. Позвольте экспертам
										позаботиться о вашей рутине, пока вы наслаждаетесь историей Тейвата.
									</p>
									{/* Unambiguous hierarchy: one filled pill — the only 999px radius left
									    on the page — plus a text link. The old pair were the same size and
									    shape, and the ghost button disappeared into the mesh. */}
									<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6">
										<a
											href="#services"
											className="btn-primary w-full sm:w-auto !px-7 !py-3.5 !text-sm !font-bold text-center"
										>
											Выбрать услугу{priceAnchor}
										</a>
										<a
											href="#how"
											className="group inline-flex items-center justify-center sm:justify-start gap-1.5 text-sm font-semibold"
											style={{ color: "var(--accent-primary)" }}
										>
											Как это работает
											<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
										</a>
									</div>
									{/* Trust strip. Every figure comes from lib/siteStats (live DB) — a
									    signal is omitted rather than rounded up or invented. */}
									{trustSignals.length > 0 && (
										<ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-slate-600">
											{trustSignals.map((s, i) => (
												<li key={i} className="flex items-center gap-1.5">
													{s.icon}
													<span>{s.label}</span>
												</li>
											))}
										</ul>
									)}
								</div>
								{/* Right column: a real order card, not decoration. It counterbalances
								    the headline, explains the product, and carries trust at once. */}
								<HeroOrderCard />
							</div>
						</div>
				</section>
			)}

			{/* EVENT BANNER */}
			{activeEvent && (
				<EventBanner eventType={activeEvent.type!} endsAt={activeEvent.endsAt} />
			)}

			{/* HOW IT WORKS */}
			{!session?.user && (
				<section id="how" className="py-20">
					<div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "75rem" }}>
						<div className="mb-12 text-center">
							<h2
								className="text-3xl font-black"
								style={{
									fontFamily: "var(--font-primary), sans-serif",
									color: "var(--text-primary)",
								}}
							>
								Как это работает
							</h2>
							<p
								className="mt-2 text-sm"
								style={{ color: "var(--text-secondary)" }}
							>
								Три простых шага до результата
							</p>
						</div>
						<div className="grid gap-6 sm:grid-cols-3">
							{STEPS.map((step) => (
								<div
									key={step.number}
									className="relative rounded-2xl p-6"
									style={{
										backgroundColor: "var(--bg-card)",
										border: "1px solid var(--accent-border)",
										boxShadow: "var(--card-shadow)",
									}}
								>
									<span
										className="absolute right-5 top-5 text-4xl font-black opacity-10"
										style={{
											color: "var(--accent-primary)",
											fontFamily:
												"var(--font-primary), sans-serif",
										}}
									>
										{step.number}
									</span>
									<div
										className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
										style={{
											backgroundColor: "var(--bg-highlight)",
											color: "var(--accent-primary)",
										}}
									>
										{step.icon}
									</div>
									<h3
										className="mb-2 text-base font-bold"
										style={{
											fontFamily:
												"var(--font-primary), sans-serif",
											color: "var(--text-primary)",
										}}
									>
										{step.title}
									</h3>
									<p
										className="text-sm leading-relaxed"
										style={{ color: "var(--text-secondary)" }}
									>
										{step.desc}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>
			)}

			{/* SERVICES GRID */}
			<section
				id="services"
				className="py-20 relative overflow-hidden rounded-t-[2.5rem] sm:rounded-t-[3.5rem] -mt-8 sm:-mt-14 shadow-[0_-24px_60px_-28px_rgba(15,23,42,0.22)]"
				style={{
					background: "linear-gradient(to bottom, #090e17 0%, #111a2e 100%)",
				}}
			>
				<div className="absolute inset-0 pointer-events-none z-0 bg-white">
					<div className="services-fog absolute inset-0 opacity-70" />
					{/* Subtle two-tier graph-paper grid: fine 40px cells + bolder 200px
					    lines, gently faded toward the left/right edges. */}
					<div className="services-grid absolute inset-0" />
				</div>

				<div
					className="mx-auto px-4 sm:px-6 relative z-10"
					style={{ maxWidth: "75rem" }}
				>
					<div className="flex flex-col gap-12">
						{categories.map((category, index) => {
							if (session?.user && index > 1) return null;
							const itemsToShow =
								session?.user && index === 1
									? category.items.slice(0, 5)
									: category.items;

							return (
								<div key={category.id} className="flex flex-col gap-6">
									<h3
										className="text-2xl font-bold"
										style={{
											fontFamily:
												"var(--font-primary), sans-serif",
											color: "var(--text-primary)",
										}}
									>
										{category.title}
									</h3>
									<div
										className={
											category.slug === "actual"
												? "grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6"
												: "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6"
										}
									>
										{itemsToShow.map((item: any) => (
											<div key={item.id} className="w-full h-full">
												<ServiceCard item={item} categorySlug={category.slug} />
											</div>
										))}
									</div>
								</div>
							);
						})}
					</div>

					<div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
						{session?.user && (
							<Link
								href="/services"
								className="btn-secondary w-full sm:w-auto !px-12 !py-5 !text-xl !font-bold"
							>
								Все услуги
							</Link>
						)}
						<button
							onClick={() => setSuggestOpen(true)}
							className="btn-primary w-full sm:w-auto !px-12 !py-5 !text-xl !font-bold"
						>
							Предложить услугу
						</button>
					</div>
				</div>
			</section>

			{/* TESTIMONIALS */}
			{!session?.user && !reviewsLoading && reviews.length > 0 && (
				<section id="testimonials" className="py-20">
					<div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "75rem" }}>
						<div className="mb-12 text-center">
							<h2
								className="text-3xl font-black"
								style={{
									fontFamily: "var(--font-primary), sans-serif",
									color: "var(--text-primary)",
								}}
							>
								Отзывы клиентов
							</h2>
							<p
								className="mt-2 text-sm"
								style={{ color: "var(--text-secondary)" }}
							>
								{/* Was "Более 500 довольных игроков по всей России" — a number nobody
								    could back. Uses the live count, or says nothing. */}
								{stats?.reviewCount
									? `${stats.reviewCount} ${plural(stats.reviewCount, "отзыв", "отзыва", "отзывов")} от наших клиентов`
									: "Что говорят наши клиенты"}
							</p>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
							{reviews.map((review) => {
								const rating = parseFloat(review.rating);
								const name = review.userName || "Клиент";
								return (
									<div
										key={review.id}
										className="flex flex-col p-5 sm:p-6 transition-shadow duration-300 hover:shadow-xl"
										style={{
											backgroundColor: "var(--bg-card)",
											border: "1px solid var(--accent-border)",
											boxShadow: "var(--card-shadow)",
											borderRadius: "1.5rem",
										}}
									>
									<div className="mb-4 flex items-center gap-3">
										<div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200">
											{review.userAvatar ? (
												<img src={review.userAvatar} alt={name} className="h-full w-full object-cover" />
											) : (
												<div
													className="flex h-full w-full items-center justify-center text-sm font-bold"
													style={{ color: "var(--accent-primary)" }}
												>
													{name.charAt(0).toUpperCase()}
												</div>
											)}
										</div>
										<p className="min-w-0 flex-1 truncate text-base font-bold" style={{ color: "var(--text-primary)" }}>
											{name}
										</p>
										<div className="flex shrink-0 gap-0.5">{renderStars(rating)}</div>
									</div>
									<p
										className="flex-1 leading-relaxed italic text-[0.9375rem]"
										style={{ color: "var(--text-primary)", overflowWrap: "break-word" }}
									>
										&ldquo;{review.description}&rdquo;
									</p>
									</div>
								);
							})}
						</div>

						{reviewsHasMore && (
							<div className="mt-10 flex justify-center">
								<button
									onClick={() => fetchReviews(reviews.length)}
									disabled={reviewsMoreLoading}
									className="btn-secondary btn-lg"
								>
									{reviewsMoreLoading ? "Загружаем..." : "Показать ещё"}
								</button>
							</div>
						)}
					</div>
				</section>
			)}

			<Footer />
			<Toast show={showSuccessToast} onClose={() => setShowSuccessToast(false)} />
		</div>
	);
}
