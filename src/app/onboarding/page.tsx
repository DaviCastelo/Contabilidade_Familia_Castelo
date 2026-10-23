"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, LoaderCircle, Plus, UserPlus } from "lucide-react";
import Logo from "@/components/Logo";
import { Field } from "@/components/forms";
import LoadingOverlay, { type OverlayState } from "@/components/loading/Overlay";
import { markSplashSeen } from "@/components/loading/Splash";
import { createFamily, joinFamily, type FamilyState } from "./actions";

type State = FamilyState;
const safe = (fn: typeof createFamily) => async (prev: State, fd: FormData): Promise<State> => {
  try { return await fn(prev, fd); } catch { return { connection: true }; }
};

export default function OnboardingPage() {
  const router = useRouter();
  const createRef = useRef<HTMLFormElement>(null);
  const joinRef = useRef<HTMLFormElement>(null);
  const [createState, createAction, creating] = useActionState<State, FormData>(safe(createFamily), null);
  const [joinState, joinAction, joining] = useActionState<State, FormData>(safe(joinFamily), null);
  const [dismissed, setDismissed] = useState<State>(null);

  const ok = createState?.ok || joinState?.ok;
  useEffect(() => {
    if (!ok) return;
    markSplashSeen();
    const t = setTimeout(() => router.replace("/"), 1000);
    return () => clearTimeout(t);
  }, [ok, router]);

  // Construção: criar a família ergue o castelo; entrar com convite abre os portões
  let overlay: OverlayState | null = null;
  if (creating) overlay = { phase: "loading", title: "Construindo o castelo", subtitle: "Criando a família, as contas e as categorias…" };
  else if (joining) overlay = { phase: "loading", title: "Abrindo os portões", subtitle: "Entrando na família…" };
  else if (createState?.ok) overlay = { phase: "success", title: "Família criada" };
  else if (joinState?.ok) overlay = { phase: "success", title: "Bem-vindo à família" };
  else {
    const failed = createState?.connection ? createState : joinState?.connection ? joinState : null;
    if (failed && dismissed !== failed) overlay = {
      phase: "error", title: "Falha na conexão", subtitle: "Não conseguimos falar com o servidor.",
      onRetry: () => (failed === createState ? createRef : joinRef).current?.requestSubmit(), onClose: () => setDismissed(failed),
    };
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 p-4">
      <LoadingOverlay state={overlay} />
      <div className="rise space-y-3">
        <Logo size={48} />
        <h1 className="display text-3xl font-semibold">Bem-vindo à contabilidade da família</h1>
        <p className="text-muted">Crie a família pela primeira vez ou entre na que já existe usando o código de convite.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <form ref={createRef} action={createAction} className="rise card space-y-4" style={{ animationDelay: "80ms" }}>
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
        <form ref={joinRef} action={joinAction} className="rise card space-y-4" style={{ animationDelay: "160ms" }}>
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
