import Link from "next/link";
import { getFamilyContext, type Category } from "@/lib/family";
import { brl, monthRange, currentMonth, monthLabel } from "@/lib/format";
import MonthPicker from "@/components/MonthPicker";
import { CategoryPie, MonthlyBars } from "@/components/Charts";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const month = (await searchParams).mes ?? currentMonth();
  const { start, end } = monthRange(month);
  const { supabase, family } = await getFamilyContext();

  // últimos 6 meses para o gráfico de barras
  const [y, m] = month.split("-").map(Number);
  const sixAgo = new Date(y, m - 6, 1).toISOString().slice(0, 7);

  const [{ data: cats }, { data: txs }, { data: history }, { data: budgets }, { data: investments }, { data: accounts }, { data: allTx }] = await Promise.all([
    supabase.from("categories").select("id, name, kind, color, parent_id").eq("family_id", family.id),
    supabase.from("transactions").select("kind, amount, category_id, description, occurred_on").eq("family_id", family.id).gte("occurred_on", start).lt("occurred_on", end),
    supabase.from("transactions").select("kind, amount, occurred_on").eq("family_id", family.id).gte("occurred_on", `${sixAgo}-01`).lt("occurred_on", end),
    supabase.from("budgets").select("category_id, amount").eq("family_id", family.id).eq("month", start),
    supabase.from("investments").select("current_value").eq("family_id", family.id),
    supabase.from("accounts").select("initial_balance").eq("family_id", family.id),
    supabase.from("transactions").select("kind, amount").eq("family_id", family.id),
  ]);

  const categories = (cats ?? []) as Category[];
  const catById = new Map(categories.map((c) => [c.id, c]));
  // agrupa subcategorias no pai
  const rootOf = (id: string | null) => {
    const c = id ? catById.get(id) : undefined;
    return c?.parent_id ? catById.get(c.parent_id) : c;
  };

  const sum = (rows: { amount: number | string }[]) => rows.reduce((s, r) => s + Number(r.amount), 0);
  const income = sum((txs ?? []).filter((t) => t.kind === "income"));
  const expenses = (txs ?? []).filter((t) => t.kind === "expense");
  const expense = sum(expenses);

  const byCat = new Map<string, { name: string; color: string; value: number }>();
  for (const t of expenses) {
    const root = rootOf(t.category_id);
    const key = root?.id ?? "none";
    const cur = byCat.get(key) ?? { name: root?.name ?? "Sem categoria", color: root?.color ?? "#94a3b8", value: 0 };
    cur.value += Number(t.amount);
    byCat.set(key, cur);
  }
  const pie = [...byCat.values()].sort((a, b) => b.value - a.value);

  const months = Array.from({ length: 6 }, (_, i) => new Date(y, m - 6 + i, 1).toISOString().slice(0, 7));
  const bars = months.map((mo) => {
    const rows = (history ?? []).filter((t) => t.occurred_on.startsWith(mo));
    return {
      mes: new Date(mo + "-01T00:00:00").toLocaleDateString("pt-BR", { month: "short" }),
      Ganhos: sum(rows.filter((t) => t.kind === "income")),
      Gastos: sum(rows.filter((t) => t.kind === "expense")),
    };
  });

  const invested = sum((investments ?? []).map((i) => ({ amount: i.current_value })));
  const cash = sum((accounts ?? []).map((a) => ({ amount: a.initial_balance })))
    + sum((allTx ?? []).filter((t) => t.kind === "income")) - sum((allTx ?? []).filter((t) => t.kind === "expense"));

  const budgetTotal = sum(budgets ?? []);
  const biggest = [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold capitalize">{monthLabel(month)}</h1>
        <MonthPicker month={month} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ganhos no mês" value={brl(income)} tone="text-emerald-600" />
        <Stat label="Gastos no mês" value={brl(expense)} tone="text-red-600"
          hint={budgetTotal ? `${Math.round((expense / budgetTotal) * 100)}% do orçamento (${brl(budgetTotal)})` : undefined} />
        <Stat label="Saldo do mês" value={brl(income - expense)} tone={income - expense >= 0 ? "text-emerald-600" : "text-red-600"} />
        <Stat label="Patrimônio" value={brl(cash + invested)} hint={`${brl(cash)} em contas · ${brl(invested)} investidos`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-semibold">Gastos por categoria</h2>
          {pie.length ? <CategoryPie data={pie} /> : <Empty />}
        </div>
        <div className="card">
          <h2 className="mb-2 font-semibold">Ganhos × gastos (6 meses)</h2>
          <MonthlyBars data={bars} />
        </div>
      </div>

      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Maiores gastos do mês</h2>
          <Link href={`/lancamentos?mes=${month}`} className="text-sm text-emerald-700 hover:underline">Ver todos →</Link>
        </div>
        {biggest.length ? (
          <ul className="divide-y divide-slate-100 text-sm">
            {biggest.map((t, i) => (
              <li key={i} className="flex justify-between py-2">
                <span>{t.description ?? catById.get(t.category_id ?? "")?.name ?? "Gasto"}</span>
                <span className="font-medium text-red-600">{brl(Number(t.amount))}</span>
              </li>
            ))}
          </ul>
        ) : <Empty />}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "", hint }: { label: string; value: string; tone?: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Empty() {
  return <p className="py-8 text-center text-sm text-slate-400">Sem dados ainda. <Link href="/lancamentos" className="text-emerald-700 hover:underline">Lance algo</Link>.</p>;
}
