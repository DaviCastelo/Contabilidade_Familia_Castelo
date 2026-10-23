"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CastleBuild, StatusMark } from "./Animations";

export type OverlayState =
  | { phase: "loading"; title: string; subtitle: string }
  | { phase: "success"; title: string }
  | { phase: "error"; title: string; subtitle: string; onRetry: () => void; onClose: () => void };

/**
 * Tela cheia azul-noite com a animação de Construção, para ações que constroem algo
 * (entrar, criar ou entrar na família). Sempre escura: é um momento de marca, como a ilustração do login.
 */
export default function LoadingOverlay({ state }: { state: OverlayState | null }) {
  // portal: ancestrais com transform (animação de entrada) prenderiam o `fixed` dentro deles
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!state || !mounted) return null;
  return createPortal((
    <div
      role={state.phase === "error" ? "alertdialog" : "status"}
      aria-live="assertive"
      aria-label={state.title}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#0a1120] px-6 text-center text-[#f6f4ef]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgb(199_154_43/0.12),transparent_60%)]" aria-hidden />
      <div className="relative mb-8">
        <CastleBuild />
      </div>
      <div className="relative flex min-h-32 w-full max-w-xs flex-col items-center">
        {state.phase === "loading" && (
          <div key="loading" className="fc-swap flex flex-col items-center">
            <p className="mb-1 text-base font-semibold tracking-[0.12em] uppercase">{state.title}</p>
            <p className="mb-6 text-sm text-[#c9d2e3]">{state.subtitle}</p>
            <div className="h-1.5 w-48 overflow-hidden rounded-full border border-white/5 bg-[#13294b]">
              <div className="fc-ring-bar h-full rounded-full bg-gradient-to-r from-[#c79a2b] to-[#e3b651] shadow-[0_0_8px_#c79a2b]" />
            </div>
          </div>
        )}
        {state.phase === "success" && (
          <div key="success" className="flex flex-col items-center gap-3">
            <StatusMark kind="success" />
            <p className="fc-swap text-base font-semibold tracking-[0.12em] text-[#7fd1a4] uppercase">{state.title}</p>
          </div>
        )}
        {state.phase === "error" && (
          <div key="error" className="flex flex-col items-center gap-2">
            <StatusMark kind="error" />
            <p className="fc-swap text-base font-semibold tracking-[0.12em] text-[#ff8a9b] uppercase">{state.title}</p>
            <p className="text-sm text-[#c9d2e3]">{state.subtitle}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={state.onRetry} className="min-h-11 cursor-pointer rounded-full border border-[#ff8a9b]/50 px-5 text-sm font-semibold text-[#ff8a9b] transition-colors hover:bg-[#ff8a9b]/15">
                Tentar novamente
              </button>
              <button type="button" onClick={state.onClose} className="min-h-11 cursor-pointer rounded-full px-4 text-sm text-[#c9d2e3] hover:text-[#f6f4ef]">
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  ), document.body);
}
