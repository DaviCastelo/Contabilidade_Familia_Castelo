import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getFamilyContext, type Category } from "@/lib/family";
import { brl, monthRange, currentMonth, monthLabel } from "@/lib/format";
import MonthPicker from "@/components/MonthPicker";
import Amount from "@/components/Amount";
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
    const cur = byCat.get(key) ?? { name: root?.name ?? "Sem categoria", color: root?.color ?? "#78716c", value: 0 };
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
  const balance = income - expense;
  const biggest = [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Resumo de</p>
          <h1 className="display text-3xl font-semibold capitalize">{monthLabel(month)}</h1>
        </div>
        <MonthPicker month={month} />
      </div>

      {/* patrimônio em destaque, como a linha de total de um livro-caixa */}
      <section className="rise card flex flex-wrap items-end justify-between gap-4 border-ink/15">
        <div>
          <p className="label">Patrimônio da família</p>
          <p className="display money text-4xl font-semibold sm:text-5xl">{brl(cash + invested)}</p>
        </div>
        <p className="text-sm text-muted">
          <span className="money text-ink">{brl(cash)}</span> em contas · <span className="money text-ink">{brl(invested)}</span> investidos
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Ganhos no mês" value={brl(income)} tone="text-gain" delay={60} />
        <Stat label="Gastos no mês" value={brl(expense)} tone="text-loss" delay={120}
          hint={budgetTotal ? `${Math.round((expense / budgetTotal) * 100)}% do orçamento de ${brl(budgetTotal)}` : undefined} />
        <Stat label="Sobrou no mês" value={brl(balance)} tone={balance >= 0 ? "text-ink" : "text-loss"} delay={180} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="display mb-2 text-lg font-semibold">Gastos por categoria</h2>
          {pie.length ? <CategoryPie data={pie} /> : <Empty />}
        </section>
        <section className="card">
          <h2 className="display mb-2 text-lg font-semibold">Ganhos × gastos, últimos 6 meses</h2>
          <MonthlyBars data={bars} />
        </section>
      </div>

      <section className="card">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="display text-lg font-semibold">Maiores gastos do mês</h2>
          <Link href={`/lancamentos?mes=${month}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent hover:underline">
            Ver todos <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {biggest.length ? (
          <ul className="ledger text-sm">
            {biggest.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                <span className="truncate">{t.description ?? catById.get(t.category_id ?? "")?.name ?? "Gasto"}</span>
                <Amount kind="expense" value={Number(t.amount)} />
              </li>
            ))}
          </ul>
        ) : <Empty />}
      </section>
    </div>
  );
}

function Stat({ label, value, tone = "", hint, delay = 0 }: { label: string; value: string; tone?: string; hint?: string; delay?: number }) {
  return (
    <div className="rise card" style={{ animationDelay: `${delay}ms` }}>
      <p className="label">{label}</p>
      <p className={`money mt-1 text-2xl font-medium ${tone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Empty() {
  return (
    <p className="py-10 text-center text-sm text-muted">
      Sem dados ainda. <Link href="/lancamentos" className="font-medium text-accent hover:underline">Registre o primeiro lançamento</Link>.
    </p>
  );
}
