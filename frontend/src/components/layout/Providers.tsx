"use client";

import type { ReactNode } from "react";
import type { MetaDTO, SessionUserDTO } from "@vendelia/shared";
import { ToastProvider } from "@/components/ui/Toast";
import type { Locale } from "@/i18n/config";
import { I18nProvider } from "@/i18n/I18nProvider";
import type { Messages } from "@/i18n/translate";
import { AppDataProvider } from "@/lib/meta-context";
import { CartProvider } from "@/features/cart/store";

/** All client-side context in one place: language, shared data, cart and toasts. */
export function Providers(props: { locale: Locale; messages: Messages; fallback: Messages; meta: MetaDTO; user: SessionUserDTO | null; children: ReactNode }) {
  return (
    <I18nProvider locale={props.locale} messages={props.messages} fallback={props.fallback}>
      <AppDataProvider value={{ meta: props.meta, user: props.user }}>
        <CartProvider>
          <ToastProvider>{props.children}</ToastProvider>
        </CartProvider>
      </AppDataProvider>
    </I18nProvider>
  );
}
