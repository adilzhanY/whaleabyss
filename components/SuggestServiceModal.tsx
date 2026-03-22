"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface SuggestServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SuggestServiceModal({ isOpen, onClose }: SuggestServiceModalProps) {
  const [show, setShow] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      // slight delay for animation
      setTimeout(() => setAnimate(true), 10);
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${animate ? "opacity-100" : "opacity-0"
          }`}
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${animate ? "translate-y-0 scale-100 opacity-100" : "translate-y-8 scale-95 opacity-0"
          }`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3
          className="mb-4 text-2xl font-black"
          style={{ fontFamily: "var(--font-montserrat), Montserrat, sans-serif", color: "#1e3a8a" }}
        >
          Предложить услугу
        </h3>

        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          Если на сайте нет нужной вам услуги, напишите нам в Telegram. Мы свяжемся с вами.
        </p>

        <a
          href="https://t.me/whaleabyss"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#2AABEE] px-4 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2AABEE]/30"
        >
          <Image
            src="/icons/tg_logo.png"
            alt="Telegram"
            width={24}
            height={24}
            className="object-contain"
          />
          Написать в Телеграм
        </a>
      </div>
    </div>
  );
}
