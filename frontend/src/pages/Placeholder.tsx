/** Página provisional: cada historia de usuario (US1–US6) la sustituye por la real. */
export function Placeholder({ title }: { title: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-slate-600">Próximamente.</p>
    </section>
  );
}
