import { Geist, Geist_Mono } from "next/font/google";

// Portal typeface (admin + business): Geist reads well at small sizes and has even-width figures
// for tables. The customer site keeps the brand font (Inter).
const geist = Geist({ subsets: ["latin", "latin-ext"], variable: "--font-admin", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-admin-mono", display: "swap" });

/** Class for the wrapper of a portal: scopes the portal palette (styles/portal.css) and fonts. */
export const portalClass = `pui ${geist.variable} ${geistMono.variable}`;
