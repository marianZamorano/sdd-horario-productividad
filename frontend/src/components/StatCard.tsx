interface StatCardProps {
  title: string;
  value: string;
  detail?: string;
}

export function StatCard({ title, value, detail }: StatCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-medium text-slate-500">{title}</h2>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
      {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
    </article>
  );
}
