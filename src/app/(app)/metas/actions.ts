"use server";

import { revalidatePath } from "next/cache";
import { getFamilyContext } from "@/lib/family";
import { localISODate } from "@/lib/format";
import type { ActionResult } from "@/components/forms";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return v === null || v === "" ? null : String(v);
};
const num = (f: FormData, k: string) => Number(String(f.get(k) ?? "0").replace(",", "."));
const done = (message: string): ActionResult => {
  revalidatePath("/", "layout");
  return { ok: true, message };
};
const failed = (msg: string, e: { message: string }): ActionResult => ({ ok: false, error: `${msg} (${e.message})` });

export async function saveGoal(formData: FormData): Promise<ActionResult> {
  const { supabase, family } = await getFamilyContext();
  const id = str(formData, "id");
  const target = num(formData, "target_amount");
  const row = {
    name: str(formData, "name") ?? "Meta", icon: str(formData, "icon") ?? "flag", color: str(formData, "color") ?? "#c79a2b",
    target_amount: target > 0 ? target : null, target_date: str(formData, "target_date"), investment_id: str(formData, "investment_id"),
  };
  const { error } = id
    ? await supabase.from("goals").update(row).eq("id", id)
    : await supabase.from("goals").insert({ ...row, family_id: family.id });
  return error ? failed("Não foi possível salvar a meta", error) : done(id ? "Meta atualizada." : "Meta criada.");
}

export async function saveEmergency(formData: FormData): Promise<ActionResult> {
  const { supabase, family } = await getFamilyContext();
  const row = {
    family_id: family.id, is_emergency: true, name: "Reserva de emergência", icon: "umbrella", color: "#2ba5a0",
    emergency_months: Math.min(24, Math.max(1, Math.floor(num(formData, "emergency_months") || 6))),
    investment_id: str(formData, "investment_id"),
  };
  const { data: existing } = await supabase.from("goals").select("id").eq("family_id", family.id).eq("is_emergency", true).maybeSingle();
  const { error } = existing
    ? await supabase.from("goals").update({ emergency_months: row.emergency_months, investment_id: row.investment_id }).eq("id", existing.id)
    : await supabase.from("goals").insert(row);
  return error ? failed("Não foi possível salvar a reserva", error) : done(existing ? "Reserva atualizada." : "Reserva de emergência criada.");
}

/** Depósito (+) ou retirada (−) numa meta que não acompanha investimento. */
export async function contribute(formData: FormData): Promise<ActionResult> {
  const { supabase, family } = await getFamilyContext();
  const value = num(formData, "amount");
  if (!(value > 0)) return { ok: false, error: "Informe um valor maior que zero." };
  const out = str(formData, "direction") === "out";
  const { error } = await supabase.from("goal_contributions").insert({
    goal_id: str(formData, "goal_id"), family_id: family.id, amount: out ? -value : value, occurred_on: localISODate(),
  });
  return error ? failed("Não foi possível registrar", error) : done(out ? "Retirada registrada." : "Valor guardado. Continue assim!");
}

export async function deleteGoal(formData: FormData): Promise<ActionResult> {
  const { supabase } = await getFamilyContext();
  const { error } = await supabase.from("goals").delete().eq("id", str(formData, "id")!);
  return error ? failed("Não foi possível excluir", error) : done("Meta excluída.");
}
