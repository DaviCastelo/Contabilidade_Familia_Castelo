"use client";

import { useActionState } from "react";
import { CircleAlert, LoaderCircle, Plus, UserPlus } from "lucide-react";
import Logo from "@/components/Logo";
import { Field } from "@/components/forms";
import { createFamily, joinFamily } from "./actions";

type State = { error: string } | null;

export default function OnboardingPage() {
  const [createState, createAction, creating] = useActionState<State, FormData>(createFamily, null);
  const [joinState, joinAction, joining] = useActionState<State, FormData>(joinFamily, null);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 p-4">
      <div className="rise space-y-3">
        <Logo size={48} />
        <h1 className="display text-3xl font-semibold">Bem-vindo à contabilidade da família</h1>
        <p className="text-muted">Crie a família pela primeira vez ou entre na que já existe usando o código de convite.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <form action={createAction} className="rise card space-y-4" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-accent" aria-hidden />
            <h2 className="display text-lg font-semibold">Criar a família</h2>
          </div>
          <p className="text-sm text-muted">Já vem com contas e categorias prontas para usar.</p>
          <Field label="Nome da família"><input name="family_name" placeholder="Família Castelo" required className="input" /></Field>
          <Field label="Seu nome"><input name="member_name" placeholder="Davi" required autoComplete="given-name" className="input" /></Field>
          {createState?.error && <ErrorMsg text={createState.error} />}
          <button className="btn w-full" disabled={creating} aria-busy={creating}>
            {creating && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}Criar família
          </button>
        </form>
        <form action={joinAction} className="rise card space-y-4" style={{ animationDelay: "160ms" }}>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-accent" aria-hidden />
            <h2 className="display text-lg font-semibold">Entrar com convite</h2>
          </div>
          <p className="text-sm text-muted">Peça o código para quem criou a família (fica em Ajustes).</p>
          <Field label="Código de convite"><input name="code" placeholder="A1B2C3D4" required className="input font-mono tracking-widest uppercase" /></Field>
          <Field label="Seu nome"><input name="member_name" required autoComplete="given-name" className="input" /></Field>
          {joinState?.error && <ErrorMsg text={joinState.error} />}
          <button className="btn w-full" disabled={joining} aria-busy={joining}>
            {joining && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}Entrar na família
          </button>
        </form>
      </div>
    </main>
  );
}

function ErrorMsg({ text }: { text: string }) {
  return <p role="alert" className="flex gap-2 rounded-lg bg-loss-soft p-3 text-sm"><CircleAlert className="h-4 w-4 shrink-0 text-loss" aria-hidden />{text}</p>;
}
