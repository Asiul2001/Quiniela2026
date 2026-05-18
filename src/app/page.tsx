import { Trophy, CalendarDays, Users, Flag, ArrowUpRight, Shield, Sparkles } from "lucide-react";
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

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.22),transparent_32%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.18),transparent_30%)]" />
      <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />

      <section className="relative mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
        <nav className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 via-blue-500 to-green-500 shadow-lg shadow-blue-950/40">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">Quiniela Platform</p>
              <p className="text-xs text-slate-400">Private prediction league dashboard</p>
            </div>
          </div>
          <button className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15">
            Manager view
          </button>
        </nav>

        <header className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-300 backdrop-blur">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Canada • USA • Mexico 2026 inspired theme
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-black tracking-tight text-white md:text-7xl">
                Familia Strassburger Quiniela
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                A modern family prediction league for the FIFA World Cup 2026, with live rankings, custom scoring, dark horse picks, and match-by-match drama.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-full border border-red-400/25 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100">🇨🇦 Canada energy</div>
              <div className="rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-100">🇺🇸 USA lights</div>
              <div className="rounded-full border border-green-400/25 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-100">🇲🇽 Mexico spirit</div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">Active tournament</p>
                  <h2 className="text-2xl font-bold">FIFA World Cup 2026</h2>
                </div>
                <Flag className="h-6 w-6 text-emerald-300" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard icon={<Users className="h-4 w-4" />} label="Players" value="12" />
                <StatCard icon={<Shield className="h-4 w-4" />} label="Teams" value="32" />
                <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Matches" value="5" />
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-r from-red-500/10 via-blue-500/10 to-green-500/10 p-4">
                <p className="text-sm font-medium text-white">Prediction phase</p>
                <p className="mt-1 text-sm text-slate-300">Group stage predictions open until kickoff locks each match.</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card title="Leaderboard" action="View full table">
            <div className="space-y-3">
              {leaderboard.map((player) => (
                <div key={player.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-bold">#{player.rank}</div>
                    <div>
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-xs text-slate-400">Familia Strassburger</p>
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
                <div key={`${match.home}-${match.away}`} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{match.stage}</span>
                    <span>{match.date} • {match.time}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <TeamName name={match.home} align="right" />
                    <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">VS</div>
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 text-slate-400">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action: string; children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xl font-bold">{title}</h3>
        <button className="flex items-center gap-1 text-sm font-medium text-slate-300 hover:text-white">
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
      <p className="text-xs text-slate-500">Team</p>
    </div>
  );
}

