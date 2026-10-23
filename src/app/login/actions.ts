"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** `ok` + `next`: a tela mostra o "Acesso liberado" e navega sozinha. `connection`: falha de rede. */
export type AuthState = { error?: string; message?: string; ok?: boolean; next?: string; connection?: boolean; email?: string } | null;

async function origin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

const friendly = (msg: string) => {
  if (/rate limit|security purposes/i.test(msg)) return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  if (/already registered/i.test(msg)) return "Este e-mail já tem conta. Use “Entrar” ou “Esqueci minha senha”.";
  if (/weak|should (contain|be)|at least|password/i.test(msg)) return "Senha fraca: use 8 caracteres ou mais, com letra maiúscula, minúscula, número e símbolo.";
  return msg;
};

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) {
    const email = String(formData.get("email")); // devolvido para o campo não ser apagado
    if (/not confirmed/i.test(error.message)) return { error: "Confirme seu e-mail pelo link que enviamos antes de entrar.", email };
    return { error: "E-mail ou senha incorretos.", email };
  }
  return { ok: true, next: "/" };
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: friendly(error.message) };
  if (!data.session) return { message: "Conta criada! Abra o link que enviamos ao seu e-mail para confirmar." };
  return { ok: true, next: "/onboarding" };
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(String(formData.get("email")), {
    redirectTo: `${await origin()}/auth/callback?next=/redefinir-senha`,
  });
  if (error) return { error: friendly(error.message) };
  return { message: "Se o e-mail tiver conta, enviamos um link para criar uma nova senha." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password"));
  if (password !== String(formData.get("confirm"))) return { error: "As senhas não são iguais." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendly(error.message) };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
