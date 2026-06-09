import Link from "next/link";

const matchRules = [
  ["Resultado correcto", "+1 punto"],
  ["Diferencia de goles correcta", "+1 punto"],
  ["Marcador exacto", "+3 puntos"],
];

const groupRules = [
  ["Equipo clasificado correctamente a la siguiente fase", "+1 punto"],
  ["Posición exacta en el grupo", "+2 puntos"],
];

const darkHorseStages = [
  ["Llega a dieciseisavos", "1 punto base"],
  ["Llega a octavos", "2 puntos base"],
  ["Llega a cuartos", "3 puntos base"],
  ["Llega a semifinal", "4 puntos base"],
  ["Llega a la final", "5 puntos base"],
  ["Campeón", "6 puntos base"],
];

const darkHorseMultipliers = [
  ["Favorite", "×1"],
  ["Strong outsider", "×1.5"],
  ["Dark horse", "×2"],
  ["Big surprise", "×2.5"],
];

function RuleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-[2rem] p-6"
      style={{
        border: "1px solid var(--color-border-accent)",
        backgroundColor: "var(--color-bg-card)",
      }}
    >
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3 text-sm"
      style={{
        backgroundColor: "rgba(255,255,255,0.06)",
      }}
    >
      <span style={{ color: "var(--color-text-subtle)" }}>{label}</span>
      <strong style={{ color: "var(--color-text)" }}>{value}</strong>
    </div>
  );
}

export default function RulesPage() {
  return (
    <main
      className="min-h-screen px-6 py-10"
      style={{
        backgroundColor: "var(--color-primary)",
        color: "var(--color-text)",
      }}
    >
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p
              className="text-xs uppercase tracking-[0.28em]"
              style={{ color: "var(--color-text-subtle)" }}
            >
              Quiniela
            </p>
            <h1 className="mt-2 text-4xl font-black">Reglas y puntos</h1>
          </div>

          <Link
            href="/predictions"
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              border: "1px solid var(--color-border-accent)",
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "var(--color-text)",
            }}
          >
            Volver a predicciones
          </Link>
        </header>

        <RuleCard title="Partidos">
          {matchRules.map(([label, value]) => (
            <RuleRow key={label} label={label} value={value} />
          ))}
          <RuleRow label="Máximo por partido" value="5 puntos" />
        </RuleCard>

        <RuleCard title="Clasificación de grupos">
          {groupRules.map(([label, value]) => (
            <RuleRow key={label} label={label} value={value} />
          ))}
        </RuleCard>

        <RuleCard title="Golden Boot">
          <RuleRow label="Debe elegirse antes del inicio del torneo" value="Sí" />
          <RuleRow label="Predicción correcta" value="+5 puntos" />
        </RuleCard>

        <RuleCard title="Dark Horse">
          <RuleRow label="Debe elegirse antes del inicio del torneo" value="Sí" />
          <RuleRow label="Cálculo" value="Puntos base × multiplicador" />

          <h3 className="pt-4 text-lg font-black">Puntos base por avance</h3>
          {darkHorseStages.map(([label, value]) => (
            <RuleRow key={label} label={label} value={value} />
          ))}

          <h3 className="pt-4 text-lg font-black">Multiplicadores</h3>
          {darkHorseMultipliers.map(([label, value]) => (
            <RuleRow key={label} label={label} value={value} />
          ))}
        </RuleCard>
      </div>
    </main>
  );
}