import { getFamilyContext, categoryLabel, sortCategories, type Category } from "@/lib/family";
import { brl, dateBR, monthRange, currentMonth, PAYMENT_METHODS } from "@/lib/format";
import MonthPicker from "@/components/MonthPicker";
import Amount from "@/components/Amount";
import { DeleteButton } from "@/components/forms";
import TransactionForm from "./TransactionForm";
import { deleteTransaction } from "../actions";

export default async function LancamentosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const month = (await searchParams).mes ?? currentMonth();
  const { start, end } = monthRange(month);
  const { supabase, family, user } = await getFamilyContext();

  const [{ data: cats }, { data: accounts }, { data: members }, { data: txs }] = await Promise.all([
    supabase.from("categories").select("id, name, kind, color, parent_id").eq("family_id", family.id),
    supabase.from("accounts").select("id, name").eq("family_id", family.id).order("name"),
    supabase.from("family_members").select("user_id, display_name").eq("family_id", family.id),
    supabase.from("transactions")
      .select("id, kind, amount, occurred_on, description, category_id, account_id, member_id, payment_method")
      .eq("family_id", family.id).gte("occurred_on", start).lt("occurred_on", end)
      .order("occurred_on", { ascending: false }).order("created_at", { ascending: false }),
  ]);

  const categories = sortCategories((cats ?? []) as Category[]);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const accById = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const memberById = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));
  const income = (txs ?? []).filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = (txs ?? []).filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const rows = (txs ?? []).map((t) => {
    const cat = t.category_id ? catById.get(t.category_id) : undefined;
    return {
      ...t,
      amount: Number(t.amount),
      kind: t.kind as "income" | "expense",
      cat,
      catLabel: cat ? categoryLabel(cat, categories) : "Sem categoria",
      account: (t.account_id && accById.get(t.account_id)) || "—",
      member: (t.member_id && memberById.get(t.member_id)) || "—",
      payment: t.payment_method ? PAYMENT_METHODS[t.payment_method] : "—",
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-3xl font-semibold">Lançamentos</h1>
        <MonthPicker month={month} />
      </div>

      <TransactionForm
        categories={categories.map((c) => ({ id: c.id, label: categoryLabel(c, categories), kind: c.kind }))}
        accounts={(accounts ?? []).map((a) => ({ id: a.id, label: a.name }))}
        members={(members ?? []).map((m) => ({ id: m.user_id, label: m.display_name }))}
        myId={user.id}
      />

      <section className="card p-0" aria-label="Lançamentos do mês">
        <dl className="grid grid-cols-3 border-b border-line text-sm">
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

        {!rows.length && <p className="px-5 py-10 text-center text-muted">Nenhum lançamento neste mês ainda.</p>}

        {/* celular: cartões */}
        <ul className="ledger md:hidden">
          {rows.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: t.cat?.color ?? "var(--line)" }} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.description ?? t.catLabel}</p>
                <p className="truncate text-xs text-muted">{dateBR(t.occurred_on)} · {t.catLabel} · {t.member}</p>
              </div>
              <Amount kind={t.kind} value={t.amount} />
              <DeleteButton action={deleteTransaction} id={t.id} what={`lançamento ${t.description ?? t.catLabel}`} />
            </li>
          ))}
        </ul>

        {/* desktop: tabela */}
        {rows.length > 0 && (
          <table className="hidden w-full text-sm md:table">
            <thead className="text-left">
              <tr>{["Data", "Descrição", "Categoria", "Conta", "Quem", "Pagamento", "Valor", ""].map((h, i) => (
                <th key={i} scope="col" className={`label px-4 py-2 ${h === "Valor" ? "text-right" : ""}`}>{h || <span className="sr-only">Ações</span>}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t border-line transition-colors duration-150 hover:bg-sunken/60">
                  <td className="money px-4 py-2 whitespace-nowrap text-muted">{dateBR(t.occurred_on)}</td>
                  <td className="px-4 py-2">{t.description ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.cat?.color ?? "var(--line)" }} aria-hidden />
                      {t.catLabel}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted">{t.account}</td>
                  <td className="px-4 py-2 text-muted">{t.member}</td>
                  <td className="px-4 py-2 text-muted">{t.payment}</td>
                  <td className="px-4 py-2 text-right"><Amount kind={t.kind} value={t.amount} /></td>
                  <td className="px-2 py-1 text-right">
                    <DeleteButton action={deleteTransaction} id={t.id} what={`lançamento ${t.description ?? t.catLabel}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
