"use server";

import { revalidatePath } from "next/cache";
import { getFamilyContext } from "@/lib/family";
import { localISODate } from "@/lib/format";
import type { ActionResult } from "@/components/forms";
import { createRecurring, createTransactions } from "@/lib/ops";

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
  const kind = str(formData, "kind") as "income" | "expense";
  const occurred_on = str(formData, "occurred_on") ?? localISODate();
  const frequency = str(formData, "frequency") ?? "once";
  const common = {
    kind, amount, description: str(formData, "description"), category_id: str(formData, "category_id"),
    account_id: str(formData, "account_id"), member_id: str(formData, "member_id"), payment_method: str(formData, "payment_method"),
  };
  try {
    if (frequency === "monthly") {
      await createRecurring(supabase, family.id, { ...common, day_of_month: Number(occurred_on.slice(8, 10)), start_date: occurred_on });
      return done("Lançamento recorrente criado. Ele entra sozinho todo mês.");
    }
    const installments = frequency === "installments" ? Math.max(2, Math.floor(num(formData, "installments"))) : 1;
    await createTransactions(supabase, family.id, { ...common, occurred_on, installments });
    if (installments > 1) return done(`Compra lançada em ${installments} parcelas.`);
    return done(kind === "income" ? "Ganho registrado." : "Gasto registrado.");
  } catch (e) {
    return { ok: false, error: `Não foi possível salvar o lançamento (${(e as Error).message})` };
  }
}

export async function deleteInstallmentGroup(formData: FormData): Promise<ActionResult> {
  const { supabase } = await getFamilyContext();
  const { error } = await supabase.from("transactions").delete().eq("installment_group", str(formData, "id")!);
  return fail(error, "Não foi possível excluir as parcelas") ?? done("Parcelamento excluído.");
}

export async function addRecurring(formData: FormData): Promise<ActionResult> {
  const { supabase, family } = await getFamilyContext();
  const amount = num(formData, "amount");
  if (!(amount > 0)) return { ok: false, error: "Informe um valor maior que zero." };
  try {
    await createRecurring(supabase, family.id, {
      kind: str(formData, "kind") as "income" | "expense", amount,
      day_of_month: Math.min(31, Math.max(1, Math.floor(num(formData, "day_of_month")))),
      start_date: str(formData, "start_date") ?? localISODate(), end_date: str(formData, "end_date"),
      description: str(formData, "description"), category_id: str(formData, "category_id"),
      account_id: str(formData, "account_id"), member_id: str(formData, "member_id"), payment_method: str(formData, "payment_method"),
    });
    return done("Recorrente criado.");
  } catch (e) {
    return { ok: false, error: `Não foi possível criar (${(e as Error).message})` };
  }
}

export async function updateRecurring(formData: FormData): Promise<ActionResult> {
  const { supabase } = await getFamilyContext();
  const patch: Record<string, unknown> = {};
  if (formData.has("amount")) patch.amount = num(formData, "amount");
  if (formData.has("day_of_month")) patch.day_of_month = Math.min(31, Math.max(1, Math.floor(num(formData, "day_of_month"))));
  if (formData.has("active")) patch.active = str(formData, "active") === "true";
  if (formData.has("end_date")) patch.end_date = str(formData, "end_date");
  const { error } = await supabase.from("recurring_transactions").update(patch).eq("id", str(formData, "id")!);
  if (error) return fail(error, "Não foi possível atualizar")!;
  return done(patch.active === false ? "Recorrente pausado." : patch.active === true ? "Recorrente reativado." : "Recorrente atualizado.");
}

export async function deleteRecurring(formData: FormData): Promise<ActionResult> {
  const { supabase } = await getFamilyContext();
  // os lançamentos já gerados ficam; só para de gerar novos
  const { error } = await supabase.from("recurring_transactions").delete().eq("id", str(formData, "id")!);
  return fail(error, "Não foi possível excluir") ?? done("Recorrente excluído. Os lançamentos já feitos continuam.");
}

export async function updateCard(formData: FormData): Promise<ActionResult> {
  const { supabase } = await getFamilyContext();
  const day = (k: string) => (str(formData, k) ? Math.min(31, Math.max(1, Math.floor(num(formData, k)))) : null);
  const { error } = await supabase.from("accounts").update({
    closing_day: day("closing_day"), due_day: day("due_day"),
    credit_limit: str(formData, "credit_limit") ? num(formData, "credit_limit") : null,
    pay_from_account_id: str(formData, "pay_from_account_id"),
  }).eq("id", str(formData, "id")!);
  return fail(error, "Não foi possível salvar o cartão") ?? done("Cartão atualizado.");
}

export async function updateTransaction(formData: FormData): Promise<ActionResult> {
  const { supabase } = await getFamilyContext();
  const amount = num(formData, "amount");
  if (!(amount > 0)) return { ok: false, error: "Informe um valor maior que zero." };
  const { error } = await supabase.from("transactions").update({
    kind: str(formData, "kind"),
    amount,
    occurred_on: str(formData, "occurred_on"),
    description: str(formData, "description"),
    category_id: str(formData, "category_id"),
    account_id: str(formData, "account_id"),
    member_id: str(formData, "member_id"),
    payment_method: str(formData, "payment_method"),
  }).eq("id", str(formData, "id")!);
  return fail(error, "Não foi possível salvar as alterações") ?? done("Lançamento atualizado.");
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
    .update({ current_value: num(formData, "current_value"), updated_value_at: localISODate() })
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
  let color = str(formData, "color") ?? "#8a94a6";
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
