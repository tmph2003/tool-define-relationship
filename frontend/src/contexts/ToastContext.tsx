import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const TYPE_STYLES: Record<ToastType, { icon: string; color: string; bg: string; border: string }> = {
  success: {
    icon: "✓",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.25)",
  },
  error: {
    icon: "✕",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
  },
  warning: {
    icon: "⚠",
    color: "var(--color-amber)",
    bg: "var(--color-amber-dim)",
    border: "rgba(245,166,35,0.3)",
  },
  info: {
    icon: "ℹ",
    color: "#4E9EFF",
    bg: "rgba(78,158,255,0.08)",
    border: "rgba(78,158,255,0.25)",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, message, duration = 3000 }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        className="fixed z-50 flex flex-col gap-2 pointer-events-none"
        style={{ bottom: 24, right: 24, alignItems: "flex-end" }}
      >
        {toasts.map((t) => {
          const style = TYPE_STYLES[t.type];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-2.5 px-3 py-2.5 rounded-sm shadow-xl animate-slide-up"
              style={{
                background: "var(--color-surface)",
                borderLeft: `3px solid ${style.color}`,
                borderTop: "1px solid var(--color-border-mid)",
                borderRight: "1px solid var(--color-border-mid)",
                borderBottom: "1px solid var(--color-border-mid)",
                minWidth: 260,
                maxWidth: 400,
              }}
            >
              <span
                className="shrink-0 flex items-center justify-center mt-0.5"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  color: style.color,
                  fontSize: 10,
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                {style.icon}
              </span>
              <span
                className="flex-1 text-xs"
                style={{
                  color: "var(--color-text-1)",
                  fontFamily: "JetBrains Mono, monospace",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {t.message}
              </span>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-xs hover:text-white transition-colors"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-text-3)",
                  cursor: "pointer",
                  padding: "0 2px",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slide-up-toast {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-up {
          animation: slide-up-toast 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
