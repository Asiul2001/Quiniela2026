"use client";

import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleX,
  Flag,
  Gift,
  Shield,
  Sparkles,
  TimerReset,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { ThemeMascotOverlay } from "@/components/theme-mascot-overlay";
import { useAuthUser } from "@/hooks/use-auth-user";
import { PRIMARY_OWNER_NAME } from "@/lib/app-config";
import { getUserDisplayName } from "@/lib/auth";
import { getCountryFlagUrl } from "@/lib/country-flags";
import type { HomePageData, HomePageLeaderboardEntry, HomePageMatch } from "@/lib/homepage-data";
import { normalizeMatchStatus } from "@/lib/match-status";
import { getPlacementLabel } from "@/lib/tournament-awards";
import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  persistTheme,
  subscribeToTheme,
  THEME_MASCOTS,
  themes,
} from "@/lib/theme";

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
  };
}

function getMatchStatusLabel(status?: string) {
  const normalized = normalizeMatchStatus(status);

  if (normalized === "live") {
    return "Live now";
  }

  if (normalized === "completed") {
    return "Finished";
  }

  if (normalized === "cancelled") {
    return "Cancelled";
  }

  return "Scheduled";
}

function formatDarkHorseProgress(progress: string) {
  const labels: Record<string, string> = {
    none: "no avanzo",
    round_of_32: "llego a dieciseisavos",
    round_of_16: "llego a octavos",
    quarter_final: "llego a cuartos",
    semi_final: "llego a semifinal",
    final: "llego a la final",
    champion: "fue campeon",
  };

  return labels[progress] ?? progress;
}

function normalizeOverlayName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function HomePageClient({ data }: { data: HomePageData }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getThemeServerSnapshot);
  const { user } = useAuthUser();
  const [showFinishOverlay, setShowFinishOverlay] = useState(false);
  const [personalStanding, setPersonalStanding] = useState<HomePageLeaderboardEntry | null>(null);
  const userDisplayName = getUserDisplayName(user);
  const isPrimaryOwner =
    userDisplayName?.trim().toLowerCase() === PRIMARY_OWNER_NAME.toLowerCase();
  const currentStanding = useMemo(
    () =>
      data.standings.find((entry) => {
        if (entry.userId && user?.id && entry.userId === user.id) {
          return true;
        }

        return normalizeOverlayName(entry.name) !== "" && normalizeOverlayName(entry.name) === normalizeOverlayName(userDisplayName);
      }) ?? null,
    [data.standings, user?.id, userDisplayName],
  );
  const overlayStanding = personalStanding ?? currentStanding;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!user?.id || !data.tournamentSummary.isFinished) {
      setPersonalStanding(null);
      return;
    }

    if (currentStanding) {
      setPersonalStanding(null);
      return;
    }

    const userId = user.id;
    const normalizedUserName = normalizeOverlayName(userDisplayName);
    let active = true;

    async function loadPersonalStanding() {
      try {
        const response = await fetch("/api/players/browse", {
          cache: "no-store",
        });

        const payload = await response.json();
        if (!response.ok || !active) {
          return;
        }

        const player = Array.isArray(payload?.players)
          ? payload.players.find(
              (entry: {
                userId?: string;
                rank?: number;
                name: string;
                points: number;
                completion: number;
                specialPrize?: {
                  title: string;
                  definition: string;
                  detail: string;
                };
              }) =>
                entry.userId === userId ||
                (normalizedUserName !== "" && normalizeOverlayName(entry.name) === normalizedUserName),
            )
          : null;

        if (!player || !active) {
          return;
        }

        setPersonalStanding({
          rank: player.rank ?? currentStanding?.rank ?? 0,
          userId: player.userId,
          name: player.name,
          points: player.points,
          trend: currentStanding?.trend ?? "+0",
          completion: player.completion,
          prize: player.specialPrize,
        });
      } catch (error) {
        console.error("Unable to load personal standing for finish overlay", error);
      }
    }

    void loadPersonalStanding();

    return () => {
      active = false;
    };
  }, [currentStanding, data.tournamentSummary.isFinished, user?.id, userDisplayName]);

  useEffect(() => {
    if (!user?.id || !data.tournamentSummary.isFinished || !overlayStanding) {
      return;
    }
    setShowFinishOverlay(true);
  }, [data.tournamentSummary.isFinished, data.tournamentName, overlayStanding, user?.id]);

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text)" }}
    >
      {showFinishOverlay && overlayStanding ? (
        <FinishOverlay
          key={`${overlayStanding.userId ?? overlayStanding.name}-${overlayStanding.rank}-${overlayStanding.points}`}
          standing={overlayStanding}
          totalPlayers={data.standings.length}
          onClose={() => setShowFinishOverlay(false)}
        />
      ) : null}

      <ThemeMascotOverlay />
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

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col gap-10 px-6 py-8 lg:px-10 lg:py-10">
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
              <p className="text-sm font-semibold uppercase tracking-[0.24em]">Quiniela Platform</p>
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
                  Canada - USA - Mexico 2026
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
                        Porcentaje de predicciones
                      </p>
                      <p className="mt-2 text-3xl font-black">{data.predictionCompletion}% listo</p>
                    </div>
                    <Activity className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
                  </div>

                  <ProgressBar value={data.predictionCompletion} />

                  <div className="mt-4 flex items-center justify-between text-sm" style={{ color: "var(--color-text-subtle)" }}>
                    <span>{data.tournamentSummary.isFinished ? "Torneo cerrado" : "La liga sigue viva"}</span>
                    <span>{data.upcomingMatches.length} juegos mostrados</span>
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
                    Estado de cierre
                  </p>
                  <p className="mt-3 text-4xl font-black">{data.stats.players}</p>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-subtle)" }}>
                    {data.tournamentSummary.isFinished
                      ? `${data.tournamentSummary.champion ?? "Campeon por definir"} levanto la copa`
                      : "Jugadores activos en la tabla de la liga"}
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
                      <p className="text-sm font-semibold text-white">
                        {data.tournamentSummary.isFinished ? "Tournament closed" : "Prediction phase"}
                      </p>
                      <p className="mt-1 text-sm leading-6" style={{ color: "var(--color-text-subtle)" }}>
                        {data.tournamentSummary.isFinished
                          ? "The final standings are locked, the prizes are assigned, and the chaos is now official family history."
                          : "Existing predictions stay editable until kickoff, while missing picks lock after the phase deadline."}
                      </p>
                    </div>
                    <TimerReset className="mt-0.5 h-5 w-5" style={{ color: "var(--color-text)" }} />
                  </div>
                </div>
              </div>
            </div>

            <FeaturedMatchCard match={data.featuredMatch} isFinishedTournament={data.tournamentSummary.isFinished} />
          </div>
        </header>

        {data.tournamentSummary.isFinished ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <div
              className="rounded-[2rem] p-6"
              style={{
                border: "1px solid var(--color-border-accent)",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                boxShadow: "0 28px 70px rgba(0, 0, 0, 0.28)",
              }}
            >
              <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "var(--color-text-subtle)" }}>
                Cierre oficial
              </p>
              <h2 className="mt-2 text-3xl font-black">Podio final</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <PodiumTile label="Campeon" value={data.tournamentSummary.champion ?? "Pendiente"} />
                <PodiumTile label="Subcampeon" value={data.tournamentSummary.runnerUp ?? "Pendiente"} />
                <PodiumTile label="Tercer lugar" value={data.tournamentSummary.thirdPlace ?? "Pendiente"} />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <FeaturePill label={data.tournamentSummary.finalScore ?? "Final pendiente"} />
                <FeaturePill label={data.tournamentSummary.bronzeScore ?? "Tercer lugar pendiente"} />
              </div>
            </div>

            <div
              className="rounded-[2rem] p-6"
              style={{
                border: "1px solid var(--color-border-accent)",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                boxShadow: "0 28px 70px rgba(0, 0, 0, 0.28)",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "var(--color-text-subtle)" }}>
                    Dark horses
                  </p>
                  <h2 className="mt-2 text-3xl font-black">Lo que escogio la familia</h2>
                </div>
                <Link href="/players" className="text-sm font-semibold" style={{ color: "var(--color-accent)" }}>
                  Ver todos
                </Link>
              </div>

              <div className="mt-5 grid gap-3">
                {data.darkHorseGallery.slice(0, 4).map((entry) => (
                  <div
                    key={`${entry.rank}-${entry.playerName}`}
                    className="rounded-[1.5rem] px-4 py-4"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{entry.playerName}</p>
                        <p className="mt-1 text-sm" style={{ color: "var(--color-text-subtle)" }}>
                          {entry.teamName} · {formatDarkHorseProgress(entry.progress)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black">{entry.points}</p>
                        <p className="text-xs" style={{ color: "var(--color-text-subtle)" }}>
                          pts
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[2rem] p-6"
              style={{
                border: "1px solid var(--color-border-accent)",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                boxShadow: "0 28px 70px rgba(0, 0, 0, 0.28)",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "var(--color-text-subtle)" }}>
                    Golden Boot
                  </p>
                  <h2 className="mt-2 text-3xl font-black">Los goleadores que eligio la familia</h2>
                </div>
                <Link href="/players" className="text-sm font-semibold" style={{ color: "var(--color-accent)" }}>
                  Ver todos
                </Link>
              </div>

              <div className="mt-5 grid gap-3">
                {data.goldenBootGallery.slice(0, 4).map((entry) => (
                  <div
                    key={`${entry.rank}-${entry.playerName}`}
                    className="rounded-[1.5rem] px-4 py-4"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{entry.playerName}</p>
                        <p className="mt-1 text-sm" style={{ color: "var(--color-text-subtle)" }}>
                          Golden Boot: {entry.goldenBootPick}
                        </p>
                      </div>
                      <div
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{
                          border: "1px solid var(--color-border-accent)",
                          backgroundColor: "rgba(255,255,255,0.06)",
                          color: "var(--color-text-subtle)",
                        }}
                      >
                        #{entry.rank}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card title="Tabla de Ranking" action="Ver la tabla completa" actionHref="/players">
            <div className="space-y-4">
              {data.leaderboard.map((player) => (
                <LeaderboardRow key={`${player.rank}-${player.name}`} player={player} />
              ))}
            </div>
          </Card>

          <Card
            title={data.matchFeedTitle}
            action={data.tournamentSummary.isFinished ? "Revisar resultados" : "Completa tus predicciones"}
            actionHref={data.tournamentSummary.isFinished ? "/players" : "/predictions"}
          >
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

function FinishOverlay({
  standing,
  totalPlayers,
  onClose,
}: {
  standing: HomePageLeaderboardEntry;
  totalPlayers: number;
  onClose: () => void;
}) {
  const [hasOpenedGift, setHasOpenedGift] = useState(false);
  const [giftTapCount, setGiftTapCount] = useState(0);
  const [revealStage, setRevealStage] = useState(0);
  const tapsRemaining = Math.max(5 - giftTapCount, 0);
  const celebrationMascots = Object.entries(THEME_MASCOTS)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([themeName, mascot]) => ({
      themeName,
      mascot,
    }));

  useEffect(() => {
    setHasOpenedGift(false);
    setGiftTapCount(0);
    setRevealStage(0);
  }, [standing.userId, standing.name, standing.rank, standing.points]);

  useEffect(() => {
    if (!hasOpenedGift) {
      setRevealStage(0);
      return;
    }

    setRevealStage(0);

    const timers = [
      window.setTimeout(() => setRevealStage(1), 280),
      window.setTimeout(() => setRevealStage(2), 1100),
      window.setTimeout(() => setRevealStage(3), 1850),
      window.setTimeout(() => setRevealStage(4), 2550),
    ];

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [hasOpenedGift, standing.rank, standing.prize?.title]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 py-10">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-[2.75rem] px-8 py-10 text-center"
        style={{
          border: "1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)",
          background:
            "linear-gradient(145deg, color-mix(in srgb, var(--color-primary) 88%, rgba(255,255,255,0.08)), color-mix(in srgb, var(--color-secondary) 82%, transparent))",
          boxShadow: "0 34px 90px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-x-[10%] top-[-10rem] h-56 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 38%, transparent) 0%, transparent 70%)",
              animation: "overlay-glow 6s ease-in-out infinite",
            }}
          />
          <div
            className="absolute left-[-12%] top-16 h-72 w-72 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--color-accent-secondary) 28%, transparent) 0%, transparent 72%)",
              animation: "overlay-glow 7.5s ease-in-out infinite reverse",
            }}
          />
          <div
            className="absolute right-[-10%] top-24 h-80 w-80 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 72%)",
              animation: "overlay-glow 8.5s ease-in-out infinite",
            }}
          />
          {[...Array.from({ length: 20 })].map((_, index) => (
            <span
              key={index}
              className="absolute rounded-full"
              style={{
                left: `${4 + (index * 5) % 92}%`,
                top: `${8 + (index * 9) % 78}%`,
                width: `${index % 3 === 0 ? 16 : index % 2 === 0 ? 10 : 7}px`,
                height: `${index % 3 === 0 ? 16 : index % 2 === 0 ? 10 : 7}px`,
                backgroundColor:
                  index % 3 === 0
                    ? "var(--color-accent)"
                    : index % 2 === 0
                      ? "rgba(255,255,255,0.84)"
                      : "var(--color-accent-secondary)",
                opacity: revealStage >= 1 ? 0.78 : 0,
                animation: `confetti-drift ${4 + (index % 5)}s linear infinite`,
                animationDelay: `${index * 0.15}s`,
                transition: "opacity 500ms ease",
              }}
            />
          ))}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-0 top-0 rounded-full p-2 transition hover:bg-white/10"
            style={{ color: "var(--color-text-subtle)" }}
          >
            <CircleX className="h-6 w-6" />
          </button>

          {!hasOpenedGift ? (
            <div className="relative flex min-h-[32rem] flex-col items-center justify-center px-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setGiftTapCount((current) => {
                    const next = current + 1;
                    if (next >= 5) {
                      setHasOpenedGift(true);
                    }
                    return next;
                  });
                }}
                className="group relative transition duration-300 hover:scale-[1.015] active:scale-[0.985]"
                aria-label="Abrir cofre final"
              >
                <div
                  className="absolute inset-x-[-4rem] bottom-[-3rem] top-[-4rem] rounded-[3.5rem] blur-3xl"
                  style={{
                    background:
                      "radial-gradient(circle, color-mix(in srgb, #d6a34a 28%, transparent) 0%, transparent 72%)",
                    opacity: 0.9,
                    animation: "gift-pulse 3.2s ease-in-out infinite",
                  }}
                />
                <div className="relative flex flex-col items-center">
                  <div
                    className="absolute bottom-[-1.8rem] left-1/2 h-12 w-[86%] -translate-x-1/2 rounded-[999px] blur-2xl"
                    style={{ backgroundColor: "rgba(0,0,0,0.34)" }}
                  />
                  <div
                    className="relative h-28 w-80 overflow-hidden rounded-t-[999px] border border-b-0 sm:h-32 sm:w-[24rem]"
                    style={{
                      borderColor: "rgba(255,223,156,0.42)",
                      background:
                        "linear-gradient(180deg, rgba(214,163,74,0.96) 0%, rgba(124,79,28,0.95) 100%)",
                      boxShadow: "0 18px 42px rgba(0,0,0,0.24)",
                    }}
                  >
                    <div
                      className="absolute inset-x-4 top-3 h-5 rounded-full blur-md"
                      style={{ backgroundColor: "rgba(255,255,255,0.22)" }}
                    />
                    <div
                      className="absolute inset-y-0 left-[16%] w-4 rounded-full"
                      style={{ backgroundColor: "rgba(94,55,20,0.4)" }}
                    />
                    <div
                      className="absolute inset-y-0 right-[16%] w-4 rounded-full"
                      style={{ backgroundColor: "rgba(94,55,20,0.4)" }}
                    />
                    <div
                      className="absolute left-1/2 top-[62%] flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border"
                      style={{
                        borderColor: "rgba(255,236,185,0.72)",
                        backgroundColor: "rgba(89,48,16,0.28)",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
                      }}
                    >
                      <Gift className="h-7 w-7" style={{ color: "rgba(255,248,220,0.95)" }} />
                    </div>
                  </div>
                  <div
                    className="relative mt-[-0.35rem] h-40 w-80 rounded-b-[2.25rem] border sm:h-44 sm:w-[24rem]"
                    style={{
                      borderColor: "rgba(214,163,74,0.44)",
                      background:
                        "linear-gradient(180deg, rgba(137,89,35,0.98) 0%, rgba(73,42,18,0.98) 100%)",
                      boxShadow: "0 28px 72px rgba(0,0,0,0.3)",
                    }}
                  >
                    <div
                      className="absolute inset-x-6 top-4 h-5 rounded-full blur-md"
                      style={{ backgroundColor: "rgba(255,255,255,0.16)" }}
                    />
                    <div
                      className="absolute inset-y-0 left-[16%] w-4 rounded-full"
                      style={{ backgroundColor: "rgba(214,163,74,0.44)" }}
                    />
                    <div
                      className="absolute inset-y-0 right-[16%] w-4 rounded-full"
                      style={{ backgroundColor: "rgba(214,163,74,0.44)" }}
                    />
                    <div
                      className="absolute inset-x-0 top-[42%] h-5"
                      style={{ backgroundColor: "rgba(214,163,74,0.58)" }}
                    />
                    <div
                      className="absolute left-1/2 top-[44%] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.3rem] border"
                      style={{
                        borderColor: "rgba(255,232,180,0.7)",
                        background:
                          "linear-gradient(180deg, rgba(198,145,46,0.92), rgba(114,70,22,0.92))",
                        boxShadow: "0 10px 24px rgba(0,0,0,0.24)",
                      }}
                    >
                      <div
                        className="h-7 w-7 rounded-full border"
                        style={{ borderColor: "rgba(255,244,210,0.82)" }}
                      />
                    </div>
                  </div>
                </div>
              </button>

              <p className="mt-12 text-xs uppercase tracking-[0.3em]" style={{ color: "var(--color-accent)" }}>
                Cofre final
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
                Abre el baul para descubrir como termino tu quiniela
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8" style={{ color: "var(--color-text-subtle)" }}>
                Nada se revela todavia. Toca el cofre y deja que tu puesto y tu premio salgan como una sorpresa final.
              </p>
              <div
                className="mt-6 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]"
                style={{
                  border: "1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  color: "var(--color-text-subtle)",
                }}
              >
                {tapsRemaining > 0
                  ? `${tapsRemaining} toque${tapsRemaining === 1 ? "" : "s"} para abrir el cofre`
                  : "Abriendo cofre"}
              </div>
            </div>
          ) : (
            <>
          <div
            className="relative mt-8 rounded-[2.2rem] border px-5 pb-10 pt-14 sm:px-7"
            style={{
              borderColor: "color-mix(in srgb, var(--color-accent) 32%, transparent)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.04) 65%, rgba(255,255,255,0.08) 100%)",
              boxShadow: "0 26px 60px rgba(0,0,0,0.22)",
            }}
          >
            <div
              className="pointer-events-none absolute left-1/2 top-0 h-20 w-28 -translate-x-1/2 -translate-y-8 rounded-[1.8rem] border"
              style={{
                borderColor: "color-mix(in srgb, white 24%, transparent)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 24%, rgba(255,255,255,0.12)), rgba(255,255,255,0.08))",
                boxShadow: "0 20px 40px rgba(0,0,0,0.22)",
                transform: revealStage >= 1 ? "translate(-50%, -2.6rem) rotate(-12deg)" : "translate(-50%, -2rem)",
                transition: "transform 700ms cubic-bezier(0.2, 1, 0.3, 1)",
              }}
            />
            <div
              className="pointer-events-none absolute left-1/2 top-0 h-20 w-28 -translate-x-1/2 -translate-y-8 rounded-[1.8rem] border"
              style={{
                borderColor: "color-mix(in srgb, white 24%, transparent)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-accent-secondary) 24%, rgba(255,255,255,0.12)), rgba(255,255,255,0.08))",
                boxShadow: "0 20px 40px rgba(0,0,0,0.22)",
                transform: revealStage >= 1 ? "translate(-50%, -2.6rem) rotate(12deg)" : "translate(-50%, -2rem)",
                transition: "transform 700ms cubic-bezier(0.2, 1, 0.3, 1)",
              }}
            />
            <div
              className="pointer-events-none absolute bottom-0 left-1/2 h-28 w-56 -translate-x-1/2 translate-y-8 rounded-[2rem] border"
              style={{
                borderColor: "color-mix(in srgb, var(--color-accent) 42%, transparent)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 24%, rgba(255,255,255,0.08)), rgba(255,255,255,0.06))",
                boxShadow: "0 28px 64px rgba(0,0,0,0.26)",
              }}
            />
          <div
            className="relative grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center"
            style={{
              opacity: revealStage >= 1 ? 1 : 0,
              transform: revealStage >= 1 ? "translateY(0)" : "translateY(48px)",
              transition: "opacity 620ms ease, transform 620ms cubic-bezier(0.2, 1, 0.3, 1)",
            }}
          >
            <div className="space-y-5 text-left">
              <p
                className="text-xs uppercase tracking-[0.28em]"
                style={{
                  color: "var(--color-accent)",
                  opacity: revealStage >= 1 ? 1 : 0,
                  transform: revealStage >= 1 ? "translateY(0)" : "translateY(18px)",
                  transition: "opacity 420ms ease, transform 420ms ease",
                }}
              >
                Cierre de torneo
              </p>
              <div
                style={{
                  opacity: revealStage >= 1 ? 1 : 0,
                  transform: revealStage >= 1 ? "translateY(0)" : "translateY(26px)",
                  transition: "opacity 560ms ease, transform 560ms ease",
                }}
              >
                <p className="text-lg font-medium leading-8" style={{ color: "var(--color-text-subtle)" }}>
                  La mesa ya cerró, los picks hablaron y tu historia final quedó lista.
                </p>
              </div>
              <div
                className="overflow-hidden rounded-[2rem] border px-5 py-5"
                style={{
                  borderColor: "color-mix(in srgb, var(--color-accent) 32%, transparent)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  boxShadow: revealStage >= 2 ? "0 18px 40px rgba(0,0,0,0.22)" : "none",
                  opacity: revealStage >= 2 ? 1 : 0,
                  transform: revealStage >= 2 ? "translateY(0) scale(1)" : "translateY(24px) scale(0.96)",
                  transition:
                    "opacity 620ms cubic-bezier(0.2, 1, 0.3, 1), transform 620ms cubic-bezier(0.2, 1, 0.3, 1), box-shadow 620ms ease",
                }}
              >
                <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "var(--color-text-subtle)" }}>
                  Tu puesto final
                </p>
                <h2
                  className="mt-3 text-4xl font-black sm:text-6xl"
                  style={{
                    opacity: revealStage >= 2 ? 1 : 0,
                    filter: revealStage >= 2 ? "blur(0px)" : "blur(16px)",
                    transform: revealStage >= 2 ? "scale(1)" : "scale(1.08)",
                    transition: "opacity 700ms ease, filter 700ms ease, transform 700ms ease",
                  }}
                >
                  Terminaste {getPlacementLabel(standing.rank, totalPlayers)}
                </h2>
              </div>
              {standing.prize ? (
                <div
                  style={{
                    opacity: revealStage >= 3 ? 1 : 0,
                    transform: revealStage >= 3 ? "translateY(0)" : "translateY(22px)",
                    transition: "opacity 520ms ease, transform 520ms ease",
                  }}
                >
                  <p className="text-lg leading-8" style={{ color: "var(--color-accent)" }}>
                    {standing.prize.definition}
                  </p>
                  <p className="mt-2 text-base leading-8" style={{ color: "var(--color-text-subtle)" }}>
                    {standing.prize.detail}
                  </p>
                </div>
              ) : null}

              {standing.prize ? (
                <div
                  className="rounded-[1.9rem] px-6 py-5"
                  style={{
                    border: "1px solid var(--color-border-accent)",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    boxShadow: revealStage >= 4 ? "0 18px 48px rgba(0,0,0,0.24)" : "none",
                    opacity: revealStage >= 4 ? 1 : 0,
                    transform: revealStage >= 4 ? "translateY(0) scale(1)" : "translateY(28px) scale(0.94)",
                    transition:
                      "opacity 720ms cubic-bezier(0.2, 1, 0.3, 1), transform 720ms cubic-bezier(0.2, 1, 0.3, 1), box-shadow 720ms ease",
                  }}
                >
                  <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "var(--color-text-subtle)" }}>
                    Premio especial
                  </p>
                  <p className="mt-2 text-2xl font-black">{standing.prize.title}</p>
                </div>
              ) : null}
            </div>

            <div
              className="relative flex min-h-[21rem] items-center justify-center"
              style={{
                opacity: revealStage >= 1 ? 1 : 0,
                transform: revealStage >= 1 ? "translateX(0)" : "translateX(22px)",
                transition: "opacity 560ms ease, transform 560ms ease",
              }}
            >
              {celebrationMascots.map((mascot, index) => (
                <div
                  key={mascot.themeName}
                  className="absolute"
                  style={{
                    transform:
                      index === 0
                        ? "translate(-42%, 8%) rotate(-8deg)"
                        : index === 1
                          ? "translate(0, -12%) scale(1.06)"
                          : "translate(42%, 10%) rotate(8deg)",
                    animation: `mascot-sway ${4.5 + index}s ease-in-out infinite`,
                    opacity: revealStage >= 1 ? 1 : 0,
                    zIndex: index === 1 ? 2 : 1,
                    transition: `opacity 520ms ease ${160 + index * 180}ms`,
                  }}
                >
                  <div
                    className="rounded-[2rem] border p-3"
                    style={{
                      borderColor: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
                      backgroundColor: "rgba(255,255,255,0.08)",
                      boxShadow: "0 20px 42px rgba(0,0,0,0.24)",
                    }}
                  >
                    <Image
                      src={mascot.mascot}
                      alt=""
                      aria-hidden="true"
                      width={180}
                      height={180}
                      className="h-auto w-[120px] sm:w-[150px]"
                      priority
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-8 rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
            style={{
              border: "1px solid color-mix(in srgb, var(--color-accent) 45%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--color-accent) 16%, rgba(255,255,255,0.08))",
              color: "var(--color-text)",
              opacity: revealStage >= 4 ? 1 : 0,
              transform: revealStage >= 4 ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 420ms ease, transform 420ms ease",
            }}
          >
            Entrar a la celebracion
          </button>
            </>
          )}
        </div>

        <style jsx>{`
          @keyframes gift-pulse {
            0%,
            100% {
              transform: scale(0.98);
              opacity: 0.72;
            }
            50% {
              transform: scale(1.08);
              opacity: 1;
            }
          }

          @keyframes confetti-drift {
            0% {
              transform: translate3d(0, -18px, 0) scale(0.9) rotate(0deg);
            }
            50% {
              transform: translate3d(14px, 20px, 0) scale(1.18) rotate(160deg);
            }
            100% {
              transform: translate3d(-10px, 52px, 0) scale(0.92) rotate(320deg);
            }
          }

          @keyframes mascot-sway {
            0%,
            100% {
              translate: 0 0;
            }
            50% {
              translate: 0 -14px;
            }
          }

          @keyframes overlay-glow {
            0%,
            100% {
              opacity: 0.5;
              transform: scale(0.96);
            }
            50% {
              opacity: 0.95;
              transform: scale(1.08);
            }
          }

        `}</style>
      </div>
    </div>
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

function FeaturedMatchCard({
  match,
  isFinishedTournament,
}: {
  match: HomePageMatch;
  isFinishedTournament: boolean;
}) {
  const local = formatLocalKickoff(match.kickoffAt);
  const isFinishedMatch = match.status === "completed" || match.status === "finished";

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
            <p className="text-xs uppercase tracking-[0.24em]">
              {isFinishedTournament ? "Cierre destacado" : match.status === "live" ? "En vivo" : "Proximo juego"}
            </p>
            <h3 className="mt-2 text-3xl font-black">{isFinishedTournament ? "Resultado:" : "Partido:"}</h3>
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
            {isFinishedMatch ? `${match.homeScore ?? 0}-${match.awayScore ?? 0}` : "KICKOFF"}
          </div>
          <TeamName name={match.away} align="left" />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <FeaturePill label={`${local.date} · ${local.time}`} />
          <FeaturePill label={match.venue} />
          <FeaturePill
            label={
              match.status === "live"
                ? `LIVE · ${match.matchMinute ?? 0}' · ${match.homeScore ?? 0}-${match.awayScore ?? 0}`
                : isFinishedMatch
                  ? `FINAL · ${match.homeScore ?? 0}-${match.awayScore ?? 0}`
                  : getMatchStatusLabel(match.status)
            }
          />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm" style={{ color: "var(--color-text-subtle)" }}>
            <span>{isFinishedTournament ? "Cobertura final" : "Prediction pressure"}</span>
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

function PodiumTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[1.5rem] p-4"
      style={{
        border: "1px solid var(--color-border-accent)",
        backgroundColor: "rgba(255,255,255,0.05)",
      }}
    >
      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
        {label}
      </p>
      <p className="mt-2 text-xl font-black">{value}</p>
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
              {player.prize?.title ?? "League member"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black">{player.points}</p>
          <p className="text-xs" style={{ color: "var(--color-accent)" }}>
            {player.trend} puntos hoy
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs" style={{ color: "var(--color-text-subtle)" }}>
        <span>Completado</span>
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
          {match.status === "completed" || match.status === "finished"
            ? `${match.homeScore ?? 0}-${match.awayScore ?? 0}`
            : "VS"}
        </div>
        <TeamName name={match.away} align="left" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <span className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
          {match.venue}
        </span>
        <span className="text-sm text-right" style={{ color: "var(--color-text-subtle)" }}>
          {getMatchStatusLabel(match.status)} · {match.poolActivity}% completado
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar value={match.poolActivity} />
      </div>
    </div>
  );
}

function Card({
  title,
  action,
  actionHref,
  children,
}: {
  title: string;
  action: string;
  actionHref?: string;
  children: ReactNode;
}) {
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
              className="text-sm font-semibold text-slate-300 transition-colors hover:text-white"
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
