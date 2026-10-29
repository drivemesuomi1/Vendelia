import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./i18n/config";

/**
 * Runs before routing (Next.js 16 "proxy", formerly middleware):
 * every page URL must start with a locale. "/" → "/fi" (Finnish is the main language),
 * or the language the visitor picked earlier with the language switch.
 * Role checks happen in the business/admin layouts, which ask the API who is signed in.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1];
  if (isLocale(first)) return NextResponse.next();

  const saved = req.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : DEFAULT_LOCALE;

  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API calls, uploads, Next internals and files with an extension.
  matcher: ["/((?!api|uploads|_next|.*\\..*).*)"],
};
