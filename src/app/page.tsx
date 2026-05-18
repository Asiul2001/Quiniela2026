export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-16">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Quiniela Platform
        </p>
        <h1 className="text-4xl font-bold text-slate-900">
          Multi-league football predictions, built on reusable domain logic.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-700">
          This foundation keeps scoring, permissions, prediction locking, and
          database modeling separate from UI so the first family league can grow
          into a broader platform later.
        </p>
      </section>
    </main>
  );
}

