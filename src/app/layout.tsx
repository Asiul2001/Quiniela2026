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
          <nav className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto whitespace-nowrap px-3 py-3 text-xs sm:px-6 sm:text-sm lg:px-10">
            <Link href="/" className="shrink-0 text-slate-300 transition hover:text-white">
              Home
            </Link>

            <div className="shrink-0">
              <CurrentUserIndicator />
            </div>

            <Link href="/stats" className="shrink-0 text-slate-300 transition hover:text-white">
              Stats
            </Link>
            <Link href="/faq" className="shrink-0 text-slate-300 transition hover:text-white">
              FAQs
            </Link>
            <Link href="/tutorial" className="shrink-0 text-slate-300 transition hover:text-white">
              Tutorial
            </Link>
            <Link href="/players" className="shrink-0 text-slate-300 transition hover:text-white">
              Jugadores
            </Link>
            <Link href="/results" className="shrink-0 text-slate-300 transition hover:text-white">
              Resultados
            </Link>
            <Link href="/predictions" className="shrink-0 text-slate-300 transition hover:text-white">
              Predictions
            </Link>
            <Link href="/login" className="shrink-0 text-slate-300 transition hover:text-white">
              Login
            </Link>
          </nav>
        </header>

        {children}
      </body>
    </html>
  );
}
