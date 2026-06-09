import { supabase } from "@/lib/supabase";

export default async function AdminFeedbackPage() {
  const { data: feedback } = supabase
    ? await supabase
        .from("feedback")
        .select("id,name,message,page,created_at")
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <main className="min-h-screen px-6 py-10" style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text)" }}>
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.28em]" style={{ color: "var(--color-text-subtle)" }}>
            Admin
          </p>
          <h1 className="mt-2 text-4xl font-black">Feedback recibido</h1>
        </header>

        <div className="grid gap-3">
          {(feedback ?? []).map((item) => (
            <article key={item.id} className="rounded-[1.5rem] p-5" style={{ border: "1px solid var(--color-border-accent)", backgroundColor: "var(--color-bg-card)" }}>
              <div className="flex flex-wrap justify-between gap-3 text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-subtle)" }}>
                <span>{item.name || "Anónimo"}</span>
                <span>{item.page || "sin página"}</span>
              </div>
              <p className="mt-3 text-sm leading-7">{item.message}</p>
              <p className="mt-3 text-xs" style={{ color: "var(--color-text-subtle)" }}>
                {new Date(item.created_at).toLocaleString("es-MX")}
              </p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}