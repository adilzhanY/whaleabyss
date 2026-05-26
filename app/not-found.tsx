"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Home } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  const [, setAuthOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header onAuthOpen={() => setAuthOpen(true)} />

      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 flex items-center justify-center">
        <div className="mx-auto max-w-xl text-center">
          <Image
            src="/images/valle_chibi_sad.png"
            alt="Валле расстроена"
            width={140}
            height={140}
            className="mx-auto mb-4 h-28 w-28 sm:h-36 sm:w-36 object-contain"
            priority
          />

          <h1
            className="font-black leading-none"
            style={{
              fontFamily: "var(--font-primary), sans-serif",
              color: "#0B5191",
              fontSize: "clamp(6rem, 22vw, 12rem)",
            }}
          >
            404
          </h1>

          <h2
            className="mt-2 text-2xl sm:text-3xl font-black"
            style={{ fontFamily: "var(--font-primary), sans-serif", color: "var(--text-primary)" }}
          >
            Такой страницы не существует
          </h2>

          <p className="mt-3 text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
            Возможно, ссылка устарела или была введена с ошибкой. Давайте вернёмся на главную.
          </p>

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm sm:text-base font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#0B5191" }}
          >
            <Home size={18} />
            На главную
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
