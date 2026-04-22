"use client";

import { useState, useEffect } from "react";
import {
	MousePointerClick,
	CreditCard,
	Trophy,
	Star,
	Clock,
	PlusCircle,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartModal from "@/components/CartModal";
import AuthModal from "@/components/AuthModal";
import ServiceCard from "@/components/ServiceCard";
import SuggestServiceModal from "@/components/SuggestServiceModal";
import OrderCard from "@/components/OrderCard";
import Toast from "@/components/Toast";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

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
		desc: "Безопасная оплата онлайн. Принимаем карты, СБП и электронные кошельки.",
	},
	{
		icon: <Trophy className="h-7 w-7" />,
		number: "03",
		title: "Получаете результат",
		desc: "Наши специалисты выполняют заказ быстро и конфиденциально. Мы уведомим вас о готовности.",
	},
];

const TESTIMONIALS = [
	{
		name: "Никита",
		avatar: "/images/reviews/ava1.jpg",
		text: "заказывал Исследование натлана 100%, сделали быстро и качественно",
		rating: 5,
	},
	{
		name: "Анастасия",
		avatar: "/images/reviews/ava2.jpg",
		text: "очень всегда быстро помогает и за приятную цену, огромное спасибо за помощь, не сомневаюсь, что если снова понадобится помощь, то обращусь именно к whale abyss 🥺",
		rating: 5,
	},
	{
		name: "Кирилл",
		avatar: "/images/reviews/ava3.jpg",
		text: "беру уже 2 раз!! делает работу быстро. общение очень доброжелательное, цены 🔥 всем советую)",
		rating: 5,
	},
];

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

export default function HomeClient({ categories }: { categories: any[] }) {
	const { data: session } = useSession();
	const searchParams = useSearchParams();
	const router = useRouter();

	const [showDeletedModal, setShowDeletedModal] = useState(false);

	useEffect(() => {
		if (searchParams.get("deleted") === "true") {
			setShowDeletedModal(true);
			router.replace("/");
		}
		if (searchParams.get("status") === "success") {
			setShowSuccessToast(true);
			router.replace("/");
		}
	}, [searchParams, router]);

	const [authOpen, setAuthOpen] = useState(false);
	const [suggestOpen, setSuggestOpen] = useState(false);
	const [showSuccessToast, setShowSuccessToast] = useState(false);
	const [activeOrders, setActiveOrders] = useState<OrderData[]>([]);
	const [pastOrders, setPastOrders] = useState<OrderData[]>([]);
	const [loadingOrders, setLoadingOrders] = useState(true);

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
				<section
					className="relative overflow-hidden py-16 sm:py-24"
					style={{ backgroundColor: "#ffffff" }}
				>
					<div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 sm:px-12 text-center sm:text-left">
						<div className="w-full">
							<h1
								className="mb-4 text-3xl font-black leading-tight sm:text-5xl tracking-tight text-slate-800"
								style={{
									fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
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
							<div className="w-full">
								<div className="flex items-center justify-between mb-6">
									<h2
										className="text-2xl font-black text-slate-800"
										style={{
											fontFamily:
												"var(--font-montserrat), Montserrat, sans-serif",
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
											className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-6 py-3 font-bold text-white transition-all hover:-translate-y-0.5 shadow-[0_10px_15px_-3px_rgba(30,58,138,0.2)]"
										>
											<PlusCircle className="w-5 h-5" />
											Создать заказ
										</a>
									</div>
								) : (
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										{activeOrders.map((order) => (
											<div key={order.id}>
												<OrderCard order={order} />
											</div>
										))}
									</div>
								)}
							</div>{" "}
							{pastOrders.length > 0 ? (
								<div className="w-full mt-12 z-20 relative">
									<div className="flex items-center justify-between mb-6">
										<h2
											className="text-2xl font-black text-slate-800"
											style={{
												fontFamily:
													"var(--font-montserrat), Montserrat, sans-serif",
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
												className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-3.5 font-bold text-slate-700 transition-all hover:bg-slate-50 hover:text-blue-900 shadow-sm hover:shadow-md cursor-pointer pointer-events-auto"
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
													"var(--font-montserrat), Montserrat, sans-serif",
											}}
										>
											Прошлые заказы
										</h2>
									</div>
									<div className="mt-6 flex justify-start pb-8 sm:pb-0">
										<Link
											href="/orders"
											className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-3.5 font-bold text-slate-700 transition-all hover:bg-slate-50 hover:text-blue-900 shadow-sm hover:shadow-md cursor-pointer pointer-events-auto"
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
					className="relative overflow-hidden py-24 sm:py-32"
					style={{
						backgroundColor: "#ffffff",
						backgroundImage: `
							radial-gradient(at 40% 20%, hsla(210,100%,74%,0.3) 0px, transparent 50%),
							radial-gradient(at 80% 0%, hsla(250,100%,79%,0.3) 0px, transparent 50%),
							radial-gradient(at 0% 50%, hsla(350,100%,89%,0.3) 0px, transparent 50%),
							radial-gradient(at 80% 50%, hsla(180,100%,74%,0.3) 0px, transparent 50%),
							radial-gradient(at 0% 100%, hsla(290,100%,84%,0.3) 0px, transparent 50%),
							radial-gradient(at 80% 100%, hsla(20,100%,89%,0.3) 0px, transparent 50%),
							radial-gradient(at 0% 0%, hsla(220,100%,79%,0.3) 0px, transparent 50%)
						`,
					}}
				>
					<div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 sm:px-12 lg:flex-row">
						<div className="text-left w-full sm:w-auto">
							<span
								className="mb-4 inline-block rounded-full px-4 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center sm:text-left wrap-break-word max-w-full"
								style={{
									backgroundColor: "rgba(30,58,138,0.05)",
									color: "var(--accent-primary)",
									border: "1px solid rgba(30,58,138,0.15)",
								}}
							>
								#1 Сервис сопровождения Genshin Impact
							</span>
							<h1
								className="mb-6 max-w-3xl text-3xl font-black leading-tight sm:text-5xl lg:text-6xl tracking-tight text-slate-800 wrap-break-word w-full overflow-hidden"
								style={{
									fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
									color: "#1e293b",
									wordBreak: "break-word",
									hyphens: "auto",
								}}
							>
								Ваш персональный
								<br className="hidden sm:block" />
								<span style={{ color: "var(--accent-primary)" }}>
									{" "}
									игровой ассистент
								</span>{" "}
								в
								<br />
								<span style={{ fontWeight: "bold" }}>Genshin Impact</span>
							</h1>
							<p className="mb-10 max-w-xl text-sm sm:text-lg leading-relaxed text-slate-600 font-medium wrap-break-word w-full">
								Быстро, безопасно и с гарантией результата. Позвольте экспертам
								позаботиться о вашей рутине, пока вы наслаждаетесь историей
								Тейвата.
							</p>
							<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3 w-full max-w-[100vw]">
								<a
									href="#services"
									className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-3xl px-4 sm:px-8 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5"
									style={{
										backgroundColor: "var(--accent-primary)",
										boxShadow: "0 10px 15px -3px rgba(30, 58, 138, 0.2)",
										fontFamily:
											"var(--font-montserrat), Montserrat, sans-serif",
									}}
								>
									Выбрать услугу
								</a>
								<a
									href="#how"
									className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-3xl bg-white px-4 sm:px-8 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5"
									style={{
										color: "var(--text-secondary)",
										border: "1px solid rgba(0,0,0,0.05)",
									}}
								>
									Как это работает?
								</a>
							</div>
						</div>

						{/* Right side with Image */}
						<div
							className="w-full sm:w-auto relative hidden md:block"
							style={{
								width: "450px",
								height: "450px",
								transform: "scale(1.3)",
								transformOrigin: "center right",
								marginRight: "-30px",
							}}
						>
							<div
								className="absolute inset-0 rounded-full"
								style={{
									background:
										"radial-gradient(circle, rgba(30,58,138,0.1) 0%, transparent 70%)",
									filter: "blur(20px)",
								}}
							/>
							<img
								src="/icons/whale_logo_circle.png"
								alt="Логотип Whale Abyss"
								className="relative z-10 w-full h-full object-contain"
								style={{ filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.1))" }}
							/>
						</div>
					</div>
				</section>
			)}

			{/* HOW IT WORKS */}
			{!session?.user && (
				<section id="how" className="py-20">
					<div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "75rem" }}>
						<div className="mb-12 text-center">
							<h2
								className="text-3xl font-black"
								style={{
									fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
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
												"var(--font-montserrat), Montserrat, sans-serif",
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
												"var(--font-montserrat), Montserrat, sans-serif",
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
				className="py-20 relative overflow-hidden"
				style={{
					background: "linear-gradient(to bottom, #090e17 0%, #111a2e 100%)",
				}}
			>
				<div className="absolute inset-0 pointer-events-none z-0 bg-white">
					<div
						className="absolute inset-0 opacity-70"
						style={{
							background: `radial-gradient(circle at 0% 0%, rgba(220, 235, 255, 0.5) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(200, 225, 250, 0.4) 0%, transparent 50%)`,
							filter: "blur(40px)",
						}}
					/>
					<svg
						className="absolute inset-0 w-full h-full pointer-events-none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<defs>
							<pattern
								id="tech-grid"
								width="64"
								height="64"
								patternUnits="userSpaceOnUse"
							>
								<path
									d="M 64 0 L 0 0 0 64"
									fill="none"
									stroke="#334155"
									strokeWidth="1"
									opacity="0.08"
								/>
								<path
									d="M -4 0 L 4 0 M 0 -4 L 0 4"
									fill="none"
									stroke="#334155"
									strokeWidth="2"
									opacity="0.15"
								/>
							</pattern>
						</defs>
						<rect width="100%" height="100%" fill="url(#tech-grid)" />
					</svg>
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
												"var(--font-montserrat), Montserrat, sans-serif",
											color: "black",
										}}
									>
										{category.title}
									</h3>
									<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
										{itemsToShow.map((item: any) => (
											<div key={item.id} className="w-full h-full">
												<ServiceCard item={item} />
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
								className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl px-12 py-5 text-xl font-bold transition-all hover:-translate-y-1 hover:shadow-xl focus:outline-none border-2"
								style={{
									borderColor: "var(--accent-primary)",
									color: "var(--accent-primary)",
									backgroundColor: "transparent",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.transform = "translateY(-4px)";
									e.currentTarget.style.backgroundColor =
										"rgba(30, 58, 138, 0.05)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.transform = "translateY(0)";
									e.currentTarget.style.backgroundColor = "transparent";
								}}
							>
								Все услуги
							</Link>
						)}
						<button
							onClick={() => setSuggestOpen(true)}
							className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl px-12 py-5 text-xl font-bold transition-all hover:-translate-y-1 hover:shadow-xl focus:outline-none"
							style={{
								backgroundColor: "var(--accent-primary)",
								color: "#ffffff",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.transform = "translateY(-4px)";
								e.currentTarget.style.boxShadow =
									"0 20px 25px -5px rgba(255, 255, 255, 0.1), 0 10px 10px -5px rgba(255, 255, 255, 0.04)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.transform = "translateY(0)";
								e.currentTarget.style.boxShadow = "none";
							}}
						>
							Предложить услугу
						</button>
					</div>
				</div>
			</section>

			{/* TESTIMONIALS */}
			{!session?.user && (
				<section id="testimonials" className="py-20">
					<div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "75rem" }}>
						<div className="mb-12 text-center">
							<h2
								className="text-3xl font-black"
								style={{
									fontFamily: "var(--font-montserrat), Montserrat, sans-serif",
									color: "var(--text-primary)",
								}}
							>
								Отзывы клиентов
							</h2>
							<p
								className="mt-2 text-sm"
								style={{ color: "var(--text-secondary)" }}
							>
								Более 500 довольных игроков по всей России
							</p>
						</div>
						<div
							className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
							style={{ gridAutoFlow: "dense" }}
						>
							{TESTIMONIALS.map((t) => {
								const spanClass =
									t.text.length > 120
										? "sm:col-span-2 sm:row-span-2"
										: t.text.length > 80
											? "sm:row-span-2"
											: "";

								return (
									<div
										key={t.name}
										className={`flex flex-col rounded-3xl p-6 ${spanClass}`}
										style={{
											backgroundColor: "var(--bg-card)",
											border: "1px solid var(--accent-border)",
											boxShadow: "var(--card-shadow)",
											borderRadius: "2rem",
										}}
									>
										<div className="mb-3 flex gap-0.5">
											{Array.from({ length: t.rating }).map((_, i) => (
												<Star
													key={i}
													className="h-4 w-4 fill-current shrink-0"
													style={{ color: "#f59e0b" }}
												/>
											))}
										</div>
										<p
											className={`flex-1 font-semibold leading-relaxed mb-4 ${t.text.length > 120 ? "text-lg sm:text-2xl" : "text-base sm:text-lg"}`}
											style={{ color: "var(--text-primary)" }}
										>
											&ldquo;{t.text}&rdquo;
										</p>
										<div className="flex items-center gap-3 mt-auto">
											<div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
												<img
													src={t.avatar}
													alt={t.name}
													className="h-full w-full object-cover"
												/>
											</div>
											<div>
												<p
													className="text-base font-bold"
													style={{ color: "var(--text-primary)" }}
												>
													{t.name}
												</p>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</section>
			)}

			<Footer />
			<Toast show={showSuccessToast} onClose={() => setShowSuccessToast(false)} />
		</div>
	);
}
