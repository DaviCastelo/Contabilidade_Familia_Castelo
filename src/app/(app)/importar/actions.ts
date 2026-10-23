"use server";

import { revalidatePath } from "next/cache";
import { getFamilyContext, getCategories } from "@/lib/family";
import { normalize } from "@/lib/ops";
import type { ImportItem } from "@/lib/importer";

/** Palavras-chave → nome da categoria padrão (usado quando não há histórico da mesma descrição). */
const RULES: [RegExp, string][] = [
  [/supermerc|mercado|atacad|assai|carrefour|extra |pao de acucar|hortifruti|sacolao/, "Mercado"],
  [/ifood|rappi|restaurante|lanchonete|pizza|burger|mcdonald|bk |padaria|cafe|bar /, "Restaurante"],
  [/uber|99 ?(app|pop|taxi)|cabify|metro|onibus|bilhete|recarga.*(bom|top)/, "Uber/Ônibus"],
  [/posto|shell|ipiranga|petrobras|br mania|combustiv|gasolina|etanol/, "Combustível"],
  [/farmacia|drogaria|drogasil|raia|pague menos|panvel|hospital|clinica|laborat|dentist|unimed|amil|hapvida/, "Saúde"],
  [/netflix|spotify|amazon prime|prime video|disney|hbo|max\.com|youtube|deezer|apple\.com|google one|icloud|globoplay|paramount/, "Assinaturas"],
  [/enel|cemig|copel|light|celpe|coelba|energia|eletropaulo|neoenergia/, "Luz"],
  [/sabesp|cedae|copasa|sanepar|embasa|compesa|agua e esgoto/, "Água"],
  [/vivo|claro|tim |oi fibra|net virtua|internet|fibra|telecom/, "Internet"],
  [/aluguel|condominio|imobiliaria|quintoandar/, "Aluguel"],
  [/escola|faculdade|curso|udemy|alura|livraria|mensalidade/, "Educação"],
  [/cinema|ingresso|show|steam|playstation|xbox|nintendo|viagem|hotel|airbnb|booking/, "Lazer"],
  [/salario|folha|pagamento de salario|proventos|vencimentos/, "Salário"],
  [/rendimento|juros|dividendo|remuneracao/, "Rendimentos"],
];

/**
 * Sugere categoria e marca duplicados. Ordem: mesma descrição já lançada antes → palavra-chave →
 * "Outros"/"Renda extra". Duplicado = mesmo id do banco (FITID) ou mesma data + valor + descrição na conta.
 */
export async function previewImport(accountId: string, items: ImportItem[]) {
  const { supabase, family } = await getFamilyContext();
  const categories = await getCategories();
  const dates = items.map((i) => i.date).sort();
  const [{ data: history }, { data: existing }] = await Promise.all([
    supabase.from("transactions").select("description, category_id, kind").eq("family_id", family.id)
      .not("description", "is", null).not("category_id", "is", null).order("occurred_on", { ascending: false }).limit(2000),
    supabase.from("transactions").select("occurred_on, amount, description, external_id, kind").eq("family_id", family.id).eq("account_id", accountId)
      .gte("occurred_on", dates[0] ?? "1900-01-01").lte("occurred_on", dates.at(-1) ?? "2999-12-31"),
  ]);

  const learned = new Map<string, string>();
  for (const h of history ?? []) {
    const key = `${h.kind}|${normalize(h.description!)}`;
    if (!learned.has(key)) learned.set(key, h.category_id!);
  }
  const byName = (name: string, kind: string) => categories.find((c) => c.kind === kind && c.name === name)?.id ?? null;
  const signatures = new Set((existing ?? []).map((e) => `${e.occurred_on}|${Number(e.amount).toFixed(2)}|${e.kind}|${normalize(e.description ?? "")}`));
  const externalIds = new Set((existing ?? []).map((e) => e.external_id).filter(Boolean));

  return items.map((it) => {
    const kind = it.amount < 0 ? "expense" : "income";
    const desc = normalize(it.description);
    const rule = RULES.find(([re]) => re.test(` ${desc} `));
    const categoryId = learned.get(`${kind}|${desc}`)
      ?? (rule ? byName(rule[1], kind) : null)
      ?? byName(kind === "expense" ? "Outros" : "Renda extra", kind)
      ?? categories.find((c) => c.kind === kind)?.id ?? null;
    const duplicate = (it.externalId && externalIds.has(it.externalId))
      || signatures.has(`${it.date}|${Math.abs(it.amount).toFixed(2)}|${kind}|${desc}`);
    return { categoryId, duplicate: !!duplicate };
  });
}

export type ImportRow = ImportItem & { categoryId: string | null };

/** Grava um lote (a tela chama em lotes para mostrar o progresso real). */
export async function importBatch(accountId: string, rows: ImportRow[]) {
  const { supabase, family, user } = await getFamilyContext();
  const { data: account } = await supabase.from("accounts").select("id, kind").eq("id", accountId).eq("family_id", family.id).single();
  if (!account) return { ok: false as const, error: "Conta não encontrada." };
  const payload = rows.map((r) => ({
    family_id: family.id, account_id: accountId, member_id: user.id,
    kind: r.amount < 0 ? "expense" : "income", amount: Math.abs(r.amount), occurred_on: r.date,
    description: r.description.slice(0, 200), category_id: r.categoryId,
    payment_method: account.kind === "credit_card" ? "credit" : null, external_id: r.externalId ?? null,
  }));
  // ignoreDuplicates: o mesmo FITID importado duas vezes não duplica
  const { data, error } = await supabase.from("transactions")
    .upsert(payload, { onConflict: "family_id,account_id,external_id", ignoreDuplicates: true }).select("id");
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true as const, inserted: data?.length ?? 0 };
}

