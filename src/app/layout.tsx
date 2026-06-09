import type { Metadata } from "next";
import Link from "next/link";
import { CurrentUserIndicator } from "@/components/current-user-indicator";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quiniela Platform",
  description: "Multi-league football prediction platform",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="max-w-full overflow-x-hidden antialiased">
<header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur">
  <nav className="mx-auto flex max-w-full flex-wrap items-center gap-2 px-3 py-2 text-xs sm:max-w-7xl sm:px-6 sm:text-sm lg:px-10">
    <Link href="/" className="rounded-full px-2 py-1 text-slate-300 transition hover:text-white">
      Home
    </Link>

    <div className="max-w-[90px] shrink overflow-hidden rounded-full text-[10px] sm:max-w-none sm:text-sm">
      <CurrentUserIndicator />
    </div>

    {[
      ["Stats", "/stats"],
      ["FAQs", "/faq"],
      ["Tutorial", "/tutorial"],
      ["Jugadores", "/players"],
      ["Resultados", "/results"],
      ["Predictions", "/predictions"],
      ["Login", "/login"],
    ].map(([label, href]) => (
      <Link
        key={href}
        href={href}
        className="rounded-full px-2 py-1 text-slate-300 transition hover:text-white"
      >
        {label}
      </Link>
    ))}
  </nav>
</header>

        {children}
      </body>
    </html>
  );
}
