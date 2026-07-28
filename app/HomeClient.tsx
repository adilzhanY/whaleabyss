"use client";

import { useState, useEffect } from "react";
import {
	CreditCard,
	Star,
	Clock,
	PlusCircle,
	ArrowRight,
	ArrowUpRight,
	CheckCircle2,
} from "lucide-react";
import type { SiteStats } from "@/lib/siteStats";
import type { CategoryTile } from "@/lib/homeShowcase";
import type { ServiceItem } from "@/lib/services";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import ServiceCard from "@/components/ServiceCard";
import SuggestServiceModal from "@/components/SuggestServiceModal";
import OrderCard from "@/components/OrderCard";
import Toast from "@/components/Toast";
import EventBanner from "@/components/EventBanner";
import DivePath from "@/components/DivePath";
import { useCart } from "@/store/useCart";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getActiveEvent } from "@/lib/events";

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

export default function HomeClient({
	tiles,
	bestsellers,
	stats,
}: {
	tiles: CategoryTile[];
	bestsellers: ServiceItem[];
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
					className="hero-mesh relative overflow-hidden pt-24 pb-20"
				>
						{/* .site-gutter + .site-container reproduce the header pill's geometry, so
						    the badge, headline, paragraph and buttons land on the same vertical
						    line as the logo at every breakpoint (see globals.css). */}
						<div className="relative z-10 site-gutter">
							<div className="site-container grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-12">
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
								{/* Right column: Valle at full height (bg removed via isnet-anime
								    matting from valle_full_height.png). Decorative, so aria-hidden. */}
								{/* Desktop only - on mobile/tablet the hero reads better as pure text. */}
								<div className="hidden w-full lg:flex justify-end" aria-hidden="true">
									<img
										src="/images/valle_full_height_nobg.png"
										alt=""
										className="h-[34rem] w-auto select-none pointer-events-none drop-shadow-[0_24px_40px_rgba(11,81,145,0.25)]"
									/>
								</div>
							</div>
						</div>
					{/* HOW IT WORKS - same mesh surface as the hero, one continuous block */}
					<div id="how" className="relative z-10 mt-14 sm:mt-16">
						<div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "75rem" }}>
							<div className="dive-panel">
								{/* rising bubbles - decoration only */}
								<span className="dive-bubble" style={{ left: "12%", width: 14, height: 14, animationDuration: "9s" }} aria-hidden />
								<span className="dive-bubble" style={{ left: "24%", width: 8, height: 8, animationDuration: "7s", animationDelay: "2s" }} aria-hidden />
								<span className="dive-bubble" style={{ left: "78%", width: 11, height: 11, animationDuration: "8s", animationDelay: "1s" }} aria-hidden />
								<span className="dive-bubble" style={{ left: "88%", width: 7, height: 7, animationDuration: "6s", animationDelay: "3.4s" }} aria-hidden />
								<span className="dive-bubble" style={{ left: "56%", width: 9, height: 9, animationDuration: "10s", animationDelay: ".6s" }} aria-hidden />
								<DivePath />
								<h2 className="dive-title">Как это работает</h2>
								<p className="dive-sub">Три простых шага до результата</p>
								<div className="dive-step">
									<div className="dive-card">
										<b>Выбираете услугу</b>
										<p>Просмотрите каталог и добавьте нужную услугу в корзину одним кликом.</p>
									</div>
									<div className="dive-node">01</div>
									<div className="dive-spacer" />
								</div>
								<div className="dive-step dive-step-right">
									<div className="dive-card">
										<b>Оплачиваете через СБП</b>
										<p>Безопасная оплата онлайн по Системе быстрых платежей - без ввода карты.</p>
										<img src="/icons/sbp.png" alt="СБП - Система быстрых платежей" className="dive-sbp" />
									</div>
									<div className="dive-node">02</div>
									<div className="dive-spacer" />
								</div>
								<div className="dive-step">
									<div className="dive-card">
										<b>Получаете результат</b>
										<p>Наши специалисты выполняют заказ быстро и конфиденциально. Мы уведомим вас о готовности.</p>
									</div>
									<div className="dive-node">03</div>
									<div className="dive-spacer" />
								</div>
								<div className="dive-fin">
									<img src="/images/valle_chibi_happy.png" alt="" aria-hidden />
									<span className="dive-chip">Заказ выполнен</span>
								</div>
							</div>
						</div>
					</div>
				</section>
			)}

			{/* EVENT BANNER */}
			{activeEvent && (
				<EventBanner eventType={activeEvent.type!} endsAt={activeEvent.endsAt} />
			)}


			{/* SERVICES GRID */}
			{/* SERVICES SHOWCASE - category tiles + one bestseller rail, flat on the
			    page ground. The graph-paper grid and the giant rounded "sheet" are gone
			    on purpose; /services remains the single full catalogue. */}
			<section id="services" className="py-20">
				<div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "75rem" }}>
					<div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
						<h2
							className="text-3xl font-black"
							style={{ fontFamily: "var(--font-primary), sans-serif", color: "var(--text-primary)" }}
						>
							Чем поможем?
						</h2>
						<Link
							href="/services"
							className="inline-flex items-center gap-1.5 text-sm font-bold transition-opacity hover:opacity-80"
							style={{ color: "var(--accent-primary)" }}
						>
							Весь каталог
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>
					{/* The big tile takes 4 cells; widen the last few singles so the
					    4-column grid always closes without holes, whatever the number
					    of categories. */}
					<div className="home-tiles">
						{tiles.map((tile, i) => (
							<Link
								key={tile.slug}
								href={`/services#${tile.slug}`}
								className={`home-tile ${i === 0 ? "home-tile-big" : ""} ${
									i > 0 && i >= tiles.length - ((4 - ((3 + tiles.length) % 4)) % 4)
										? "home-tile-wide"
										: ""
								}`}
								style={
									i === 0 && tile.images.length >= 4
										? undefined
										: tile.image
											? { backgroundImage: `url('${tile.image}')` }
											: undefined
								}
							>
								{i === 0 && tile.images.length >= 4 && (
									<span className="home-tile-collage" aria-hidden>
										{tile.images.map((img) => (
											<i key={img} style={{ backgroundImage: `url('${img}')` }} />
										))}
									</span>
								)}
								<span className="home-tile-arr" aria-hidden>
									<ArrowUpRight className="h-4 w-4" />
								</span>
								<span className="in">
									<b>{tile.title}</b>
									<small>
										{tile.count} {plural(tile.count, "услуга", "услуги", "услуг")} · от{" "}
										{tile.minPrice.toLocaleString("ru-RU")} ₽
									</small>
								</span>
							</Link>
						))}
					</div>

					{bestsellers.length > 0 && (
						<>
							<div className="mt-16 mb-6 flex flex-wrap items-baseline justify-between gap-3">
								<h2
									className="text-3xl font-black"
									style={{ fontFamily: "var(--font-primary), sans-serif", color: "var(--text-primary)" }}
								>
									Популярные услуги
								</h2>
								<Link
									href="/services"
									className="inline-flex items-center gap-1.5 text-sm font-bold transition-opacity hover:opacity-80"
									style={{ color: "var(--accent-primary)" }}
								>
									Весь каталог
									<ArrowRight className="h-4 w-4" />
								</Link>
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
								{bestsellers.map((item) => (
									<ServiceCard key={item.id} item={item} categorySlug={item.categorySlug} />
								))}
							</div>
						</>
					)}

					<div className="mt-16 flex justify-center">
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
