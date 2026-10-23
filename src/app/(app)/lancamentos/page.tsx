import { getFamilyContext, getCategories, getFormOptions, categoryLabel, rootCategory } from "@/lib/family";
import { brl, monthRange, currentMonth, PAYMENT_METHODS } from "@/lib/format";
import MonthPicker from "@/components/MonthPicker";
import TransactionList, { type Row } from "./TransactionList";

export default async function LancamentosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const month = (await searchParams).mes ?? currentMonth();
  const { start, end } = monthRange(month);
  const { supabase, family } = await getFamilyContext();

  const [categories, options, { data: txs }] = await Promise.all([
    getCategories(),
    getFormOptions(),
    supabase.from("transactions")
      .select("id, kind, amount, occurred_on, description, category_id, account_id, member_id, payment_method")
      .eq("family_id", family.id).gte("occurred_on", start).lt("occurred_on", end)
      .order("occurred_on", { ascending: false }).order("created_at", { ascending: false }),
  ]);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const accById = new Map(options.accounts.map((a) => [a.id, a.label]));
  const memberById = new Map(options.members.map((m) => [m.id, m.label]));

  const rows: Row[] = (txs ?? []).map((t) => {
    const cat = t.category_id ? catById.get(t.category_id) : undefined;
    return {
      ...t,
      amount: Number(t.amount),
      kind: t.kind as "income" | "expense",
      catLabel: cat ? categoryLabel(cat, categories) : "Sem categoria",
      catColor: cat?.color ?? "var(--line)",
      rootId: rootCategory(t.category_id, catById)?.id ?? null,
      account: (t.account_id && accById.get(t.account_id)) || "—",
      member: (t.member_id && memberById.get(t.member_id)) || "—",
      payment: t.payment_method ? PAYMENT_METHODS[t.payment_method] : "—",
    };
  });

  const income = rows.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const expense = rows.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  const roots = categories.filter((c) => !c.parent_id).map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-3xl font-semibold">Lançamentos</h1>
        <MonthPicker month={month} />
      </div>

      <dl className="card grid grid-cols-3 p-0 text-sm">
        {[
          ["Ganhos", brl(income), "text-gain"],
          ["Gastos", brl(expense), "text-loss"],
          ["Saldo", brl(income - expense), income - expense >= 0 ? "text-ink" : "text-loss"],
        ].map(([label, value, tone]) => (
          <div key={label} className="px-4 py-3 sm:px-5">
            <dt className="label">{label}</dt>
            <dd className={`money text-base font-medium ${tone}`}>{value}</dd>
          </div>
        ))}
      </dl>

      <TransactionList rows={rows} options={options} rootCategories={roots} />
    </div>
  );
}
