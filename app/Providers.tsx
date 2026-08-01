"use client";

import { SessionProvider } from "next-auth/react";
import CartSync from "@/components/CartSync";
import CartModal from "@/components/CartModal";
import ConfirmDialogHost from "@/components/ConfirmDialogHost";
import FloatingBanner from "@/components/FloatingBanner";
import ReviewPrompt from "@/components/ReviewPrompt";
import OrderEventWatcher from "@/components/OrderEventWatcher";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartSync />
      {/* Mounted ONCE here for the whole app. Pages must not render their own
          <CartModal /> - a second instance opens a second drawer over the
          first, and the two fight over the body scroll lock and focus trap. */}
      <CartModal />
      <ConfirmDialogHost />
      <FloatingBanner />
      <ReviewPrompt />
      {/* Celebration modals: «оплата прошла» / «заказ выполнен», once per order. */}
      <OrderEventWatcher />
      {children}
    </SessionProvider>
  );
}