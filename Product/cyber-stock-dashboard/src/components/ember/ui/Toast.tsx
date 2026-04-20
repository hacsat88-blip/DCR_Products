"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface Toast {
  id: string;
  message: string;
  variant?: "success" | "error" | "info";
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, variant?: Toast["variant"]) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((message: string, variant: Toast["variant"] = "info") => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3000);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const value = React.useMemo(() => ({ toasts, addToast, removeToast }), [toasts, addToast, removeToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg transition-all",
            "min-w-64 max-w-md"
          )}
          style={{
            background: "var(--surface)",
            border: `1px solid ${toast.variant === "success" ? "var(--coral)" : "var(--border)"}`,
            color: "var(--ink)",
          }}
        >
          <span className="flex-1 text-sm">
            {toast.variant === "success" && "✓ "}
            {toast.message}
          </span>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="text-ink-mute hover:text-ink transition"
            aria-label="閉じる"
            style={{ fontSize: 18, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
