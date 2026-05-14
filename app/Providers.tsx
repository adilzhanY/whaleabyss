"use client";

import { SessionProvider } from "next-auth/react";
import CartSync from "@/components/CartSync";
import CartModal from "@/components/CartModal";
import FloatingBanner from "@/components/FloatingBanner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartSync />
      <CartModal />
      <FloatingBanner />
      {children}
    </SessionProvider>
  );
}