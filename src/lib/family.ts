import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Category = { id: string; name: string; kind: "income" | "expense"; color: string; parent_id: string | null };
export type Account = { id: string; name: string; kind: string; initial_balance: number };
export type Member = { user_id: string; display_name: string; role: string };

/** Opções dos selects do formulário de lançamento (serializáveis para client components). */
export type Option = { id: string; label: string; kind?: string };
export type FormOptions = { categories: Option[]; accounts: Option[]; members: Option[]; myId: string };

/** Usuário logado + família dele. Redireciona para login/onboarding quando falta algo. */
export const getFamilyContext = cache(async () => {
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
});

export const getCategories = cache(async () => {
  const { supabase, family } = await getFamilyContext();
  const { data } = await supabase.from("categories").select("id, name, kind, color, parent_id").eq("family_id", family.id);
  return sortCategories((data ?? []) as Category[]);
});

export const getFormOptions = cache(async (): Promise<FormOptions> => {
  const { supabase, family, user } = await getFamilyContext();
  const [categories, { data: accounts }, { data: members }] = await Promise.all([
    getCategories(),
    supabase.from("accounts").select("id, name").eq("family_id", family.id).order("name"),
    supabase.from("family_members").select("user_id, display_name").eq("family_id", family.id),
  ]);
  return {
    categories: categories.map((c) => ({ id: c.id, label: categoryLabel(c, categories), kind: c.kind })),
    accounts: (accounts ?? []).map((a) => ({ id: a.id, label: a.name })),
    members: (members ?? []).map((m) => ({ id: m.user_id, label: m.display_name })),
    myId: user.id,
  };
});

/** Nome da categoria com o pai: "Casa › Luz" */
export function categoryLabel(c: Category, all: Category[]) {
  const parent = c.parent_id ? all.find((p) => p.id === c.parent_id) : null;
  return parent ? `${parent.name} › ${c.name}` : c.name;
}

export function sortCategories(all: Category[]) {
  return [...all].sort((a, b) => categoryLabel(a, all).localeCompare(categoryLabel(b, all), "pt-BR"));
}

/** Categoria principal (subcategorias somam no pai). */
export function rootCategory(id: string | null, byId: Map<string, Category>) {
  const c = id ? byId.get(id) : undefined;
  return c?.parent_id ? byId.get(c.parent_id) : c;
}
