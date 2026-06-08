"use client";

import {
  Trophy,
  CalendarDays,
  Users,
  Flag,
  ArrowUpRight,
  Shield,
  Sparkles,
  TimerReset,
  Activity,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { PRIMARY_OWNER_NAME } from "@/lib/app-config";
import { getUserDisplayName } from "@/lib/auth";
import { getCountryFlagUrl } from "@/lib/country-flags";
import type { HomePageData, HomePageLeaderboardEntry, HomePageMatch } from "@/lib/homepage-data";
import { useAuthUser } from "@/hooks/use-auth-user";

function formatLocalKickoff(kickoffAt: string) {
  const date = new Date(kickoffAt);
  return {
    date: new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date),
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function getMatchStatusLabel(status?: string) {
  if (status === "live") {
    return "Live now";
  }

  if (status === "completed") {
    return "Finished";
  }

  return "Scheduled";
}

const themes = [
  { value: "standard", label: "Standard", borderColor: "rgba(148, 163, 184, 0.25)", textColor: "rgb(226, 232, 240)" },
  { value: "canada", label: "Canada energy", borderColor: "rgba(248, 113, 113, 0.25)", textColor: "rgb(254, 226, 226)" },
  { value: "usa", label: "USA lights", borderColor: "rgba(96, 165, 250, 0.25)", textColor: "rgb(219, 234, 254)" },
  { value: "mexico", label: "Mexico spirit", borderColor: "rgba(74, 222, 128, 0.25)", textColor: "rgb(220, 252, 231)" },
] as const;

type ThemeName = (typeof themes)[number]["value"];
const THEME_STORAGE_KEY = "selected-theme";
const THEME_CHANGE_EVENT = "selected-theme-change";

function isThemeName(value: string | null): value is ThemeName {
  return value !== null && themes.some((option) => option.value === value);
}

function getThemeSnapshot(): ThemeName {
  if (typeof window === "undefined") {
    return "standard";
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeName(savedTheme) ? savedTheme : "standard";
}

function getThemeServerSnapshot(): ThemeName {
  return "standard";
}

function subscribeToTheme(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleThemeChange = () => callback();

  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  window.addEventListener("storage", handleThemeChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.removeEventListener("storage", handleThemeChange);
  };
}

function persistTheme(theme: ThemeName) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function HomePageClient({ data }: { data: HomePageData }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getThemeServerSnapshot);
  const { user } = useAuthUser();
  const isPrimaryOwner = getUserDisplayName(user)?.trim().toLowerCase() === PRIMARY_OWNER_NAME.toLowerCase();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text)" }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: "var(--gradient-primary)" }} />
      <div
        className="absolute inset-x-0 top-[-8rem] h-[36rem] opacity-80 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, color-mix(in srgb, var(--color-accent) 24%, transparent), transparent 32%), radial-gradient(circle at 80% 18%, rgba(255,255,255,0.18), transparent 22%), radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--color-accent-secondary) 16%, transparent), transparent 28%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(255,255,255,0.22), transparent 42%), radial-gradient(ellipse at top left, rgba(255,255,255,0.12), transparent 28%), radial-gradient(ellipse at top right, rgba(255,255,255,0.1), transparent 28%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-28 h-[32rem] w-[72rem] -translate-x-1/2 rounded-[50%] opacity-30"
        style={{
          border: "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)",
          boxShadow: "0 0 120px rgba(255,255,255,0.06)",
        }}
      />
      <PitchLines />

      <section className="relative mx-auto flex max-w-7xl flex-col gap-10 px-6 py-8 lg:px-10 lg:py-10">
        <nav
          className="flex items-center justify-between rounded-[2rem] px-5 py-4 backdrop-blur-2xl"
          style={{
            border: "1px solid var(--color-border-accent)",
            backgroundColor: "color-mix(in srgb, var(--color-bg-card) 88%, rgba(10, 14, 24, 0.3))",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.28)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 via-blue-500 to-green-500 shadow-lg shadow-blue-950/40">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.24em] uppercase">Quiniela Platform</p>
              <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                Private prediction league dashboard
              </p>
            </div>
          </div>
          {isPrimaryOwner ? (
            <Link
              href="/admin"
              className="rounded-full px-4 py-2 text-sm font-medium transition duration-200 hover:-translate-y-0.5"
              style={{
                border: "1px solid var(--color-border-accent)",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                color: "var(--color-text)",
                boxShadow: "0 12px 24px rgba(0, 0, 0, 0.14)",
              }}
            >
              Admin tools
            </Link>
          ) : null}
        </nav>

        <header className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-stretch">
          <div
            className="relative overflow-hidden rounded-[2.5rem] px-7 py-8 sm:px-9 sm:py-10 lg:min-h-[42rem] lg:px-10 lg:py-12"
            style={{
              border: "1px solid var(--color-border-accent)",
              background:
                "linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 80%, rgba(255,255,255,0.04)) 0%, color-mix(in srgb, var(--color-secondary) 84%, transparent) 100%)",
              boxShadow: "0 40px 100px rgba(0, 0, 0, 0.34)",
            }}
          >
            <div
              className="absolute right-[-10%] top-[-12%] h-64 w-64 rounded-full blur-3xl"
              style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 28%, transparent)" }}
            />
            <div
              className="absolute bottom-[-12%] left-[-4%] h-56 w-56 rounded-full blur-3xl"
              style={{ backgroundColor: "color-mix(in srgb, var(--color-accent-secondary) 20%, transparent)" }}
            />

            <div className="relative flex h-full flex-col justify-between gap-10">
              <div className="space-y-8">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm backdrop-blur"
                  style={{
                    border: "1px solid var(--color-border-accent)",
                    backgroundColor: "rgba(255, 255, 255, 0.06)",
                    color: "var(--color-text-subtle)",
                  }}
                >
                  <Sparkles className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
                  Canada - USA - Mexico 2026 inspired theme
                </div>

                <div className="space-y-6">
                  <h1 className="max-w-5xl text-5xl font-black tracking-[-0.05em] text-white sm:text-6xl lg:text-8xl">
                    {data.leagueName}
                  </h1>
                  <p className="max-w-2xl text-lg leading-8 sm:text-xl" style={{ color: "var(--color-text-subtle)" }}>
                    {data.leagueDescription}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {themes.map((option) => {
                    const isActive = option.value === theme;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => persistTheme(option.value)}
                        className="rounded-full px-4 py-2 text-sm font-medium transition duration-300 hover:-translate-y-0.5"
                        style={{
                          border: isActive ? "1px solid var(--color-accent)" : `1px solid ${option.borderColor}`,
                          backgroundColor: isActive
                            ? "color-mix(in srgb, var(--color-accent) 22%, rgba(255, 255, 255, 0.08))"
                            : "rgba(255, 255, 255, 0.06)",
                          color: isActive ? "var(--color-text)" : option.textColor,
                          boxShadow: isActive
                            ? "0 0 0 1px color-mix(in srgb, var(--color-accent) 26%, transparent), 0 0 28px color-mix(in srgb, var(--color-accent) 32%, transparent), 0 18px 40px rgba(0, 0, 0, 0.24)"
                            : "0 10px 24px rgba(0, 0, 0, 0.12)",
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/predictions"
                    className="inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5"
                    style={{
                      border: "1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)",
                      backgroundColor: "color-mix(in srgb, var(--color-accent) 18%, rgba(255, 255, 255, 0.08))",
                      color: "var(--color-text)",
                      boxShadow: "0 18px 40px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    Enter predictions
                  </Link>
                  <Link
                    href="/players"
                    className="rounded-full px-5 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5"
                    style={{
                      border: "1px solid var(--color-border-accent)",
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                      color: "var(--color-text-subtle)",
                    }}
                  >
                    Browse players
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                <div
                  className="rounded-[2rem] p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1"
                  style={{
                    border: "1px solid var(--color-border-accent)",
                    backgroundColor: "rgba(255, 255, 255, 0.06)",
                    boxShadow: "0 24px 50px rgba(0, 0, 0, 0.22)",
                  }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em]" style={{ color: "var(--color-text-subtle)" }}>
                        Prediction completion
                      </p>
                      <p className="mt-2 text-3xl font-black">{data.predictionCompletion}% ready</p>
                    </div>
                    <Activity className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
                  </div>

                  <ProgressBar value={data.predictionCompletion} />

                  <div className="mt-4 flex items-center justify-between text-sm" style={{ color: "var(--color-text-subtle)" }}>
                    <span>Pool-wide completion</span>
                    <span>{data.upcomingMatches.length} featured fixtures</span>
                  </div>
                </div>

                <div
                  className="rounded-[2rem] p-5 transition duration-300 hover:-translate-y-1"
                  style={{
                    border: "1px solid color-mix(in srgb, var(--color-accent) 28%, var(--color-border-accent))",
                    background:
                      "linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 12%, rgba(255,255,255,0.05)), rgba(255,255,255,0.04))",
                    boxShadow: "0 22px 44px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  <p className="text-xs uppercase tracking-[0.24em]" style={{ color: "var(--color-text-subtle)" }}>
                    Matchday pulse
                  </p>
                  <p className="mt-3 text-4xl font-black">{data.stats.players}</p>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-subtle)" }}>
                    Active players currently tracked in the league table.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:min-h-[42rem]">
            <div
              className="rounded-[2.25rem] p-6 shadow-2xl shadow-black/35 backdrop-blur-2xl transition duration-300 hover:-translate-y-1"
              style={{
                border: "1px solid var(--color-border-accent)",
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                boxShadow: "0 36px 80px rgba(0, 0, 0, 0.34)",
              }}
            >
              <div
                className="rounded-[1.75rem] p-6"
                style={{
                  border: "1px solid var(--color-border-accent)",
                  backgroundColor: "color-mix(in srgb, var(--color-primary) 78%, transparent)",
                }}
              >
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em]" style={{ color: "var(--color-text-subtle)" }}>
                      Active tournament
                    </p>
                    <h2 className="mt-2 text-3xl font-black">{data.tournamentName}</h2>
                  </div>
                  <Flag className="h-6 w-6" style={{ color: "var(--color-accent)" }} />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <StatCard icon={<Users className="h-4 w-4" />} label="Players" value={data.stats.players} detail="Live member count" />
                  <StatCard icon={<Shield className="h-4 w-4" />} label="Teams" value={data.stats.teams} detail="Tournament teams loaded" />
                  <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Matches" value={data.stats.matches} detail="Current match inventory" />
                </div>

                <div
                  className="mt-5 rounded-[1.6rem] p-5"
                  style={{
                    border: "1px solid var(--color-border-accent)",
                    backgroundImage:
                      "linear-gradient(90deg, color-mix(in srgb, var(--color-accent-secondary) 14%, transparent), color-mix(in srgb, var(--color-accent) 18%, transparent), color-mix(in srgb, white 10%, transparent))",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Prediction phase</p>
                      <p className="mt-1 text-sm leading-6" style={{ color: "var(--color-text-subtle)" }}>
                        Existing predictions stay editable until kickoff, while missing picks lock after the phase deadline.
                      </p>
                    </div>
                    <TimerReset className="mt-0.5 h-5 w-5" style={{ color: "var(--color-text)" }} />
                  </div>
                </div>
              </div>
            </div>

            <FeaturedMatchCard match={data.featuredMatch} />
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card title="Leaderboard" action="View full table" actionHref="/players">
            <div className="space-y-4">
              {data.leaderboard.map((player) => (
                <LeaderboardRow key={`${player.rank}-${player.name}`} player={player} />
              ))}
            </div>
          </Card>

          <Card title="Upcoming matches" action="Enter predictions" actionHref="/predictions">
            <div className="space-y-4">
              {data.upcomingMatches.map((match) => (
                <UpcomingMatchRow key={match.id} match={match} />
              ))}
            </div>
          </Card>
        </section>
      </section>
    </main>
  );
}

function PitchLines() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
      <div
        className="absolute left-1/2 top-24 h-[34rem] w-[84rem] -translate-x-1/2 rounded-[3rem]"
        style={{
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      />
      <div className="absolute left-[12%] top-24 h-[34rem] w-px bg-white/8" />
      <div className="absolute right-[12%] top-24 h-[34rem] w-px bg-white/8" />
      <div className="absolute left-1/2 top-24 h-[34rem] w-px -translate-x-1/2 bg-white/10" />
      <div className="absolute left-1/2 top-[15rem] h-32 w-32 -translate-x-1/2 rounded-full border border-white/8" />
      <div className="absolute left-[12%] top-[13rem] h-40 w-28 rounded-r-[999px] border border-l-0 border-white/8" />
      <div className="absolute right-[12%] top-[13rem] h-40 w-28 rounded-l-[999px] border border-r-0 border-white/8" />
    </div>
  );
}

function FeaturedMatchCard({ match }: { match: HomePageMatch }) {
  const local = formatLocalKickoff(match.kickoffAt);

  return (
    <div
      className="relative overflow-hidden rounded-[2.25rem] p-6 transition duration-300 hover:-translate-y-1"
      style={{
        border: "1px solid color-mix(in srgb, var(--color-accent) 28%, var(--color-border-accent))",
        background:
          "linear-gradient(145deg, color-mix(in srgb, var(--color-accent) 14%, rgba(255,255,255,0.05)) 0%, color-mix(in srgb, var(--color-secondary) 86%, transparent) 100%)",
        boxShadow: "0 34px 70px rgba(0, 0, 0, 0.3)",
      }}
    >
      <div
        className="absolute right-[-2rem] top-[-2rem] h-32 w-32 rounded-full blur-3xl"
        style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 34%, transparent)" }}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em]" style={{ color: "var(--color-text-subtle)" }}>
              Next match
            </p>
            <h3 className="mt-2 text-3xl font-black">Featured fixture</h3>
          </div>
          <ChevronRight className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
        </div>

        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <TeamName name={match.home} align="right" />
          <div
            className="rounded-full px-4 py-2 text-xs font-bold"
            style={{
              border: "1px solid var(--color-border-accent)",
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              color: "var(--color-text)",
            }}
          >
            KICKOFF
          </div>
          <TeamName name={match.away} align="left" />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <FeaturePill label={`${local.date} · ${local.time}`} />
          <FeaturePill label={match.venue} />
          <FeaturePill label={`${getMatchStatusLabel(match.status)} · ${local.zone}`} />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm" style={{ color: "var(--color-text-subtle)" }}>
            <span>Prediction pressure</span>
            <span>{match.poolActivity}% pool activity</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={match.poolActivity} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturePill({ label }: { label: string }) {
  return (
    <div
      className="rounded-2xl px-4 py-3 text-center text-sm font-medium"
      style={{
        border: "1px solid var(--color-border-accent)",
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {label}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full"
      style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          background:
            "linear-gradient(90deg, color-mix(in srgb, var(--color-accent-secondary) 70%, transparent), var(--color-accent), color-mix(in srgb, white 28%, var(--color-accent)))",
          boxShadow: "0 0 20px color-mix(in srgb, var(--color-accent) 35%, transparent)",
        }}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      className="rounded-[1.5rem] p-4 transition duration-300 hover:-translate-y-1"
      style={{
        border: "1px solid var(--color-border-accent)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.08), color-mix(in srgb, var(--color-bg-card) 94%, transparent))",
        boxShadow: "0 18px 34px rgba(0, 0, 0, 0.16)",
      }}
    >
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-accent) 16%, rgba(255,255,255,0.08))",
          color: "var(--color-text)",
        }}
      >
        {icon}
      </div>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
        {label}
      </p>
      <p className="mt-3 text-sm leading-6" style={{ color: "var(--color-text-subtle)" }}>
        {detail}
      </p>
    </div>
  );
}

function LeaderboardRow({ player }: { player: HomePageLeaderboardEntry }) {
  return (
    <div
      className="rounded-[1.75rem] p-4 transition duration-300 hover:-translate-y-1"
      style={{
        border: "1px solid var(--color-border-accent)",
        backgroundColor: "var(--color-bg-card)",
        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.16)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            #{player.rank}
          </div>
          <div>
            <p className="font-semibold">{player.name}</p>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
              League member
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black">{player.points}</p>
          <p className="text-xs" style={{ color: "var(--color-accent)" }}>
            {player.trend} this round
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs" style={{ color: "var(--color-text-subtle)" }}>
        <span>Prediction accuracy</span>
        <span>{player.completion}%</span>
      </div>
      <div className="mt-2">
        <ProgressBar value={player.completion} />
      </div>
    </div>
  );
}

function UpcomingMatchRow({ match }: { match: HomePageMatch }) {
  const local = formatLocalKickoff(match.kickoffAt);

  return (
    <div
      className="rounded-[1.75rem] p-5 transition duration-300 hover:-translate-y-1"
      style={{
        border: "1px solid var(--color-border-accent)",
        backgroundColor: "color-mix(in srgb, var(--color-secondary) 72%, transparent)",
        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.18)",
      }}
    >
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.2em]" style={{ color: "var(--color-text-subtle)" }}>
        <span>{match.stage}</span>
        <span>
          {local.date} · {local.time}
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <span className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
          {match.venue}
        </span>
        <span className="text-sm text-right" style={{ color: "var(--color-text-subtle)" }}>
          {getMatchStatusLabel(match.status)} · {match.poolActivity}% picked
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar value={match.poolActivity} />
      </div>
    </div>
  );
}

function Card({ title, action, actionHref, children }: { title: string; action: string;  actionHref?: string; children: ReactNode }) {
  return (
    <div
      className="rounded-[2.25rem] p-6 shadow-xl shadow-black/20 backdrop-blur-2xl"
      style={{
        border: "1px solid var(--color-border-accent)",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        boxShadow: "0 28px 70px rgba(0, 0, 0, 0.28)",
      }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "var(--color-text-subtle)" }}>
            Match center
          </p>
          <h3 className="mt-2 text-2xl font-black">{title}</h3>
        </div>
        <button
          className="flex items-center gap-1 text-sm font-medium transition duration-200 hover:translate-x-0.5"
          style={{ color: "var(--color-text-subtle)" }}
        >
          {actionHref ? (
            <Link
              href={actionHref}
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              {action} ↗
            </Link>
          ) : (
            <span>{action}</span>
          )}
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function TeamName({ name, align }: { name: string; align: "left" | "right" }) {
  const flagUrl = getCountryFlagUrl(name);
  const alignmentClasses = align === "right" ? "justify-end" : "justify-start";

  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className={`flex items-center ${alignmentClasses} gap-2`}>
        {flagUrl ? (
          <img
            src={flagUrl}
            alt={`${name} flag`}
            className="h-6 w-8 rounded-sm object-cover"
            width={32}
            height={24}
          />
        ) : null}
        <p className="text-xl font-black text-white sm:text-2xl">{name}</p>
      </div>
      <p className="mt-1 text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
        Team
      </p>
    </div>
  );
}
