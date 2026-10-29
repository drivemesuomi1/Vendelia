import Link from "next/link";

/** The V symbol on its own (brand decision: symbol-only logo). */
export function LogoSymbol({ height = 32 }: { height?: number }) {
  return (
    <svg viewBox="0 0 68 48" height={height} style={{ width: "auto" }} aria-hidden="true">
      <path fill="#3B32B3" d="M1.5 1.2h14.6c4.1 0 6.6 1.9 8.6 5.2l13.4 22.4c1.1 1.8 2.9 1.8 3.9 0l3.7-6.5c2.3 3.8 2.6 7.6-.2 11.2l-4.6 5.1C35.4 44 24 46.4 17.6 36.1L1 2.4c-.3-.6 0-1.2.5-1.2z" />
      <path fill="#0B7A75" d="M28.6 15.8 33.9 6.6C37 2.5 40.4 1.2 44.5 1.2h14.6c.8 0 1 .7.4 1.2-2.7 2.1-4.2 4.1-5.7 6.8L42 30.7c-1.1 1.9-2.6 1.9-3.7 0z" />
    </svg>
  );
}

export function Logo({ href, label, sub }: { href: string; label: string; sub?: string }) {
  return (
    <Link className="logo" href={href} aria-label={label}>
      <LogoSymbol />
      {sub && <span className="sub">{sub}</span>}
    </Link>
  );
}
