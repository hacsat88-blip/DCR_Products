// ────────────────────────────────────────────────
// Command Palette — Action registry & filtering
// ────────────────────────────────────────────────
//
// Headless logic separated from the React/cmdk layer so it can be
// unit-tested under vitest without a React plugin. The UI component
// still defers to cmdk's fuzzy matching at runtime; this helper is a
// deterministic fallback used by non-UI callers and tests.

export interface CommandAction {
  id: string;
  label: string;
  hint?: string;
  section?: string;
  keywords?: string[];
  onSelect: () => void | Promise<void>;
}

/**
 * Filter a list of command actions by a free-form query.
 *
 * Ranking (lower rank wins):
 *   0. `label` prefix match
 *   1. `label` substring match
 *   2. any `keywords` entry substring match
 *
 * Empty/whitespace query returns the full list unchanged.
 */
export function filterActions(
  actions: CommandAction[],
  query: string,
): CommandAction[] {
  const q = query.trim().toLowerCase();
  if (!q) return actions.slice();

  type Ranked = { action: CommandAction; rank: number; index: number };
  const ranked: Ranked[] = [];

  actions.forEach((action, index) => {
    const label = action.label.toLowerCase();
    const keywords = (action.keywords ?? []).map((k) => k.toLowerCase());

    let rank = -1;
    if (label.startsWith(q)) rank = 0;
    else if (label.includes(q)) rank = 1;
    else if (keywords.some((k) => k.includes(q))) rank = 2;

    if (rank >= 0) ranked.push({ action, rank, index });
  });

  ranked.sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.index - b.index));
  return ranked.map((r) => r.action);
}
