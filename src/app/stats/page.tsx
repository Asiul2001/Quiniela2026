import { supabase } from "@/lib/supabase";
import Link from "next/link";

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

function getAwards(stats: PlayerStat[]) {
  return [
    {
      emoji: "👑",
      title: "Líder de la quiniela",
      player: getTop(stats, (p) => p.totalPoints),
      text: "Va ganando y probablemente ya está insoportable.",
      value: (p: PlayerStat) => `${p.totalPoints} pts`,
    },
    {
      emoji: "🔮",
      title: "Nostradamus familiar",
      player: getTop(stats, (p) => p.exactScores),
      text: "Más marcadores exactos. Sospechoso, pero respetable.",
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
      title: "El más aplicado",
      player: getTop(stats, (p) => p.predictions),
      text: "Ha hecho más predicciones. Aquí sí vino a jugar.",
      value: (p: PlayerStat) => `${p.predictions} predicciones`,
    },
    {
      emoji: "🔥",
      title: "Mejor promedio",
      player: getTop(stats, (p) => p.pointsPerPrediction),
      text: "Pocos o muchos partidos, pero está exprimiendo puntos.",
      value: (p: PlayerStat) => `${p.pointsPerPrediction.toFixed(2)} pts/predicción`,
    },
    {
      emoji: "😅",
      title: "No va a ganar, pero se la está pasando bien",
      player: getTop(stats, (p) => p.zeroPointPredictions),
      text: "Muchas predicciones sin puntos. Pero la actitud cuenta.",
      value: (p: PlayerStat) => `${p.zeroPointPredictions} sin puntos`,
    },
  ].filter((award) => award.player);
}

export default async function StatsPage() {
  if (!supabase) return null;

  const [{ data: members }, { data: profiles }, { data: predictions }, { data: scores }, { data: matches }] =
    await Promise.all([
      supabase.from("league_members").select("id,user_id"),
      supabase.from("profiles").select("id,display_name"),
      supabase.from("predictions").select("id,member_id"),
      supabase
        .from("prediction_scores")
        .select("prediction_id,total_points,exact_score_points,goal_difference_points,outcome_points"),
      supabase.from("matches").select("id"),
    ]);

  const totalMatches = matches?.length ?? 0;

  const userToName = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));

  const memberToName = new Map(
    (members ?? []).map((member) => [member.id, userToName.get(member.user_id) ?? "Jugador"]),
  );

  const predictionToMember = new Map(
    (predictions ?? []).map((prediction) => [prediction.id, prediction.member_id]),
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

  for (const prediction of predictions ?? []) {
    const stat = statsByMember.get(prediction.member_id);
    if (stat) stat.predictions += 1;
  }

  for (const score of scores ?? []) {
    const memberId = predictionToMember.get(score.prediction_id);
    if (!memberId) continue;

    const stat = statsByMember.get(memberId);
    if (!stat) continue;

    stat.scoredPredictions += 1;
    stat.totalPoints += score.total_points ?? 0;

    if ((score.exact_score_points ?? 0) > 0) stat.exactScores += 1;
    if ((score.goal_difference_points ?? 0) > 0) stat.goalDifferences += 1;
    if ((score.outcome_points ?? 0) > 0) stat.correctOutcomes += 1;
    if ((score.total_points ?? 0) === 0) stat.zeroPointPredictions += 1;
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
            Familia Strassburger
          </p>
          <h1 className="mt-2 text-4xl font-black">Stats y premios</h1>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--color-text-subtle)" }}>
            Estadísticas serias, premios absurdos y reconocimiento para todos.
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
                  <th>Sin puntos</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((player, index) => (
                  <tr key={player.memberId} className="border-t border-white/10">
                    <td className="py-4 font-black">#{index + 1}</td>
                    <td className="font-bold">{player.name}</td>
                    <td>{player.totalPoints}</td>
                    <td>{player.predictions}</td>
                    <td>{pct(player.completionPercentage)}</td>
                    <td>
                      {player.exactScores} · {pct(player.exactPercentage)}
                    </td>
                    <td>
                      {player.correctOutcomes} · {pct(player.outcomePercentage)}
                    </td>
                    <td>{player.pointsPerPrediction.toFixed(2)}</td>
                    <td>
                      {player.zeroPointPredictions} · {pct(player.zeroPercentage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}