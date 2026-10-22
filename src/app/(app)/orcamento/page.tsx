import { getFamilyContext, type Category } from "@/lib/family";
import { brl, monthRange, currentMonth } from "@/lib/format";
import MonthPicker from "@/components/MonthPicker";
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Orçamento</h1>
        <MonthPicker month={month} />
      </div>
      <p className="text-sm text-slate-500">
        Defina um limite por categoria (subcategorias somam no pai). Total: <b>{brl(totalSpent)}</b> de <b>{brl(totalBudget)}</b>.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {roots.map((c) => {
          const limit = budgetOf.get(c.id) ?? 0;
          const used = spent.get(c.id) ?? 0;
          const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
          const over = limit > 0 && used > limit;
          return (
            <div key={c.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.name}
                </span>
                <span className={`text-sm ${over ? "font-semibold text-red-600" : "text-slate-600"}`}>
                  {brl(used)} {limit ? `/ ${brl(limit)}` : ""}
                </span>
              </div>
              {limit > 0 && (
                <div className="h-2 rounded-full bg-slate-100">
                  <div className={`h-2 rounded-full ${over ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                </div>
              )}
              <form action={setBudget} className="flex gap-2">
                <input type="hidden" name="category_id" value={c.id} />
                <input type="hidden" name="month" value={month} />
                <input name="amount" type="number" step="0.01" min="0" defaultValue={limit || ""} placeholder="Limite (R$)" className="input" />
                <button className="btn-ghost border border-slate-200">Salvar</button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
