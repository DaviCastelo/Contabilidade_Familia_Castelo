import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Category = { id: string; name: string; kind: "income" | "expense"; color: string; parent_id: string | null };
export type Account = { id: string; name: string; kind: string; initial_balance: number };
export type Member = { user_id: string; display_name: string; role: string };

/** Usuário logado + família dele. Redireciona para login/onboarding quando falta algo. */
export async function getFamilyContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id, display_name, role, families(id, name, invite_code)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const family = membership.families as unknown as { id: string; name: string; invite_code: string };
  return { supabase, user, family, me: membership };
}

/** Nome da categoria com o pai: "Casa › Luz" */
export function categoryLabel(c: Category, all: Category[]) {
  const parent = c.parent_id ? all.find((p) => p.id === c.parent_id) : null;
  return parent ? `${parent.name} › ${c.name}` : c.name;
}

export function sortCategories(all: Category[]) {
  return [...all].sort((a, b) => categoryLabel(a, all).localeCompare(categoryLabel(b, all), "pt-BR"));
}
