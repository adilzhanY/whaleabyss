"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { X } from "lucide-react";

export default function FloatingBanner() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);

  // Hide on admin pages
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50 group animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative">
        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 sm:p-1.5 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 z-10 hover:scale-110"
          aria-label="Close banner"
        >
          <X className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>

        {/* Banner image with cool effects */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(168,85,247,0.4)] transition-all duration-300 hover:scale-105 active:scale-95">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-blue-500/20 pointer-events-none" />

          {/* Main image */}
          <a
            href="https://t.me/whaleabyss/315"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Image
              src="/images/events/contest1.png"
              alt="Contest Banner"
              width={300}
              height={300}
              className="w-40 h-auto sm:w-52 md:w-60 lg:w-64 cursor-pointer"
              priority
            />
          </a>

          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-purple-500 animate-pulse" />
          </div>

          {/* Shine effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>
        </div>
      </div>
    </div>
  );
}
