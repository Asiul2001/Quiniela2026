import Link from "next/link";
import { FeedbackForm } from "src/components/feedback-form";

const faqs = [
  {
    q: "¿Puedo cambiar mis predicciones?",
    a: "Sí, hasta que el partido quede bloqueado. Después del inicio del partido ya no se puede editar.",
  },
  {
    q: "¿Qué pasa si olvido mi código?",
    a: "Pídele ayuda a Luisa. Tu código no se muestra otra vez automáticamente, por eso es importante guardarlo.",
  },
  {
    q: "¿Cómo se calculan los puntos?",
    a: "Resultado correcto da 1 punto, diferencia correcta da 1 punto y marcador exacto da 3 puntos extra.",
  },
  {
    q: "¿Qué es el Dark Horse?",
    a: "Es una apuesta especial por un equipo que crees que puede sorprender. Mientras más arriesgada sea la categoría, mayor es el multiplicador.",
  },
  {
    q: "¿Cuándo se actualizan los resultados?",
    a: "Cuando Luisa guarda el resultado final del partido. Después de eso se calculan los puntos.",
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen px-6 py-10" style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text)" }}>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em]" style={{ color: "var(--color-text-subtle)" }}>
              Ayuda
            </p>
            <h1 className="mt-2 text-4xl font-black">FAQ y recomendaciones</h1>
          </div>

          <Link href="/tutorial" className="rounded-full px-4 py-2 text-sm font-semibold" style={{ border: "1px solid var(--color-border-accent)", backgroundColor: "rgba(255,255,255,0.06)" }}>
            Cómo jugar
          </Link>
        </header>

        <section className="grid gap-4">
          {faqs.map((item) => (
            <article key={item.q} className="rounded-[1.5rem] p-5" style={{ border: "1px solid var(--color-border-accent)", backgroundColor: "var(--color-bg-card)" }}>
              <h2 className="text-xl font-black">{item.q}</h2>
              <p className="mt-2 text-sm leading-7" style={{ color: "var(--color-text-subtle)" }}>{item.a}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[2rem] p-6" style={{ border: "1px solid var(--color-border-accent)", backgroundColor: "var(--color-bg-card)" }}>
          <h2 className="text-2xl font-black">Recomendaciones</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7" style={{ color: "var(--color-text-subtle)" }}>
            <li>No predigas solo con el corazón.</li>
            <li>El 1-0 y 2-1 suelen ser marcadores útiles.</li>
            <li>Los empates pueden salvarte puntos.</li>
            <li>El Dark Horse es para arriesgar bonito, no para regalar puntos.</li>
          </ul>
        </section>

        <FeedbackForm page="faq" />
      </div>
    </main>
  );
}