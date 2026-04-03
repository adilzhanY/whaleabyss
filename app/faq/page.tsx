"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronDown } from "lucide-react";

import { ReactNode } from "react";

const FAQ_ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: "1. Как оформить заказ?",
    a: (
      <>
        Вы можете оформить заказ самостоятельно на нашем официальном сайте: <a href="https://whaleabyss.ru" className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">https://whaleabyss.ru</a>. В случае возникновения технических сложностей или при желании сделать заказ напрямую, пожалуйста, свяжитесь с нами в Telegram: <a href="https://t.me/whaleabyss_official" className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">@whaleabyss_official</a>
      </>
    ),
  },
  {
    q: "2. Какие гарантии честности вы предоставляете?",
    a: (
      <>
        Мы работаем на рынке уже более двух лет и дорожим своей репутацией, а также доверием наших клиентов. Ознакомиться с отзывами о нашей работе вы можете на сайте или в Telegram-канале: <a href="https://t.me/whaleabyss" className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">https://t.me/whaleabyss</a>
      </>
    ),
  },
  {
    q: "3. Сколько времени занимает выполнение заказа?",
    a: "Срок обработки заказа — до 5 дней, выполнение занимает до 7 дней. Время реализации может варьироваться в зависимости от типа услуги и загруженности сервиса. Уточнить точные сроки исполнения можно у вашего исполнителя.",
  },
  {
    q: "4. Кто занимается выполнением заказов?",
    a: "На данный момент я курирую и выполняю все заказы самостоятельно, что гарантирует персональный контроль качества. Однако наш проект активно развивается, и в ближайшее время к работе присоединятся квалифицированные специалисты. Это позволит нам сократить время ожидания и обрабатывать большее количество заявок без потери качества",
  },
  {
    q: "5. Какие данные необходимы для оформления заказа?",
    a: "Для выполнения услуги вам потребуется предоставить адрес электронной почты и пароль от вашей учетной записи, а также указать игровой сервер. Пожалуйста, внимательно проверяйте корректность данных перед отправкой — это поможет нам приступить к работе без задержек",
  },
  {
    q: "6. Где посмотреть отзывы о вашей работе?",
    a: (
      <>
        Все отзывы реальных покупателей собраны на нашем сайте и в официальном Telegram-сообществе: <a href="https://t.me/whaleabyss/6" className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">https://t.me/whaleabyss/6</a>. Мы будем благодарны, если после выполнения заказа вы также поделитесь своим впечатлением!
      </>
    ),
  },
];

function FaqItem({ q, a }: { q: string; a: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl border overflow-hidden cursor-pointer"
      style={{ borderColor: "var(--accent-border)", backgroundColor: "var(--bg-card)", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
      onClick={() => setOpen(!open)}
    >
      <div
        className="flex w-full items-center justify-between px-6 py-5 text-left font-semibold text-lg sm:text-xl transition-colors"
        style={{ color: "var(--text-primary)" }}
      >
        <span>{q}</span>
        <ChevronDown
          className="h-6 w-6 shrink-0 transition-transform duration-300 ml-4"
          style={{
            color: "var(--accent-primary)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </div>
      <div
        className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
      >
        <div className="overflow-hidden">
          <div
            className="border-t px-6 py-5 text-base sm:text-lg leading-relaxed"
            style={{ borderColor: "var(--accent-border)", color: "var(--text-secondary)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {a}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FaqPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />

      <main className="flex-1 py-20">
        <div className="mx-auto px-4 sm:px-6" style={{ maxWidth: "50rem" }}>
          <div className="mb-12 text-center">
            <h1
              className="text-3xl font-black"
              style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "var(--text-primary)" }}
            >
              Часто задаваемые вопросы
            </h1>
          </div>
          <div className="flex flex-col gap-3">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
