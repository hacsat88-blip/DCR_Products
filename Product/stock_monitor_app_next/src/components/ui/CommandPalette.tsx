"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Command } from "cmdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import type { CommandAction } from "@/lib/commandPalette/actionRegistry";

export type { CommandAction } from "@/lib/commandPalette/actionRegistry";

export interface CommandPaletteProps {
  actions: CommandAction[];
  /** Keyboard shortcut to toggle the palette. Default "mod+k". */
  hotkey?: string;
}

interface ParsedHotkey {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
}

function parseHotkey(hotkey: string): ParsedHotkey {
  const parts = hotkey.toLowerCase().split("+").map((p) => p.trim());
  const key = parts[parts.length - 1] ?? "k";
  return {
    key,
    mod: parts.includes("mod") || parts.includes("ctrl") || parts.includes("cmd") || parts.includes("meta"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt") || parts.includes("option"),
  };
}

function matchesHotkey(event: KeyboardEvent, hk: ParsedHotkey): boolean {
  if (event.key.toLowerCase() !== hk.key) return false;
  if (hk.mod && !(event.metaKey || event.ctrlKey)) return false;
  if (hk.shift && !event.shiftKey) return false;
  if (hk.alt && !event.altKey) return false;
  return true;
}

/**
 * Global command palette. Opens on ⌘K / Ctrl+K (configurable via
 * `hotkey`) and renders the provided actions grouped by `section`.
 * Uses cmdk's built-in fuzzy matching for filtering.
 */
export function CommandPalette({
  actions,
  hotkey = "mod+k",
}: CommandPaletteProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const parsed = useMemo(() => parseHotkey(hotkey), [hotkey]);

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (matchesHotkey(event, parsed)) {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [parsed, open]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandAction[]>();
    for (const action of actions) {
      const section = action.section ?? "その他";
      const bucket = map.get(section) ?? [];
      bucket.push(action);
      map.set(section, bucket);
    }
    return Array.from(map.entries());
  }, [actions]);

  const handleSelect = useCallback(
    (action: CommandAction) => {
      // Close before running so navigation-style actions don't flicker.
      setOpen(false);
      try {
        const result = action.onSelect();
        if (result && typeof (result as Promise<void>).then === "function") {
          void (result as Promise<void>).catch((error) => {
            console.error("[CommandPalette] action failed", action.id, error);
          });
        }
      } catch (error) {
        console.error("[CommandPalette] action failed", action.id, error);
      }
    },
    [],
  );

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="cmdk-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[10vh]"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={clsx(
              "inp-glass w-full max-w-[640px] mx-4 rounded-xl overflow-hidden shadow-2xl",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="コマンドパレット"
          >
            <Command label="コマンドパレット" shouldFilter>
              <div className="border-b border-white/10">
                <Command.Input
                  autoFocus
                  value={search}
                  onValueChange={setSearch}
                  placeholder="コマンドを検索…  (Esc で閉じる)"
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-white/40"
                />
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="px-4 py-6 text-center text-sm text-white/50">
                  一致するコマンドがありません
                </Command.Empty>
                {groups.map(([section, items]) => (
                  <Command.Group
                    key={section}
                    heading={section}
                    className="text-xs uppercase tracking-wider text-white/40"
                  >
                    {items.map((action) => (
                      <Command.Item
                        key={action.id}
                        value={`${action.label} ${(action.keywords ?? []).join(" ")}`}
                        onSelect={() => handleSelect(action)}
                        className={clsx(
                          "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm",
                          "cursor-pointer data-[selected=true]:bg-white/10",
                          "text-white/90",
                        )}
                      >
                        <span className="truncate">{action.label}</span>
                        {action.hint ? (
                          <span className="shrink-0 text-xs text-white/50">
                            {action.hint}
                          </span>
                        ) : null}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default CommandPalette;
