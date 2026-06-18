"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { CurrentUserIndicator } from "@/components/current-user-indicator";

const navLinks = [
  { href: "/stats", label: "Stats" },
  { href: "/faq", label: "FAQs" },
  { href: "/tutorial", label: "Tutorial" },
  { href: "/players", label: "Jugadores" },
  { href: "/results", label: "Resultados" },
  { href: "/predictions", label: "Predictions" },
  { href: "/login", label: "Login" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur"
      style={{
        borderColor: "var(--color-border-accent)",
        backgroundColor: "color-mix(in srgb, var(--color-primary) 88%, rgba(15, 23, 42, 0.24))",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="text-sm transition hover:text-white"
            style={{ color: "var(--color-text-subtle)" }}
          >
            Home
          </Link>

          <div className="hidden items-center gap-3 lg:flex">
            <CurrentUserIndicator />
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm transition hover:text-white"
                style={{ color: "var(--color-text-subtle)" }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border lg:hidden"
            style={{
              borderColor: "var(--color-border-accent)",
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "var(--color-text)",
            }}
            aria-label={open ? "Cerrar menu" : "Abrir menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open ? (
          <div
            className="mt-3 rounded-[1.75rem] border p-4 lg:hidden"
            style={{
              borderColor: "var(--color-border-accent)",
              backgroundColor: "color-mix(in srgb, var(--color-bg-card) 92%, rgba(10,14,24,0.4))",
              boxShadow: "0 22px 50px rgba(0, 0, 0, 0.24)",
            }}
          >
            <div className="mb-4">
              <CurrentUserIndicator />
            </div>

            <nav className="grid gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold transition"
                  style={{
                    color: "var(--color-text)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--color-border-accent)",
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
