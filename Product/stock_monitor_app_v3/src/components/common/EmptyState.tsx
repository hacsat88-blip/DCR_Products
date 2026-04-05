interface EmptyStateProps {
  title: string;
  body: string;
}

export function EmptyState({ title, body }: EmptyStateProps): JSX.Element {
  return (
    <div className="rounded-none border border-dashed border-mint/20 bg-canvas-deep/50 p-6">{/* cyber: sharp border + mint accent */}
      <p className="font-orb text-base font-semibold text-mint">{title}</p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p>
    </div>
  );
}
