"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useToast } from "./Toast";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
type Action = (fd: FormData) => Promise<ActionResult>;

/** Rótulo envolvendo o campo: associação implícita, acessível sem precisar de ids. */
export function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function SubmitButton({ children, pendingText = "Salvando…", className = "btn", name, value }: {
  children: React.ReactNode; pendingText?: string; className?: string; name?: string; value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-busy={pending} name={name} value={value}>
      {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? pendingText : children}
    </button>
  );
}

/** Form que chama uma server action, mostra aviso de sucesso/erro e limpa os campos. */
export function ActionForm({ action, children, className, reset = true, onSuccess }: {
  action: Action; children: React.ReactNode; className?: string; reset?: boolean; onSuccess?: () => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const toast = useToast();
  return (
    <form
      ref={ref}
      className={className}
      action={async (fd) => {
        try {
          const r = await action(fd);
          if (r.ok) {
            if (r.message) toast("ok", r.message);
            if (reset) ref.current?.reset();
            onSuccess?.();
          } else toast("error", r.error);
        } catch {
          toast("error", "Não foi possível salvar. Verifique sua conexão e tente de novo.");
        }
      }}
    >
      {children}
    </form>
  );
}

/** Exclusão em dois toques: o primeiro pede confirmação, o segundo apaga. */
export function DeleteButton({ action, id, what }: { action: Action; id: string; what: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className="icon-btn hover:text-loss" aria-label={`Excluir ${what}`}>
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    );
  }
  return (
    <ActionForm action={action} reset={false}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton pendingText="Excluindo…" className="btn-ghost border-loss/40 bg-loss-soft text-loss hover:bg-loss-soft">
        Confirmar exclusão
      </SubmitButton>
    </ActionForm>
  );
}
