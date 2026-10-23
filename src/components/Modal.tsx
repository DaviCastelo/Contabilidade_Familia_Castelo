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

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="m-0 mt-auto w-full max-w-none rounded-t-2xl border border-line bg-surface p-0 text-ink backdrop:bg-ink/40 md:m-auto md:max-w-2xl md:rounded-2xl"
    >
      <div className="max-h-[85vh] overflow-y-auto p-5">
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
