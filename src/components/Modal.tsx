"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/** Diálogo nativo: foco preso dentro, Esc fecha, fundo escurecido. No celular vira uma folha que sobe do rodapé. */
export default function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // foca o primeiro campo (ex.: valor) para já sair digitando
      (d.querySelector<HTMLElement>("[data-autofocus]") ?? d.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea"))?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  // o <dialog> nativo não trava a página de fundo: no celular o dedo arrastava tudo para os lados
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { html.style.overflow = previous; };
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="m-0 mt-auto w-full max-w-[100vw] overflow-hidden rounded-t-2xl border border-line bg-surface p-0 text-ink backdrop:bg-ink/40 md:m-auto md:max-w-2xl md:rounded-2xl"
    >
      {/* só rola na vertical: nada de arrastar o formulário para o lado */}
      <div className="max-h-[85dvh] touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="display text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Fechar">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {open && children}
      </div>
    </dialog>
  );
}
