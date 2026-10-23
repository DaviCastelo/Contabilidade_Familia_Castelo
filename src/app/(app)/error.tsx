"use client";

import { useEffect } from "react";
import { StatusMark } from "@/components/loading/Animations";

/** Erro ao carregar uma página do app: o X desenhado e "Tentar novamente" (estado de erro das telas de carregamento). */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
      <StatusMark kind="error" />
      <p className="mt-2 text-base font-semibold tracking-[0.12em] text-loss uppercase">Falha na conexão</p>
      <p className="max-w-xs text-sm text-muted">Não conseguimos carregar esta página. Confira sua internet e tente de novo.</p>
      <button type="button" onClick={reset} className="btn-ghost mt-3 rounded-full border-loss/50 px-5 font-semibold text-loss hover:bg-loss-soft">
        Tentar novamente
      </button>
    </div>
  );
}
