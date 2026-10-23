import { getFamilyContext, type Category } from "@/lib/family";
import { brl, monthRange, currentMonth } from "@/lib/format";
import MonthPicker from "@/components/MonthPicker";
import { ActionForm, SubmitButton } from "@/components/forms";
import { setBudget } from "../actions";

export default async function OrcamentoPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const month = (await searchParams).mes ?? currentMonth();
  const { start, end } = monthRange(month);
  const { supabase, family } = await getFamilyContext();

  const [{ data: cats }, { data: budgets }, { data: txs }] = await Promise.all([
    supabase.from("categories").select("id, name, kind, color, parent_id").eq("family_id", family.id).eq("kind", "expense"),
    supabase.from("budgets").select("category_id, amount").eq("family_id", family.id).eq("month", start),
    supabase.from("transactions").select("amount, category_id").eq("family_id", family.id).eq("kind", "expense").gte("occurred_on", start).lt("occurred_on", end),
  ]);

  const categories = (cats ?? []) as Category[];
  const roots = categories.filter((c) => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const rootIdOf = (id: string | null) => {
    const c = categories.find((x) => x.id === id);
    return c?.parent_id ?? c?.id;
  };
  const spent = new Map<string, number>();
  for (const t of txs ?? []) {
    const r = rootIdOf(t.category_id);
    if (r) spent.set(r, (spent.get(r) ?? 0) + Number(t.amount));
  }
  const budgetOf = new Map((budgets ?? []).map((b) => [b.category_id, Number(b.amount)]));
  const totalBudget = [...budgetOf.values()].reduce((s, v) => s + v, 0);
  const totalSpent = [...spent.values()].reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-3xl font-semibold">Orçamento</h1>
        <MonthPicker month={month} />
      </div>
      <p className="text-muted">
        Defina um limite por categoria; subcategorias somam no grupo principal. Usado até agora:{" "}
        <b className="money text-ink">{brl(totalSpent)}</b> de <b className="money text-ink">{brl(totalBudget)}</b>.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {roots.map((c) => {
          const limit = budgetOf.get(c.id) ?? 0;
          const used = spent.get(c.id) ?? 0;
          const ratio = limit ? used / limit : 0;
          const status = !limit ? null : ratio > 1 ? "over" : ratio > 0.8 ? "near" : "ok";
          const bar = { over: "bg-loss", near: "bg-warn", ok: "bg-gain" }[status ?? "ok"];
          const statusText = { over: `Estourou em ${brl(used - limit)}`, near: "Perto do limite", ok: `Restam ${brl(limit - used)}` };
          return (
            <div key={c.id} className="card space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} aria-hidden />{c.name}
                </span>
                <span className="money text-sm text-muted">
                  <span className={status === "over" ? "font-semibold text-loss" : "text-ink"}>{brl(used)}</span>
                  {limit ? ` / ${brl(limit)}` : ""}
                </span>
              </div>
              {limit > 0 && (
                <div>
                  <div className="h-2 rounded-full bg-sunken" role="progressbar" aria-label={`Uso do orçamento de ${c.name}`}
                    aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}>
                    <div className={`h-2 rounded-full ${bar}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                  </div>
                  <p className={`mt-1 text-xs ${status === "over" ? "text-loss" : status === "near" ? "text-warn" : "text-muted"}`}>
                    {statusText[status!]}
                  </p>
                </div>
              )}
              <ActionForm action={setBudget} reset={false} className="flex gap-2">
                <input type="hidden" name="category_id" value={c.id} />
                <input type="hidden" name="month" value={month} />
                <label className="flex-1">
                  <span className="sr-only">Limite mensal para {c.name} (R$)</span>
                  <input name="amount" type="number" inputMode="decimal" step="0.01" min="0" defaultValue={limit || ""} placeholder="Limite (R$)" className="input money" />
                </label>
                <SubmitButton className="btn-ghost" pendingText="…">Salvar</SubmitButton>
              </ActionForm>
            </div>
          );
        })}
      </div>
    </div>
  );
}
