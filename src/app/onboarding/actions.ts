"use server";

import { createClient } from "@/lib/supabase/server";

/** `ok`: a tela mostra a Construção concluída e segue para o painel. */
export type FamilyState = { error?: string; ok?: boolean; connection?: boolean } | null;

export async function createFamily(_: FamilyState, formData: FormData): Promise<FamilyState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_family", {
    family_name: String(formData.get("family_name")),
    member_name: String(formData.get("member_name")),
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function joinFamily(_: FamilyState, formData: FormData): Promise<FamilyState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_family", {
    code: String(formData.get("code")),
    member_name: String(formData.get("member_name")),
  });
  if (error) return { error: error.message.includes("inválido") ? "Código de convite inválido. Confira com quem criou a família." : error.message };
  return { ok: true };
}
