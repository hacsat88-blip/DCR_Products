interface EmptyStateProps {
  title: string;
  body: string;
}

export function EmptyState({ title, body }: EmptyStateProps): JSX.Element {
  return (
    <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/50 p-6">
      <p className="text-base font-semibold text-slate-100">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}
