import { getFamilyContext, categoryLabel, sortCategories, type Category } from "@/lib/family";
import { brl, dateBR, monthRange, currentMonth, PAYMENT_METHODS } from "@/lib/format";
import MonthPicker from "@/components/MonthPicker";
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Lançamentos</h1>
        <MonthPicker month={month} />
      </div>

      <TransactionForm
        categories={categories.map((c) => ({ id: c.id, label: categoryLabel(c, categories), kind: c.kind }))}
        accounts={(accounts ?? []).map((a) => ({ id: a.id, label: a.name }))}
        members={(members ?? []).map((m) => ({ id: m.user_id, label: m.display_name }))}
        myId={user.id}
      />

      <div className="card overflow-x-auto p-0">
        <div className="flex flex-wrap gap-6 border-b border-slate-100 px-5 py-3 text-sm">
          <span>Ganhos: <b className="text-emerald-600">{brl(income)}</b></span>
          <span>Gastos: <b className="text-red-600">{brl(expense)}</b></span>
          <span>Saldo: <b>{brl(income - expense)}</b></span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>{["Data", "Descrição", "Categoria", "Conta", "Quem", "Pagamento", "Valor", ""].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(txs ?? []).map((t) => {
              const cat = t.category_id ? catById.get(t.category_id) : undefined;
              return (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 whitespace-nowrap">{dateBR(t.occurred_on)}</td>
                  <td className="px-4 py-2">{t.description ?? "—"}</td>
                  <td className="px-4 py-2">
                    {cat ? <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />{categoryLabel(cat, categories)}</span> : "—"}
                  </td>
                  <td className="px-4 py-2">{(t.account_id && accById.get(t.account_id)) ?? "—"}</td>
                  <td className="px-4 py-2">{(t.member_id && memberById.get(t.member_id)) ?? "—"}</td>
                  <td className="px-4 py-2">{t.payment_method ? PAYMENT_METHODS[t.payment_method] : "—"}</td>
                  <td className={`px-4 py-2 text-right font-medium whitespace-nowrap ${t.kind === "income" ? "text-emerald-600" : "text-red-600"}`}>
                    {t.kind === "income" ? "+" : "−"} {brl(Number(t.amount))}
                  </td>
                  <td className="px-2 py-2">
                    <form action={deleteTransaction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="btn-ghost text-xs text-slate-400 hover:text-red-600" title="Excluir">✕</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {!txs?.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Nenhum lançamento neste mês.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
