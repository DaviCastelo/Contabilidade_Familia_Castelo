"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CircleCheck, CircleAlert, X } from "lucide-react";

type Toast = { id: number; kind: "ok" | "error"; text: string };
const ToastCtx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});

export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-center gap-2 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`rise pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${t.kind === "ok" ? "border-gain/30 bg-gain-soft text-ink" : "border-loss/30 bg-loss-soft text-ink"}`}
          >
            {t.kind === "ok"
              ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-gain" aria-hidden />
              : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-loss" aria-hidden />}
            <span className="flex-1">{t.text}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Fechar aviso" className="-m-1 cursor-pointer rounded p-1 text-muted hover:text-ink">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
