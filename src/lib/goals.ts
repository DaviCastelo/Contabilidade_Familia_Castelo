import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonths } from "./finance";
import { localISODate } from "./format";

export type GoalView = {
  id: string; name: string; icon: string; color: string; isEmergency: boolean; emergencyMonths: number;
  target: number | null; targetDate: string | null; investmentId: string | null; investmentName: string | null;
  saved: number; remaining: number | null; pct: number;
  /** guardado por mês (média dos últimos 3 meses de depósitos) */
  pace: number;
  /** quanto guardar por mês para chegar na data alvo */
  perMonthNeeded: number | null;
  /** previsão de quando chega no ritmo atual (AAAA-MM) */
  eta: string | null;
  /** só na reserva: meses de custo de vida cobertos */
  monthsCovered: number | null;
};

const monthsBetween = (fromISO: string, toISO: string) => {
  const [y1, m1] = fromISO.split("-").map(Number);
  const [y2, m2] = toISO.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
};

/**
 * Metas da família com o progresso calculado. Custo de vida = média dos gastos dos últimos 3 meses
 * completos (meses sem nenhum gasto ficam de fora da média).
 */
export async function loadGoals(supabase: SupabaseClient, familyId: string) {
  const today = localISODate();
  const monthStart = `${today.slice(0, 7)}-01`;
  const threeAgo = addMonths(monthStart, -3, 1);
  const [{ data: goals }, { data: contributions }, { data: investments }, { data: expenses }] = await Promise.all([
    supabase.from("goals").select("*").eq("family_id", familyId).order("is_emergency", { ascending: false }).order("created_at"),
    supabase.from("goal_contributions").select("goal_id, amount, occurred_on").eq("family_id", familyId),
    supabase.from("investments").select("id, name, current_value").eq("family_id", familyId),
    supabase.from("transactions").select("amount, occurred_on").eq("family_id", familyId).eq("kind", "expense").gte("occurred_on", threeAgo).lt("occurred_on", monthStart),
  ]);

  const perMonth = new Map<string, number>();
  for (const e of expenses ?? []) perMonth.set(e.occurred_on.slice(0, 7), (perMonth.get(e.occurred_on.slice(0, 7)) ?? 0) + Number(e.amount));
  const monthlyCost = perMonth.size ? [...perMonth.values()].reduce((a, b) => a + b, 0) / perMonth.size : null;

  const invById = new Map((investments ?? []).map((i) => [i.id, i]));
  const recentFrom = addMonths(today, -3);

  const views: GoalView[] = (goals ?? []).map((g) => {
    const own = (contributions ?? []).filter((c) => c.goal_id === g.id);
    const inv = g.investment_id ? invById.get(g.investment_id) : undefined;
    const saved = inv ? Number(inv.current_value) : own.reduce((s, c) => s + Number(c.amount), 0);
    const pace = Math.max(0, own.filter((c) => c.occurred_on > recentFrom).reduce((s, c) => s + Number(c.amount), 0) / 3);
    const target = g.is_emergency ? (monthlyCost ? monthlyCost * g.emergency_months : null) : g.target_amount == null ? null : Number(g.target_amount);
    const remaining = target == null ? null : Math.max(0, target - saved);
    const monthsLeft = g.target_date ? Math.max(1, monthsBetween(today, g.target_date)) : null;
    const eta = remaining && pace > 0 ? addMonths(today, Math.ceil(remaining / pace)).slice(0, 7) : null;
    return {
      id: g.id, name: g.name, icon: g.icon, color: g.color, isEmergency: g.is_emergency, emergencyMonths: g.emergency_months,
      target, targetDate: g.target_date, investmentId: g.investment_id, investmentName: inv?.name ?? null,
      saved, remaining, pct: target ? Math.min(100, (saved / target) * 100) : 0, pace,
      perMonthNeeded: remaining && monthsLeft ? remaining / monthsLeft : null, eta,
      monthsCovered: g.is_emergency && monthlyCost ? saved / monthlyCost : null,
    };
  });

  return { emergency: views.find((v) => v.isEmergency) ?? null, goals: views.filter((v) => !v.isEmergency), monthlyCost, investments: investments ?? [] };
}
