import Link from "next/link";
import { ArrowRight, Check, TriangleAlert, TrendingDown, TrendingUp } from "lucide-react";
import { getFamilyContext, getCategories, rootCategory } from "@/lib/family";
import { brl, monthRange, currentMonth, monthLabel } from "@/lib/format";
import MonthPicker from "@/components/MonthPicker";
import Amount from "@/components/Amount";
import { DonutWithLegend, MonthlyBars } from "@/components/Charts";

const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const month = (await searchParams).mes ?? currentMonth();
  const { start, end } = monthRange(month);
  const prevMonth = shiftMonth(month, -1);
  const sixAgo = shiftMonth(month, -5);
  const { supabase, family } = await getFamilyContext();

  // um único select cobre o mês atual, o anterior e o gráfico de 6 meses
  const [categories, { data: history }, { data: budgets }, { data: investments }, { data: accounts }, { data: allTx }, { count: budgetCount }] = await Promise.all([
    getCategories(),
    supabase.from("transactions").select("kind, amount, category_id, description, occurred_on").eq("family_id", family.id).gte("occurred_on", `${sixAgo}-01`).lt("occurred_on", end),
    supabase.from("budgets").select("category_id, amount").eq("family_id", family.id).eq("month", start),
    supabase.from("investments").select("current_value").eq("family_id", family.id),
    supabase.from("accounts").select("initial_balance").eq("family_id", family.id),
    supabase.from("transactions").select("kind, amount").eq("family_id", family.id),
    supabase.from("budgets").select("id", { count: "exact", head: true }).eq("family_id", family.id),
  ]);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const sum = (rows: { amount: number | string }[]) => rows.reduce((s, r) => s + Number(r.amount), 0);
  const inMonth = (mo: string) => (history ?? []).filter((t) => t.occurred_on.startsWith(mo));

  const txs = inMonth(month);
  const income = sum(txs.filter((t) => t.kind === "income"));
  const expenses = txs.filter((t) => t.kind === "expense");
  const expense = sum(expenses);
  const balance = income - expense;

  // gasto por categoria principal, neste mês e no anterior
  const byRoot = (rows: typeof txs) => {
    const map = new Map<string, number>();
    for (const t of rows.filter((r) => r.kind === "expense")) {
      const key = rootCategory(t.category_id, catById)?.id ?? "none";
      map.set(key, (map.get(key) ?? 0) + Number(t.amount));
    }
    return map;
  };
  const nowByRoot = byRoot(txs);
  const prevByRoot = byRoot(inMonth(prevMonth));
  const nameOf = (id: string) => catById.get(id)?.name ?? "Sem categoria";

  const pie = [...nowByRoot].map(([id, value]) => ({ name: nameOf(id), color: catById.get(id)?.color ?? "#78716c", value }));

  const changes = [...new Set([...nowByRoot.keys(), ...prevByRoot.keys()])]
    .map((id) => ({ id, now: nowByRoot.get(id) ?? 0, prev: prevByRoot.get(id) ?? 0 }))
    .filter((c) => c.prev > 0 && Math.abs(c.now - c.prev) >= 1)
    .map((c) => ({ ...c, pct: ((c.now - c.prev) / c.prev) * 100 }))
    .sort((a, b) => Math.abs(b.now - b.prev) - Math.abs(a.now - a.prev))
    .slice(0, 4);

  const alerts = (budgets ?? [])
    .map((b) => ({ id: b.category_id, limit: Number(b.amount), used: nowByRoot.get(b.category_id) ?? 0 }))
    .filter((b) => b.limit > 0 && b.used / b.limit >= 0.8)
    .sort((a, b) => b.used / b.limit - a.used / a.limit);

  const bars = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5)).map((mo) => {
    const rows = inMonth(mo);
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

  const steps = [
    { done: (accounts ?? []).some((a) => Number(a.initial_balance) !== 0), label: "Ajuste suas contas e saldos iniciais", href: "/configuracoes" },
    { done: (allTx ?? []).length > 0, label: "Lance o primeiro gasto ou ganho", href: "/lancamentos" },
    { done: (budgetCount ?? 0) > 0, label: "Defina um orçamento para o mês", href: "/orcamento" },
  ];
  const showGuide = steps.some((s) => !s.done) && (allTx ?? []).length < 10;

  const summary = !txs.length
    ? "Ainda não há lançamentos neste mês."
    : balance >= 0
      ? <>Vocês ganharam <b className="money text-gain">{brl(income)}</b>, gastaram <b className="money text-loss">{brl(expense)}</b> e sobraram <b className="money">{brl(balance)}</b>.</>
      : <>Vocês ganharam <b className="money text-gain">{brl(income)}</b> e gastaram <b className="money text-loss">{brl(expense)}</b>: faltaram <b className="money text-loss">{brl(-balance)}</b>.</>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Resumo de</p>
          <h1 className="display text-3xl font-semibold">{monthLabel(month).replace(/^./, (c) => c.toUpperCase())}</h1>
        </div>
        <MonthPicker month={month} />
      </div>

      <p className="rise display text-xl leading-snug text-ink/90 sm:text-2xl">{summary}</p>

      {showGuide && (
        <section className="rise card border-accent/30" aria-label="Primeiros passos">
          <h2 className="display text-lg font-semibold">Primeiros passos</h2>
          <ol className="mt-3 grid gap-2 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.href}>
                <Link href={s.href} className={`flex min-h-14 items-center gap-3 rounded-lg border px-3 transition-colors duration-150 ${s.done ? "border-gain/30 bg-gain-soft" : "border-line hover:bg-sunken"}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium ${s.done ? "bg-gain text-surface" : "bg-sunken text-ink"}`}>
                    {s.done ? <Check className="h-4 w-4" aria-label="Concluído" /> : i + 1}
                  </span>
                  <span className={`text-sm ${s.done ? "text-muted line-through" : ""}`}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {alerts.length > 0 && (
        <section className="rise card border-warn/40 bg-warn/5" aria-label="Alertas de orçamento">
          <h2 className="flex items-center gap-2 font-medium">
            <TriangleAlert className="h-4 w-4 text-warn" aria-hidden /> Atenção ao orçamento
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {alerts.map((a) => {
              const pct = Math.round((a.used / a.limit) * 100);
              return (
                <li key={a.id}>
                  <b>{nameOf(a.id)}</b>: {pct >= 100
                    ? <span className="text-loss">estourou, <span className="money">{brl(a.used)}</span> de <span className="money">{brl(a.limit)}</span> ({pct}%)</span>
                    : <span className="text-warn">já usou {pct}%, restam <span className="money">{brl(a.limit - a.used)}</span></span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
          <h2 className="display mb-3 text-lg font-semibold">Gastos por categoria</h2>
          {pie.length ? <DonutWithLegend data={pie} /> : <Empty />}
        </section>
        <section className="card">
          <h2 className="display mb-3 text-lg font-semibold">Em relação ao mês anterior</h2>
          {changes.length ? (
            <ul className="ledger text-sm">
              {changes.map((c) => {
                const up = c.now > c.prev;
                const Icon = up ? TrendingUp : TrendingDown;
                return (
                  <li key={c.id} className="flex items-center gap-3 py-2.5">
                    <Icon className={`h-4 w-4 shrink-0 ${up ? "text-loss" : "text-gain"}`} aria-hidden />
                    <span className="flex-1">
                      <b>{nameOf(c.id)}</b>{" "}
                      <span className={up ? "text-loss" : "text-gain"}>{up ? "+" : "−"}{Math.abs(Math.round(c.pct))}%</span>
                    </span>
                    <span className="money text-muted">{brl(c.prev)} → <span className="text-ink">{brl(c.now)}</span></span>
                  </li>
                );
              })}
            </ul>
          ) : <p className="py-10 text-center text-sm text-muted">A comparação aparece quando houver gastos em dois meses seguidos.</p>}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="display mb-2 text-lg font-semibold">Ganhos × gastos, últimos 6 meses</h2>
          <MonthlyBars data={bars} />
        </section>
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
  return <p className="py-10 text-center text-sm text-muted">Sem gastos neste mês. Use o botão + para registrar.</p>;
}
