"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | null;

async function origin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

const friendly = (msg: string) => {
  if (/rate limit|security purposes/i.test(msg)) return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  if (/already registered/i.test(msg)) return "Este e-mail já tem conta. Use “Entrar” ou “Esqueci minha senha”.";
  if (/password/i.test(msg)) return "A senha precisa ter pelo menos 6 caracteres.";
  return msg;
};

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) {
    if (/not confirmed/i.test(error.message)) return { error: "Confirme seu e-mail pelo link que enviamos antes de entrar." };
    return { error: "E-mail ou senha incorretos." };
  }
  redirect("/");
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
  redirect("/onboarding");
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
