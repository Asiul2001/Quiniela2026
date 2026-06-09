"use client";



import { BonusPredictionOption } from "@/lib/predictions-page-data";
import { useState } from "react";
import { useEffect} from "react";

type Team = {
  id: string;
  name: string;
  tier: string | null;
};



export function BonusPicksCard({
  teams,
  leagueId,
  memberId,
  tournamentId,
  initialBonusPredictions,
}: {
  teams: Team[];
  leagueId: string;
  memberId: string;
  tournamentId: string;
  initialBonusPredictions: Array<{
  type: "dark_horse" | "golden_boot";
  payload: Record<string, unknown>;
}>;
}) {

    
  const [darkHorseTeamId, setDarkHorseTeamId] = useState("");
  const [goldenBoot, setGoldenBoot] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
  const darkHorsePrediction = initialBonusPredictions.find(
    (prediction) => prediction.type === "dark_horse",
  );

  const goldenBootPrediction = initialBonusPredictions.find(
    (prediction) => prediction.type === "golden_boot",
  );

  if (
    darkHorsePrediction?.payload &&
    typeof darkHorsePrediction.payload === "object" &&
    "teamId" in darkHorsePrediction.payload
  ) {
    setDarkHorseTeamId(String(darkHorsePrediction.payload.teamId));
  }

  if (
    goldenBootPrediction?.payload &&
    typeof goldenBootPrediction.payload === "object" &&
    "playerName" in goldenBootPrediction.payload
  ) {
    setGoldenBoot(String(goldenBootPrediction.payload.playerName));
  }
}, [initialBonusPredictions]);

  async function saveBonus(type: "dark_horse" | "golden_boot") {
    setSaving(true);

    const selectedTeam = teams.find((team) => team.id === darkHorseTeamId);

    if (type === "dark_horse") {
  setDarkHorseTeamId(darkHorseTeamId);
}

if (type === "golden_boot") {
  setGoldenBoot(goldenBoot);
}

    const payload =
      type === "dark_horse"
        ? {
            leagueId,
            memberId,
            tournamentId,
            type,
            teamId: darkHorseTeamId,
            value: {
              teamId: darkHorseTeamId,
              category: selectedTeam?.tier ?? null,
            },
          }
        : {
            leagueId,
            memberId,
            tournamentId,
            type,
            teamId: null,
            value: {
              playerName: goldenBoot,
            },
          };

    await fetch("/api/bonus-predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
  }

  

  return (
    <section
      className="rounded-[2rem] p-6"
      style={{
        border: "1px solid var(--color-border-accent)",
        backgroundColor: "var(--color-bg-card)",
      }}
    >
      <p
        className="text-xs uppercase tracking-[0.24em]"
        style={{ color: "var(--color-text-subtle)" }}
      >
        Bonus
      </p>

      <h2 className="mt-2 text-3xl font-black">Predicciones especiales</h2>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <label className="text-sm font-bold">Dark Horse</label>
        
<select
  value={darkHorseTeamId}
  onChange={(event) => setDarkHorseTeamId(event.target.value)}
  className="w-full rounded-2xl px-4 py-3"
  style={{
    border: "1px solid var(--color-border-accent)",
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "var(--color-text)",
  }}
>
  <option value="" style={{ color: "#111827", backgroundColor: "#ffffff" }}>
    Selecciona un equipo
  </option>

  {teams.map((team) => (
    <option
      key={team.id}
      value={team.id}
      style={{ color: "#111827", backgroundColor: "#ffffff" }}
    >
      {team.name.trim()} · {team.tier ?? "sin categoría"}
    </option>
  ))}
</select>

          <button
            type="button"
            disabled={!darkHorseTeamId || saving}
            onClick={() => saveBonus("dark_horse")}
            className="rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={{
              border: "1px solid var(--color-border-accent)",
              backgroundColor: "color-mix(in srgb, var(--color-accent) 18%, rgba(255,255,255,0.08))",
              color: "var(--color-text)",
            }}
          >
            Guardar Dark Horse
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold">Golden Boot</label>

          <input
            value={goldenBoot}
            onChange={(event) => setGoldenBoot(event.target.value)}
            placeholder="Nombre del jugador"
            className="w-full rounded-2xl px-4 py-3"
            style={{
              border: "1px solid var(--color-border-accent)",
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "var(--color-text)",
            }}
          />

          <button
            type="button"
            disabled={!goldenBoot.trim() || saving}
            onClick={() => saveBonus("golden_boot")}
            className="rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={{
              border: "1px solid var(--color-border-accent)",
              backgroundColor: "color-mix(in srgb, var(--color-accent) 18%, rgba(255,255,255,0.08))",
              color: "var(--color-text)",
            }}
          >
            Guardar Golden Boot
          </button>
        </div>
      </div>
    </section>
  );
}