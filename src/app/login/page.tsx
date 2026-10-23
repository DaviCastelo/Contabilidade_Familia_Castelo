"use client";

import { useActionState, useEffect, useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { Field } from "@/components/forms";
import { signIn, signUp, requestPasswordReset, type AuthState } from "./actions";

type Mode = "in" | "up" | "reset";
const COPY: Record<Mode, { title: string; subtitle: string; button: string }> = {
  in: { title: "Bem-vindo de volta", subtitle: "Entre para ver as contas da família.", button: "Entrar" },
  up: { title: "Criar conta", subtitle: "Depois você cria a família ou entra com um convite.", button: "Criar conta" },
  reset: { title: "Recuperar senha", subtitle: "Enviaremos um link para você criar uma nova senha.", button: "Enviar link" },
};
const ACTIONS = { in: signIn, up: signUp, reset: requestPasswordReset };

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("in");
  return <AuthForm key={mode} mode={mode} setMode={setMode} />;
}

function AuthForm({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(ACTIONS[mode], null);
  // /login?erro=link: o link do e-mail expirou ou já foi usado
  const [linkError, setLinkError] = useState(false);
  useEffect(() => setLinkError(new URLSearchParams(location.search).get("erro") === "link"), []);
  const copy = COPY[mode];

  return (
    <AuthShell title={copy.title} subtitle={copy.subtitle}>
      <form action={action} className="space-y-4">
        <Field label="E-mail">
          <input name="email" type="email" autoComplete="email" required className="input" />
        </Field>
        {mode !== "reset" && (
          <Field label="Senha">
            <input name="password" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} required minLength={6} className="input" />
          </Field>
        )}
        {linkError && !state && (
          <p role="alert" className="flex gap-2 rounded-lg bg-loss-soft p-3 text-sm"><CircleAlert className="h-4 w-4 shrink-0 text-loss" aria-hidden />O link do e-mail expirou ou já foi usado. Peça um novo em “Esqueci minha senha”.</p>
        )}
        {state?.error && (
          <p role="alert" className="flex gap-2 rounded-lg bg-loss-soft p-3 text-sm"><CircleAlert className="h-4 w-4 shrink-0 text-loss" aria-hidden />{state.error}</p>
        )}
        {state?.message && (
          <p role="status" className="flex gap-2 rounded-lg bg-gain-soft p-3 text-sm"><CircleCheck className="h-4 w-4 shrink-0 text-gain" aria-hidden />{state.message}</p>
        )}
        <button className="btn w-full" disabled={pending} aria-busy={pending}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          {copy.button}
        </button>
      </form>
      <div className="flex flex-col items-center gap-1 text-sm">
        {mode === "in" && (
          <>
            <button type="button" className="min-h-11 cursor-pointer text-accent hover:underline" onClick={() => setMode("reset")}>Esqueci minha senha</button>
            <button type="button" className="min-h-11 cursor-pointer text-muted hover:text-ink" onClick={() => setMode("up")}>Não tem conta? <span className="font-medium text-accent">Cadastre-se</span></button>
          </>
        )}
        {mode !== "in" && (
          <button type="button" className="min-h-11 cursor-pointer text-muted hover:text-ink" onClick={() => setMode("in")}>Voltar para <span className="font-medium text-accent">Entrar</span></button>
        )}
      </div>
    </AuthShell>
  );
}
