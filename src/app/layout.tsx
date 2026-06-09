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
      <body className="antialiased">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
            <Link href="/" className="text-sm text-slate-300 transition hover:text-white">
              Home
            </Link>
            <div className="flex items-center gap-3">
              <CurrentUserIndicator />
              <Link href="/stats"className="text-sm text-slate-300 transition hover:text-white">Stats</Link>
              <Link href="/faq"className="text-sm text-slate-300 transition hover:text-white">FAQs</Link>
              <Link href="/tutorial"className="text-sm text-slate-300 transition hover:text-white">Tutorial</Link>
              <Link href="/players"className="text-sm text-slate-300 transition hover:text-white">Jugadores</Link>
              <Link href="/results"className="text-sm text-slate-300 transition hover:text-white">Resultados</Link>
              <Link href="/predictions" className="text-sm text-slate-300 transition hover:text-white">
                Predictions
              </Link>
              <Link href="/login" className="text-sm text-slate-300 transition hover:text-white">
                Login
              </Link>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
