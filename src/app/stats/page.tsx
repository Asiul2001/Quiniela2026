import Link from "next/link";
import { PRIMARY_LEAGUE_SLUG } from "@/lib/app-config";
import { calculateDarkHorsePointsByMember } from "@/lib/server-bonus-scoring";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type PredictionScoreShape =
  | {
      total_points?: number | null;
      exact_score_points?: number | null;
      goal_difference_points?: number | null;
      outcome_points?: number | null;
      bonus_points?: number | null;
    }
  | Array<{
      total_points?: number | null;
      exact_score_points?: number | null;
      goal_difference_points?: number | null;
      outcome_points?: number | null;
      bonus_points?: number | null;
    }>
  | null;

type LeaguePredictionRow = {
  id: string;
  member_id: string;
  match_id: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  prediction_scores: PredictionScoreShape;
};

type PlayerStat = {
  memberId: string;
  name: string;
  predictions: number;
  scoredPredictions: number;
  totalPoints: number;
  exactScores: number;
  correctOutcomes: number;
  goalDifferences: number;
  zeroPointPredictions: number;
  completionPercentage: number;
  exactPercentage: number;
  outcomePercentage: number;
  zeroPercentage: number;
  pointsPerPrediction: number;
};

const PAGE_SIZE = 1000;

function pct(value: number) {
  return `${Math.round(value)}%`;
}

function safePercentage(part: number, total: number) {
  if (total === 0) return 0;
  return (part / total) * 100;
}

function getTop(stats: PlayerStat[], selector: (player: PlayerStat) => number) {
  return [...stats].sort((a, b) => selector(b) - selector(a))[0];
}

function getPredictionScore(predictionScores: PredictionScoreShape) {
  if (!predictionScores) {
    return {
      hasScoreRow: false,
      totalPoints: 0,
      exactScorePoints: 0,
      goalDifferencePoints: 0,
      outcomePoints: 0,
      bonusPoints: 0,
    };
  }

  const row = Array.isArray(predictionScores) ? predictionScores[0] : predictionScores;

  return {
    hasScoreRow: true,
    totalPoints: row?.total_points ?? 0,
    exactScorePoints: row?.exact_score_points ?? 0,
    goalDifferencePoints: row?.goal_difference_points ?? 0,
    outcomePoints: row?.outcome_points ?? 0,
    bonusPoints: row?.bonus_points ?? 0,
  };
}

async function fetchAllLeaguePredictions(admin: ReturnType<typeof getSupabaseAdmin>, leagueId: string) {
  const rows: LeaguePredictionRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from("predictions")
      .select(
        "id,member_id,match_id,predicted_home_score,predicted_away_score,prediction_scores(total_points,exact_score_points,goal_difference_points,outcome_points,bonus_points)",
      )
      .eq("league_id", leagueId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    rows.push(...((data ?? []) as LeaguePredictionRow[]));

    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

function getAwards(stats: PlayerStat[]) {
  return [
    {
      emoji: "👑",
      title: "Lider de la quiniela",
      player: getTop(stats, (p) => p.totalPoints),
      text: "Va ganando y probablemente ya esta insoportable.",
      value: (p: PlayerStat) => `${p.totalPoints} pts`,
    },
    {
      emoji: "🔮",
      title: "Nostradamus familiar",
      player: getTop(stats, (p) => p.exactScores),
      text: "Mas marcadores exactos. Sospechoso, pero respetable.",
      value: (p: PlayerStat) => `${p.exactScores} exactos`,
    },
    {
      emoji: "🎯",
      title: "Brujo del resultado",
      player: getTop(stats, (p) => p.outcomePercentage),
      text: "No siempre le atina al marcador, pero entiende la vibra del partido.",
      value: (p: PlayerStat) => pct(p.outcomePercentage),
    },
    {
      emoji: "📝",
      title: "El mas aplicado",
      player: getTop(stats, (p) => p.predictions),
      text: "Ha hecho mas predicciones. Aqui si vino a jugar.",
      value: (p: PlayerStat) => `${p.predictions} predicciones`,
    },
    {
      emoji: "🔥",
      title: "Mejor promedio",
      player: getTop(stats, (p) => p.pointsPerPrediction),
      text: "Pocos o muchos partidos, pero esta exprimiendo puntos.",
      value: (p: PlayerStat) => `${p.pointsPerPrediction.toFixed(2)} pts/prediccion`,
    },
    {
      emoji: "😅",
      title: "No va a ganar, pero se la esta pasando bien",
      player: getTop(stats, (p) => p.zeroPointPredictions),
      text: "Muchas predicciones sin puntos. Pero la actitud cuenta.",
      value: (p: PlayerStat) => `${p.zeroPointPredictions} sin puntos`,
    },
  ].filter((award) => award.player);
}

export default async function StatsPage() {
  let admin;

  try {
    admin = getSupabaseAdmin();
  } catch {
    return null;
  }

  const { data: league, error: leagueError } = await admin
    .from("leagues")
    .select("id,name")
    .eq("slug", PRIMARY_LEAGUE_SLUG)
    .maybeSingle();

  if (leagueError || !league?.id) {
    return null;
  }

  const { data: leagueTournament, error: leagueTournamentError } = await admin
    .from("league_tournaments")
    .select("id,tournament_id")
    .eq("league_id", league.id)
    .limit(1)
    .maybeSingle();

  if (leagueTournamentError || !leagueTournament?.tournament_id) {
    return null;
  }

  const [
    { data: members },
    { data: profiles },
    { data: matches },
    { data: teams },
    { data: darkHorsePredictions },
    predictions,
  ] = await Promise.all([
    admin.from("league_members").select("id,user_id").eq("league_id", league.id),
    admin.from("profiles").select("id,display_name,full_name"),
    admin
      .from("matches")
      .select("id,stage,match_number,home_team_id,away_team_id,home_score,away_score,home_penalty_score,away_penalty_score")
      .eq("tournament_id", leagueTournament.tournament_id),
    admin.from("teams").select("id,name,team_tier").eq("tournament_id", leagueTournament.tournament_id),
    admin
      .from("bonus_predictions")
      .select("member_id,payload")
      .eq("league_id", league.id)
      .eq("tournament_id", leagueTournament.tournament_id)
      .eq("type", "dark_horse"),
    fetchAllLeaguePredictions(admin, league.id),
  ]);

  const totalMatches = matches?.length ?? 0;

  const userToName = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name ?? profile.full_name ?? "Jugador"]),
  );

  const memberToName = new Map(
    (members ?? []).map((member) => [member.id, userToName.get(member.user_id) ?? "Jugador"]),
  );

  const statsByMember = new Map<string, PlayerStat>();

  for (const member of members ?? []) {
    statsByMember.set(member.id, {
      memberId: member.id,
      name: memberToName.get(member.id) ?? "Jugador",
      predictions: 0,
      scoredPredictions: 0,
      totalPoints: 0,
      exactScores: 0,
      correctOutcomes: 0,
      goalDifferences: 0,
      zeroPointPredictions: 0,
      completionPercentage: 0,
      exactPercentage: 0,
      outcomePercentage: 0,
      zeroPercentage: 0,
      pointsPerPrediction: 0,
    });
  }

  for (const prediction of predictions) {
    const stat = statsByMember.get(prediction.member_id);
    if (!stat) {
      continue;
    }

    stat.predictions += 1;

    const score = getPredictionScore(prediction.prediction_scores);
    if (!score.hasScoreRow) {
      continue;
    }

    stat.scoredPredictions += 1;
    stat.totalPoints += score.totalPoints;

    if (score.exactScorePoints > 0) stat.exactScores += 1;
    if (score.goalDifferencePoints > 0) stat.goalDifferences += 1;
    if (score.outcomePoints > 0) stat.correctOutcomes += 1;
    if (score.totalPoints === 0) stat.zeroPointPredictions += 1;
  }

  const darkHorsePointsByMember = calculateDarkHorsePointsByMember({
    teams: teams ?? [],
    matches: (matches ?? []) as Array<{
      stage: any;
      home_team_id: string;
      away_team_id: string;
      home_score?: number | null;
      away_score?: number | null;
      home_penalty_score?: number | null;
      away_penalty_score?: number | null;
    }>,
    darkHorsePredictions: darkHorsePredictions ?? [],
  });

  for (const [memberId, breakdown] of darkHorsePointsByMember.entries()) {
    const stat = statsByMember.get(memberId);
    if (!stat) continue;
    stat.totalPoints += breakdown.points;
  }

  const stats = Array.from(statsByMember.values())
    .map((player) => ({
      ...player,
      completionPercentage: safePercentage(player.predictions, totalMatches),
      exactPercentage: safePercentage(player.exactScores, player.scoredPredictions),
      outcomePercentage: safePercentage(player.correctOutcomes, player.scoredPredictions),
      zeroPercentage: safePercentage(player.zeroPointPredictions, player.scoredPredictions),
      pointsPerPrediction:
        player.scoredPredictions > 0 ? player.totalPoints / player.scoredPredictions : 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const awards = getAwards(stats);
  const totalPredictions = stats.reduce((sum, player) => sum + player.predictions, 0);
  const totalPoints = stats.reduce((sum, player) => sum + player.totalPoints, 0);
  const totalExact = stats.reduce((sum, player) => sum + player.exactScores, 0);
  const totalZeroes = stats.reduce((sum, player) => sum + player.zeroPointPredictions, 0);

  return (
    <main
      className="min-h-screen px-6 py-10"
      style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text)" }}
    >
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <p className="text-xs uppercase tracking-[0.28em]" style={{ color: "var(--color-text-subtle)" }}>
            {league.name}
          </p>
          <h1 className="mt-2 text-4xl font-black">Stats y premios</h1>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--color-text-subtle)" }}>
            Estadisticas serias, premios absurdos y reconocimiento para todos.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          {[
            ["Predicciones", totalPredictions],
            ["Puntos repartidos", totalPoints],
            ["Marcadores exactos", totalExact],
            ["Predicciones sin puntos", totalZeroes],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[1.5rem] p-5"
              style={{ border: "1px solid var(--color-border-accent)", backgroundColor: "var(--color-bg-card)" }}
            >
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
                {label}
              </p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {awards.map((award) => (
            <article
              key={award.title}
              className="rounded-[2rem] p-6"
              style={{ border: "1px solid var(--color-border-accent)", backgroundColor: "var(--color-bg-card)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-4xl">{award.emoji}</div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black">
                  {award.value(award.player)}
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-black">{award.title}</h2>
              <p className="mt-2 text-xl font-bold">{award.player.name}</p>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-subtle)" }}>
                {award.text}
              </p>
            </article>
          ))}
        </section>

        <section
          className="rounded-[2rem] p-6"
          style={{ border: "1px solid var(--color-border-accent)", backgroundColor: "var(--color-bg-card)" }}
        >
          <h2 className="text-3xl font-black">Tabla completa</h2>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead style={{ color: "var(--color-text-subtle)" }}>
                <tr>
                  <th className="py-3">Rank</th>
                  <th>Jugador</th>
                  <th>Puntos</th>
                  <th>Predicciones</th>
                  <th>Completado</th>
                  <th>Exactos</th>
                  <th>Resultado correcto</th>
                  <th>Promedio</th>
                  <th>Ceros</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((player, index) => (
                  <tr key={player.memberId} className="border-t border-white/10">
                    <td className="py-3 font-black">#{index + 1}</td>
                    <td className="font-semibold">{player.name}</td>
                    <td>{player.totalPoints}</td>
                    <td>{player.predictions}</td>
                    <td>{pct(player.completionPercentage)}</td>
                    <td>{player.exactScores}</td>
                    <td>{pct(player.outcomePercentage)}</td>
                    <td>{player.pointsPerPrediction.toFixed(2)}</td>
                    <td>{player.zeroPointPredictions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Link href="/" className="inline-flex rounded-full border border-white/10 px-5 py-3 font-semibold">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
