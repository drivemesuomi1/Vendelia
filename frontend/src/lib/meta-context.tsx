"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { MetaDTO, SessionUserDTO } from "@vendelia/shared";

interface AppData {
  meta: MetaDTO;
  user: SessionUserDTO | null;
}

const AppDataContext = createContext<AppData | null>(null);

/** Cities, categories, platform constants and the current user, loaded once per page on the server. */
export function AppDataProvider({ value, children }: { value: AppData; children: ReactNode }) {
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside <AppDataProvider>");
  return ctx;
}
