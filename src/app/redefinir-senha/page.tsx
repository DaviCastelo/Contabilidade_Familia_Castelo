"use client";

import { useActionState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { Field } from "@/components/forms";
import { updatePassword, type AuthState } from "@/app/login/actions";

export default function RedefinirSenhaPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, null);
  return (
    <AuthShell title="Nova senha" subtitle="Escolha uma senha com pelo menos 6 caracteres.">
      <form action={action} className="space-y-4">
        <Field label="Nova senha">
          <input name="password" type="password" autoComplete="new-password" required minLength={6} className="input" />
        </Field>
        <Field label="Repita a senha">
          <input name="confirm" type="password" autoComplete="new-password" required minLength={6} className="input" />
        </Field>
        {state?.error && (
          <p role="alert" className="flex gap-2 rounded-lg bg-loss-soft p-3 text-sm"><CircleAlert className="h-4 w-4 shrink-0 text-loss" aria-hidden />{state.error}</p>
        )}
        <button className="btn w-full" disabled={pending} aria-busy={pending}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          Salvar nova senha
        </button>
      </form>
    </AuthShell>
  );
}
