"use client";

import { useState } from "react";

export function FeedbackForm({ page }: { page?: string }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

async function submitFeedback() {
  if (!message.trim()) return;

  setSaving(true);
  setDone(false);

  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, message, page }),
  });

  const text = await response.text();

  setSaving(false);

  if (!response.ok) {
    alert(text);
    return;
  }

  setMessage("");
  setDone(true);
}

  return (
    <section className="rounded-[2rem] p-6" style={{ border: "1px solid var(--color-border-accent)", backgroundColor: "var(--color-bg-card)" }}>
      <h2 className="text-2xl font-black">Feedback</h2>
      <p className="mt-2 text-sm" style={{ color: "var(--color-text-subtle)" }}>
        ¿Algo está raro, confuso o quieres sugerir una mejora?
      </p>

      <div className="mt-5 grid gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre opcional"
          className="rounded-2xl px-4 py-3"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid var(--color-border-accent)" }}
        />

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe tu feedback..."
          rows={4}
          className="rounded-2xl px-4 py-3"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid var(--color-border-accent)" }}
        />

        <button
          type="button"
          onClick={submitFeedback}
          disabled={saving || !message.trim()}
          className="rounded-full px-5 py-3 text-sm font-bold disabled:opacity-50"
          style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 22%, rgba(255,255,255,0.08))" }}
        >
          {saving ? "Enviando..." : "Enviar feedback"}
        </button>

        {done ? <p className="text-sm text-emerald-300">Gracias, feedback enviado.</p> : null}
      </div>
    </section>
  );
}