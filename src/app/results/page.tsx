import Link from "next/link";
import { getResultsPageData } from "@/lib/results-page-data";
import { ResultsPageClient } from "@/components/results-page-client";




export default async function ResultsPage() {
  const data = await getResultsPageData();

  
  

  return (
    <main
      className="min-h-screen px-6 py-10"
      style={{
        backgroundColor: "var(--color-primary)",
        color: "var(--color-text)",
      }}
    >
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p
              className="text-xs uppercase tracking-[0.28em]"
              style={{ color: "var(--color-text-subtle)" }}
            >
              {data.leagueName}
            </p>
            <h1 className="mt-2 text-4xl font-black">Resultados</h1>
            <p className="mt-2" style={{ color: "var(--color-text-subtle)" }}>
              {data.tournamentName}
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
            Predicciones
          </Link>
        </header>

        <ResultsPageClient matches={data.matches} />
      </div>
    </main>
  );
}