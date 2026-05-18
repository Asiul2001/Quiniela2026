"use client";

import { Trophy, CalendarDays, Users, Flag, ArrowUpRight, Shield, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

const upcomingMatches = [
  { home: "Argentina", away: "Japan", date: "Jun 12", time: "18:00", stage: "Group Stage" },
  { home: "Germany", away: "Mexico", date: "Jun 13", time: "21:00", stage: "Group Stage" },
  { home: "France", away: "Morocco", date: "Jun 14", time: "20:00", stage: "Group Stage" },
];

const leaderboard = [
  { rank: 1, name: "Luisa", points: 42, trend: "+8" },
  { rank: 2, name: "Carlos", points: 37, trend: "+5" },
  { rank: 3, name: "Ana", points: 35, trend: "+3" },
];

const themes = [
  { value: "standard", label: "Standard", borderColor: "rgba(148, 163, 184, 0.25)", textColor: "rgb(226, 232, 240)" },
  { value: "canada", label: "Canada energy", borderColor: "rgba(248, 113, 113, 0.25)", textColor: "rgb(254, 226, 226)" },
  { value: "usa", label: "USA lights", borderColor: "rgba(96, 165, 250, 0.25)", textColor: "rgb(219, 234, 254)" },
  { value: "mexico", label: "Mexico spirit", borderColor: "rgba(74, 222, 128, 0.25)", textColor: "rgb(220, 252, 231)" },
] as const;

type ThemeName = (typeof themes)[number]["value"];

export default function HomePage() {
  const [theme, setTheme] = useState<ThemeName>("standard");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("selected-theme") as ThemeName | null;
    if (savedTheme && themes.some((option) => option.value === savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("selected-theme", theme);
  }, [theme]);

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text)" }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: "var(--gradient-primary)" }} />
      <div
        className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
      />

      <section className="relative mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
        <nav
          className="flex items-center justify-between rounded-3xl px-5 py-4 backdrop-blur-xl"
          style={{ border: "1px solid var(--color-border-accent)", backgroundColor: "var(--color-bg-card)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 via-blue-500 to-green-500 shadow-lg shadow-blue-950/40">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">Quiniela Platform</p>
              <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                Private prediction league dashboard
              </p>
            </div>
          </div>
          <button
            className="rounded-full px-4 py-2 text-sm font-medium transition"
            style={{
              border: "1px solid var(--color-border-accent)",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              color: "var(--color-text)",
            }}
          >
            Manager view
          </button>
        </nav>

        <header className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-7">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm backdrop-blur"
              style={{
                border: "1px solid var(--color-border-accent)",
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                color: "var(--color-text-subtle)",
              }}
            >
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Canada • USA • Mexico 2026 inspired theme
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-black tracking-tight text-white md:text-7xl">
                Familia Strassburger Quiniela
              </h1>
              <p className="max-w-2xl text-lg leading-8" style={{ color: "var(--color-text-subtle)" }}>
                A modern family prediction league for the FIFA World Cup 2026, with live rankings, custom scoring,
                dark horse picks, and match-by-match drama.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {themes.map((option) => {
                const isActive = option.value === theme;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className="rounded-full px-4 py-2 text-sm font-medium transition duration-200"
                    style={{
                      border: isActive ? "1px solid var(--color-accent)" : `1px solid ${option.borderColor}`,
                      backgroundColor: isActive
                        ? "color-mix(in srgb, var(--color-accent) 20%, rgba(255, 255, 255, 0.06))"
                        : "rgba(255, 255, 255, 0.06)",
                      color: isActive ? "var(--color-text)" : option.textColor,
                      boxShadow: isActive
                        ? "0 0 0 1px color-mix(in srgb, var(--color-accent) 32%, transparent), 0 12px 30px rgba(15, 23, 42, 0.18)"
                        : "none",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="rounded-[2rem] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl"
            style={{ border: "1px solid var(--color-border-accent)", backgroundColor: "rgba(255, 255, 255, 0.06)" }}
          >
            <div
              className="rounded-[1.5rem] p-5"
              style={{
                border: "1px solid var(--color-border-accent)",
                backgroundColor: "color-mix(in srgb, var(--color-primary) 78%, transparent)",
              }}
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                    Active tournament
                  </p>
                  <h2 className="text-2xl font-bold">FIFA World Cup 2026</h2>
                </div>
                <Flag className="h-6 w-6 text-emerald-300" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard icon={<Users className="h-4 w-4" />} label="Players" value="12" />
                <StatCard icon={<Shield className="h-4 w-4" />} label="Teams" value="32" />
                <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Matches" value="5" />
              </div>

              <div
                className="mt-5 rounded-2xl p-4"
                style={{
                  border: "1px solid var(--color-border-accent)",
                  backgroundImage:
                    "linear-gradient(90deg, color-mix(in srgb, var(--color-accent-secondary) 14%, transparent), color-mix(in srgb, var(--color-accent) 16%, transparent), color-mix(in srgb, white 10%, transparent))",
                }}
              >
                <p className="text-sm font-medium text-white">Prediction phase</p>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-subtle)" }}>
                  Group stage predictions open until kickoff locks each match.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card title="Leaderboard" action="View full table">
            <div className="space-y-3">
              {leaderboard.map((player) => (
                <div
                  key={player.name}
                  className="flex items-center justify-between rounded-2xl p-4"
                  style={{ border: "1px solid var(--color-border-accent)", backgroundColor: "var(--color-bg-card)" }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                    >
                      #{player.rank}
                    </div>
                    <div>
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                        Familia Strassburger
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{player.points}</p>
                    <p className="text-xs text-emerald-300">{player.trend} this round</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Upcoming matches" action="Enter predictions">
            <div className="space-y-3">
              {upcomingMatches.map((match) => (
                <div
                  key={`${match.home}-${match.away}`}
                  className="rounded-2xl p-4"
                  style={{
                    border: "1px solid var(--color-border-accent)",
                    backgroundColor: "color-mix(in srgb, var(--color-secondary) 72%, transparent)",
                  }}
                >
                  <div className="mb-3 flex items-center justify-between text-xs" style={{ color: "var(--color-text-subtle)" }}>
                    <span>{match.stage}</span>
                    <span>
                      {match.date} • {match.time}
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <TeamName name={match.home} align="right" />
                    <div
                      className="rounded-full px-3 py-1 text-xs font-bold"
                      style={{
                        border: "1px solid var(--color-border-accent)",
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        color: "var(--color-text-subtle)",
                      }}
                    >
                      VS
                    </div>
                    <TeamName name={match.away} align="left" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </section>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ border: "1px solid var(--color-border-accent)", backgroundColor: "var(--color-bg-card)" }}>
      <div className="mb-3" style={{ color: "var(--color-text-subtle)" }}>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
        {label}
      </p>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action: string; children: ReactNode }) {
  return (
    <div
      className="rounded-[2rem] p-5 shadow-xl shadow-black/20 backdrop-blur-xl"
      style={{ border: "1px solid var(--color-border-accent)", backgroundColor: "rgba(255, 255, 255, 0.05)" }}
    >
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xl font-bold">{title}</h3>
        <button className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--color-text-subtle)" }}>
          {action}
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function TeamName({ name, align }: { name: string; align: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="text-lg font-bold text-white">{name}</p>
      <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
        Team
      </p>
    </div>
  );
}
