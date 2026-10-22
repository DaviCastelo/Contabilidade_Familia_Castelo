"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "in" ? signIn : signUp, null);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-semibold">🏰 Família Castelo</h1>
        <p className="mb-6 text-sm text-slate-500">Contabilidade da família</p>
        <form action={action} className="space-y-3">
          <div>
            <label className="label">E-mail</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label">Senha</label>
            <input name="password" type="password" required minLength={6} className="input" />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
          <button className="btn w-full" disabled={pending}>
            {mode === "in" ? "Entrar" : "Criar conta"}
          </button>
        </form>
        <button className="btn-ghost mt-3 w-full" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}
