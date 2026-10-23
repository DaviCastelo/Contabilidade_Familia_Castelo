"use server";

import { revalidatePath } from "next/cache";
import { getFamilyContext } from "@/lib/family";
import type { ActionResult } from "@/components/forms";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return v === null || v === "" ? null : String(v);
};
const num = (f: FormData, k: string) => Number(String(f.get(k) ?? "0").replace(",", "."));

const done = (message?: string): ActionResult => {
  revalidatePath("/", "layout");
  return { ok: true, message };
};
const fail = (error: { message: string } | null, fallback: string): ActionResult | null =>
  error ? { ok: false, error: `${fallback} (${error.message})` } : null;

export async function addTransaction(formData: FormData): Promise<ActionResult> {
  const { supabase, family } = await getFamilyContext();
  const amount = num(formData, "amount");
  if (!(amount > 0)) return { ok: false, error: "Informe um valor maior que zero." };
  const kind = str(formData, "kind");
  const { error } = await supabase.from("transactions").insert({
    family_id: family.id,
    kind,
    amount,
    occurred_on: str(formData, "occurred_on"),
    description: str(formData, "description"),
    category_id: str(formData, "category_id"),
    account_id: str(formData, "account_id"),
    member_id: str(formData, "member_id"),
    payment_method: str(formData, "payment_method"),
  });
  return fail(error, "Não foi possível salvar o lançamento") ?? done(kind === "income" ? "Ganho registrado." : "Gasto registrado.");
}

export async function deleteTransaction(formData: FormData): Promise<ActionResult> {
  const { supabase } = await getFamilyContext();
  const { error } = await supabase.from("transactions").delete().eq("id", str(formData, "id")!);
  return fail(error, "Não foi possível excluir") ?? done("Lançamento excluído.");
}

export async function setBudget(formData: FormData): Promise<ActionResult> {
  const { supabase, family } = await getFamilyContext();
  const amount = num(formData, "amount");
  const match = { family_id: family.id, category_id: str(formData, "category_id")!, month: `${str(formData, "month")}-01` };
  const { error } = amount
    ? await supabase.from("budgets").upsert({ ...match, amount }, { onConflict: "family_id,category_id,month" })
    : await supabase.from("budgets").delete().match(match);
  return fail(error, "Não foi possível salvar o orçamento") ?? done(amount ? "Limite salvo." : "Limite removido.");
}

export async function addInvestment(formData: FormData): Promise<ActionResult> {
  const { supabase, family } = await getFamilyContext();
  const initial = num(formData, "initial");
  const { data, error } = await supabase.from("investments").insert({
    family_id: family.id,
    name: str(formData, "name"),
    asset_type: str(formData, "asset_type"),
    institution: str(formData, "institution"),
    current_value: initial,
  }).select("id").single();
  if (error) return fail(error, "Não foi possível criar o investimento")!;
  if (initial > 0) {
    await supabase.from("investment_movements").insert({
      investment_id: data.id, family_id: family.id, kind: "aporte", amount: initial, note: "Saldo inicial",
    });
  }
  return done("Investimento adicionado.");
}

export async function addMovement(formData: FormData): Promise<ActionResult> {
  const { supabase, family } = await getFamilyContext();
  const investmentId = str(formData, "investment_id")!;
  const kind = str(formData, "kind")!;
  const amount = num(formData, "amount");
  if (!(amount > 0)) return { ok: false, error: "Informe um valor maior que zero." };
  const { error } = await supabase.from("investment_movements").insert({
    investment_id: investmentId, family_id: family.id, kind, amount, occurred_on: str(formData, "occurred_on"),
  });
  if (error) return fail(error, "Não foi possível lançar a movimentação")!;
  // aporte soma, resgate subtrai; provento é pago fora (não altera o valor aplicado)
  if (kind !== "provento") {
    const { data: inv } = await supabase.from("investments").select("current_value").eq("id", investmentId).single();
    const delta = kind === "aporte" ? amount : -amount;
    await supabase.from("investments").update({ current_value: Number(inv!.current_value) + delta }).eq("id", investmentId);
  }
  return done("Movimentação lançada.");
}

export async function updateInvestmentValue(formData: FormData): Promise<ActionResult> {
  const { supabase } = await getFamilyContext();
  const { error } = await supabase.from("investments")
    .update({ current_value: num(formData, "current_value"), updated_value_at: new Date().toISOString().slice(0, 10) })
    .eq("id", str(formData, "id")!);
  return fail(error, "Não foi possível atualizar") ?? done("Valor atualizado.");
}

export async function deleteInvestment(formData: FormData): Promise<ActionResult> {
  const { supabase } = await getFamilyContext();
  const { error } = await supabase.from("investments").delete().eq("id", str(formData, "id")!);
  return fail(error, "Não foi possível excluir") ?? done("Investimento excluído.");
}

export async function addCategory(formData: FormData): Promise<ActionResult> {
  const { supabase, family } = await getFamilyContext();
  const parentId = str(formData, "parent_id");
  let kind = str(formData, "kind");
  let color = str(formData, "color") ?? "#78716c";
  if (parentId) {
    const { data: parent } = await supabase.from("categories").select("kind, color").eq("id", parentId).single();
    kind = parent!.kind;
    color = parent!.color;
  }
  const { error } = await supabase.from("categories").insert({ family_id: family.id, name: str(formData, "name"), kind, color, parent_id: parentId });
  return fail(error, "Não foi possível criar a categoria") ?? done("Categoria criada.");
}

export async function deleteCategory(formData: FormData): Promise<ActionResult> {
  const { supabase } = await getFamilyContext();
  const { error } = await supabase.from("categories").delete().eq("id", str(formData, "id")!);
  return fail(error, "Não foi possível excluir") ?? done("Categoria excluída.");
}

export async function addAccount(formData: FormData): Promise<ActionResult> {
  const { supabase, family } = await getFamilyContext();
  const { error } = await supabase.from("accounts").insert({
    family_id: family.id, name: str(formData, "name"), kind: str(formData, "kind"), initial_balance: num(formData, "initial_balance"),
  });
  return fail(error, "Não foi possível criar a conta") ?? done("Conta adicionada.");
}

export async function deleteAccount(formData: FormData): Promise<ActionResult> {
  const { supabase } = await getFamilyContext();
  const { error } = await supabase.from("accounts").delete().eq("id", str(formData, "id")!);
  return fail(error, "Não foi possível excluir") ?? done("Conta excluída.");
}
