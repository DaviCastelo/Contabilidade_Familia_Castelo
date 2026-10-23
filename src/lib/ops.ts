import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonths, computeFinance, type FinAccount, type FinRecurring, type FinTx } from "./finance";
import { localISODate } from "./format";

/**
 * Operações de escrita/leitura compartilhadas entre as telas (server actions)
 * e o assistente. Sempre usam o cliente do usuário logado, então o RLS vale.
 */

export type NewTransaction = {
  kind: "income" | "expense"; amount: number; occurred_on: string; description?: string | null;
  category_id?: string | null; account_id?: string | null; member_id?: string | null; payment_method?: string | null;
  /** 1 = à vista. Acima disso, `amount` é o valor TOTAL e vira N parcelas mensais. */
  installments?: number;
};

export async function createTransactions(supabase: SupabaseClient, familyId: string, t: NewTransaction) {
  const n = Math.max(1, Math.min(72, Math.floor(t.installments ?? 1)));
  const base = { family_id: familyId, kind: t.kind, description: t.description ?? null, category_id: t.category_id ?? null,
    account_id: t.account_id ?? null, member_id: t.member_id ?? null, payment_method: t.payment_method ?? null };
  if (n === 1) {
    const { data, error } = await supabase.from("transactions").insert({ ...base, amount: t.amount, occurred_on: t.occurred_on }).select("id").single();
    if (error) throw new Error(error.message);
    return [data.id as string];
  }
  // centavos: as primeiras parcelas levam o valor arredondado, a última absorve a diferença
  const cents = Math.round(t.amount * 100);
  const each = Math.floor(cents / n);
  const group = crypto.randomUUID();
  const rows = Array.from({ length: n }, (_, i) => ({
    ...base,
    amount: (i === n - 1 ? cents - each * (n - 1) : each) / 100,
    occurred_on: addMonths(t.occurred_on, i),
    installment_group: group, installment_number: i + 1, installment_total: n,
  }));
  const { data, error } = await supabase.from("transactions").insert(rows).select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.id as string);
}

export type NewRecurring = {
  kind: "income" | "expense"; amount: number; day_of_month: number; start_date: string; end_date?: string | null;
  description?: string | null; category_id?: string | null; account_id?: string | null; member_id?: string | null; payment_method?: string | null;
};

export async function createRecurring(supabase: SupabaseClient, familyId: string, r: NewRecurring) {
  const { data, error } = await supabase.from("recurring_transactions").insert({ family_id: familyId, ...r }).select("id").single();
  if (error) throw new Error(error.message);
  await supabase.rpc("materialize_recurring", { p_family: familyId });
  return data.id as string;
}

/** Carrega tudo que a previsão precisa e calcula saldos, faturas e projeção. */
export async function loadFinance(supabase: SupabaseClient, familyId: string, months = 3) {
  const [{ data: accounts }, { data: txs }, { data: recurring }, { data: investments }] = await Promise.all([
    supabase.from("accounts").select("id, name, kind, initial_balance, closing_day, due_day, credit_limit, pay_from_account_id").eq("family_id", familyId).order("name"),
    supabase.from("transactions").select("id, kind, amount, occurred_on, account_id, description, category_id, installment_number, installment_total").eq("family_id", familyId),
    supabase.from("recurring_transactions").select("id, kind, amount, day_of_month, start_date, end_date, active, generated_until, account_id, description, category_id").eq("family_id", familyId),
    supabase.from("investments").select("current_value").eq("family_id", familyId),
  ]);
  const today = localISODate();
  const fin = computeFinance({
    accounts: (accounts ?? []) as FinAccount[], txs: (txs ?? []) as FinTx[], recurring: (recurring ?? []) as FinRecurring[], today, months,
  });
  const invested = (investments ?? []).reduce((s, i) => s + Number(i.current_value), 0);
  return { ...fin, today, invested, patrimony: fin.liquid + invested - fin.cardDebt, accounts: (accounts ?? []) as FinAccount[] };
}

// ---------- resolução de nomes (usada pelo assistente) ----------

export const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

/** Acha um item pelo nome: exato > começa com > contém. Devolve erro com as opções se ambíguo. */
export function findByName<T>(items: T[], name: string, label: (t: T) => string[], what: string): T {
  const q = normalize(name);
  const labels = items.map((it) => ({ it, ls: label(it).map(normalize) }));
  const exact = labels.filter((x) => x.ls.some((l) => l === q));
  if (exact.length === 1) return exact[0].it;
  const starts = labels.filter((x) => x.ls.some((l) => l.startsWith(q)));
  if (starts.length === 1) return starts[0].it;
  const contains = labels.filter((x) => x.ls.some((l) => l.includes(q)));
  if (contains.length === 1) return contains[0].it;
  const options = (exact.length ? exact : starts.length ? starts : contains.length ? contains : labels).map((x) => label(x.it)[0]);
  throw new Error(`${what} "${name}" ${exact.length + starts.length + contains.length ? "é ambíguo" : "não encontrado"}. Opções: ${options.join(", ")}`);
}

export const todaySP = () => localISODate();
