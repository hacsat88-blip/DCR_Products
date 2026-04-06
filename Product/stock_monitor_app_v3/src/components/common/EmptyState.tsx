interface EmptyStateProps {
  title: string;
  body: string;
}

export function EmptyState({ title, body }: EmptyStateProps): JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-border-subtle bg-canvas-deep/50 p-6">
      <p className="text-base font-semibold text-text-primary">{title}</p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p>
    </div>
  );
}
