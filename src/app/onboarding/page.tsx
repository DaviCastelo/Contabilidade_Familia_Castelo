"use client";

import { useActionState } from "react";
import { createFamily, joinFamily } from "./actions";

export default function OnboardingPage() {
  const [createState, createAction, creating] = useActionState(createFamily, null);
  const [joinState, joinAction, joining] = useActionState(joinFamily, null);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Bem-vindo! 👋</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <form action={createAction} className="card space-y-3">
          <h2 className="font-semibold">Criar a família</h2>
          <p className="text-sm text-slate-500">Já vem com contas e categorias prontas.</p>
          <input name="family_name" placeholder="Família Castelo" required className="input" />
          <input name="member_name" placeholder="Seu nome" required className="input" />
          {createState?.error && <p className="text-sm text-red-600">{createState.error}</p>}
          <button className="btn w-full" disabled={creating}>Criar</button>
        </form>
        <form action={joinAction} className="card space-y-3">
          <h2 className="font-semibold">Entrar com convite</h2>
          <p className="text-sm text-slate-500">Peça o código para quem criou a família.</p>
          <input name="code" placeholder="Código (ex: A1B2C3D4)" required className="input uppercase" />
          <input name="member_name" placeholder="Seu nome" required className="input" />
          {joinState?.error && <p className="text-sm text-red-600">{joinState.error}</p>}
          <button className="btn w-full" disabled={joining}>Entrar</button>
        </form>
      </div>
    </main>
  );
}
