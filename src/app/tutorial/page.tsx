import Link from "next/link";

const scoringExamples = [
  {
    prediction: "2-1",
    result: "2-1",
    points: "5 puntos",
    explanation: "Resultado correcto + diferencia correcta + marcador exacto",
  },
  {
    prediction: "3-2",
    result: "2-1",
    points: "2 puntos",
    explanation: "Resultado correcto + diferencia correcta",
  },
  {
    prediction: "1-0",
    result: "3-1",
    points: "1 punto",
    explanation: "Resultado correcto",
  },
  {
    prediction: "1-1",
    result: "3-1",
    points: "0 puntos",
    explanation: "Ni resultado, ni diferencia, ni marcador exacto",
  },
];

export default function TutorialPage() {
  return (
    <main
      className="min-h-screen px-6 py-10"
      style={{
        backgroundColor: "var(--color-primary)",
        color: "var(--color-text)",
      }}
    >
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p
              className="text-xs uppercase tracking-[0.28em]"
              style={{ color: "var(--color-text-subtle)" }}
            >
              Familia Strassburger
            </p>
            <h1 className="mt-2 text-4xl font-black">Cómo jugar</h1>
            <p className="mt-2 max-w-2xl" style={{ color: "var(--color-text-subtle)" }}>
              Una guía rápida para entender la quiniela, hacer tus predicciones y sumar puntos.
            </p>
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
            Ir a predicciones
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "Predice", "Elige el marcador antes de que empiece cada partido."],
            ["2", "Espera", "Cuando termina el partido, Luisa guarda el resultado real."],
            ["3", "Suma", "Los puntos se calculan automáticamente y subes o bajas en el ranking."],
          ].map(([number, title, text]) => (
            <article
              key={number}
              className="rounded-[2rem] p-6"
              style={{
                border: "1px solid var(--color-border-accent)",
                backgroundColor: "var(--color-bg-card)",
              }}
            >
              <div className="text-4xl font-black">{number}</div>
              <h2 className="mt-4 text-2xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-subtle)" }}>
                {text}
              </p>
            </article>
          ))}
        </section>

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
            Sistema de puntos
          </p>

          <h2 className="mt-2 text-3xl font-black">Cómo se calculan los puntos</h2>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-3xl font-black">+1</div>
              <p className="mt-1 font-bold">Resultado correcto</p>
              <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                Adivinas si gana local, visitante o empate.
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-3xl font-black">+1</div>
              <p className="mt-1 font-bold">Diferencia correcta</p>
              <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                Adivinas por cuántos goles gana o si queda empatado.
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-3xl font-black">+3</div>
              <p className="mt-1 font-bold">Marcador exacto</p>
              <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                Adivinas el resultado exacto del partido.
              </p>
            </div>
          </div>
        </section>
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
    Reglas extra
  </p>

  <h2 className="mt-2 text-3xl font-black">Predicciones especiales</h2>

  <div className="mt-6 grid gap-4">
    <div className="rounded-2xl bg-white/5 p-4">
      <h3 className="text-2xl font-black">Clasificación de grupos</h3>

      <div className="mt-4 space-y-3">
        <div className="flex justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
          <span>Equipo clasificado correctamente a la siguiente fase</span>
          <strong>+1 punto</strong>
        </div>

        <div className="flex justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
          <span>Posición exacta en el grupo</span>
          <strong>+2 puntos</strong>
        </div>
      </div>
    </div>

    <div className="rounded-2xl bg-white/5 p-4">
      <h3 className="text-2xl font-black">Golden Boot</h3>

      <div className="mt-4 space-y-3">
        <div className="flex justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
          <span>Debe elegirse antes del inicio del torneo</span>
          <strong>Sí</strong>
        </div>

        <div className="flex justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
          <span>Predicción correcta</span>
          <strong>+5 puntos</strong>
        </div>
      </div>
    </div>
  </div>
</section>
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
    Predicción especial
  </p>

  <h2 className="mt-2 text-3xl font-black">¿Qué es el Dark Horse?</h2>

  <p className="mt-4 text-sm leading-7" style={{ color: "var(--color-text-subtle)" }}>
    El Dark Horse es tu apuesta especial por un equipo que crees que puede sorprender en el torneo.
    No se trata necesariamente de elegir al campeón favorito, sino de encontrar un equipo que pueda
    llegar más lejos de lo esperado.
  </p>

  <p className="mt-3 text-sm leading-7" style={{ color: "var(--color-text-subtle)" }}>
    Por eso el sistema usa multiplicadores: elegir a un favorito es más seguro, pero da menos recompensa.
    Elegir a un equipo más arriesgado puede dar más puntos si realmente avanza lejos.
  </p>

  <div className="mt-6 grid gap-3 md:grid-cols-2">
    {[
      ["Favorite", "×1", "Equipos muy fuertes. Menos riesgo, menor recompensa."],
      ["Strong outsider", "×1.5", "Equipos buenos que pueden sorprender."],
      ["Dark horse", "×2", "Equipos con potencial de sorpresa real."],
      ["Big surprise", "×2.5", "Apuestas arriesgadas. Si salen bien, pagan más."],
    ].map(([label, multiplier, text]) => (
      <div key={label} className="rounded-2xl bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-black">{label}</h3>
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black">
            {multiplier}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-subtle)" }}>
          {text}
        </p>
      </div>
    ))}
  </div>

  <div className="mt-6 rounded-2xl bg-white/5 p-4">
    <h3 className="font-black">Puntos base por avance</h3>

    <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
      {[
        ["Dieciseisavos", "1 punto"],
        ["Octavos", "2 puntos"],
        ["Cuartos", "3 puntos"],
        ["Semifinal", "4 puntos"],
        ["Final", "5 puntos"],
        ["Campeón", "6 puntos"],
      ].map(([stage, points]) => (
        <div key={stage} className="flex justify-between gap-4 rounded-xl bg-white/5 px-3 py-2">
          <span style={{ color: "var(--color-text-subtle)" }}>{stage}</span>
          <strong>{points}</strong>
        </div>
      ))}
    </div>
  </div>

  <p className="mt-4 text-sm leading-7" style={{ color: "var(--color-text-subtle)" }}>
    La fórmula es: <strong style={{ color: "var(--color-text)" }}>puntos base × multiplicador</strong>.
    Así, todos tienen una razón para arriesgarse, pero sin que el Dark Horse pese más que acertar muchos partidos.
  </p>
</section>

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
            Ejemplos
          </p>

          <h2 className="mt-2 text-3xl font-black">Ejemplos de puntuación</h2>

          <div className="mt-6 grid gap-3">
            {scoringExamples.map((example) => (
              <div
                key={`${example.prediction}-${example.result}`}
                className="grid gap-3 rounded-2xl bg-white/5 p-4 md:grid-cols-[1fr_1fr_auto_2fr] md:items-center"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
                    Predicción
                  </p>
                  <p className="text-xl font-black">{example.prediction}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
                    Resultado
                  </p>
                  <p className="text-xl font-black">{example.result}</p>
                </div>

                <div className="rounded-full px-4 py-2 text-sm font-black bg-white/10">
                  {example.points}
                </div>

                <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
                  {example.explanation}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}