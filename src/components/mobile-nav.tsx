"use client";

import Link from "next/link";
import { useState } from "react";
import { CurrentUserIndicator } from "@/components/current-user-indicator";

const links = [
  ["Stats", "/stats"],
  ["FAQs", "/faq"],
  ["Tutorial", "/tutorial"],
  ["Jugadores", "/players"],
  ["Resultados", "/results"],
  ["Predictions", "/predictions"],
  ["Login", "/login"],
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-sm font-semibold text-slate-200">
          Home
        </Link>

        <div className="flex items-center gap-2">
          <CurrentUserIndicator />

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white"
          >
            Menu
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-white/10 bg-slate-950 px-4 py-3">
          <div className="grid gap-2">
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
