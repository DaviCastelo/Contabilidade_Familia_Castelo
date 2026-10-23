import { Pause, Play, Repeat } from "lucide-react";
import { getFamilyContext, getCategories, getFormOptions, categoryLabel } from "@/lib/family";
import { brl, dateBR, localISODate, PAYMENT_METHODS } from "@/lib/format";
import { recurringOccurrences, addMonths } from "@/lib/finance";
import Amount from "@/components/Amount";
import { ActionForm, DeleteButton, Field, SubmitButton } from "@/components/forms";
import { addRecurring, deleteRecurring, updateRecurring } from "../actions";

export default async function RecorrentesPage() {
  const { supabase, family } = await getFamilyContext();
  const [categories, options, { data: items }] = await Promise.all([
    getCategories(),
    getFormOptions(),
    supabase.from("recurring_transactions")
      .select("id, kind, amount, description, category_id, account_id, member_id, payment_method, day_of_month, start_date, end_date, active, generated_until")
      .eq("family_id", family.id).order("kind").order("day_of_month"),
  ]);
  const today = localISODate();
  const catById = new Map(categories.map((c) => [c.id, c]));
  const accById = new Map(options.accounts.map((a) => [a.id, a.label]));
  const memberById = new Map(options.members.map((m) => [m.id, m.label]));
  const monthlyIn = (items ?? []).filter((r) => r.active && r.kind === "income").reduce((s, r) => s + Number(r.amount), 0);
  const monthlyOut = (items ?? []).filter((r) => r.active && r.kind === "expense").reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-3xl font-semibold">Recorrentes</h1>
        <p className="text-muted">Salário, aluguel, assinaturas: entram sozinhos todo mês no dia marcado.</p>
      </div>

      <dl className="card grid grid-cols-3 p-0 text-sm">
        {[["Entram por mês", brl(monthlyIn), "text-gain"], ["Saem por mês", brl(monthlyOut), "text-loss"], ["Sobra fixa", brl(monthlyIn - monthlyOut), monthlyIn - monthlyOut >= 0 ? "text-ink" : "text-loss"]].map(([l, v, t]) => (
          <div key={l} className="px-4 py-3 sm:px-5"><dt className="label">{l}</dt><dd className={`money text-base font-medium ${t}`}>{v}</dd></div>
        ))}
      </dl>

      <ActionForm action={addRecurring} className="card grid gap-4 md:grid-cols-4">
        <h2 className="display text-lg font-semibold md:col-span-4">Novo recorrente</h2>
        <Field label="Tipo">
          <select name="kind" className="input"><option value="expense">Gasto</option><option value="income">Ganho</option></select>
        </Field>
        <Field label="Valor (R$)">
          <input name="amount" type="number" inputMode="decimal" step="0.01" min="0.01" required className="input money" placeholder="0,00" />
        </Field>
        <Field label="Todo dia">
          <input name="day_of_month" type="number" inputMode="numeric" min={1} max={31} required defaultValue={Number(today.slice(8, 10))} className="input money" />
        </Field>
        <Field label="Descrição">
          <input name="description" required placeholder="Ex: Aluguel, Netflix, Salário" className="input" />
        </Field>
        <Field label="Categoria">
          <select name="category_id" className="input">
            {options.categories.map((c) => <option key={c.id} value={c.id}>{c.kind === "income" ? "↑ " : "↓ "}{c.label}</option>)}
          </select>
        </Field>
        <Field label="Conta ou cartão">
          <select name="account_id" className="input">{options.accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
        </Field>
        <Field label="Quem">
          <select name="member_id" defaultValue={options.myId} className="input">{options.members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
        </Field>
        <Field label="Pagamento">
          <select name="payment_method" className="input">{Object.entries(PAYMENT_METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
        <Field label="Começa em"><input name="start_date" type="date" defaultValue={today} className="input" /></Field>
        <Field label="Termina em (opcional)"><input name="end_date" type="date" className="input" /></Field>
        <div className="flex items-end md:col-span-2"><SubmitButton className="btn w-full md:w-auto">Criar recorrente</SubmitButton></div>
      </ActionForm>

      <section className="card p-0" aria-label="Lista de recorrentes">
        {!items?.length && (
          <p className="flex flex-col items-center gap-2 px-5 py-10 text-center text-muted">
            <Repeat className="h-6 w-6" aria-hidden />Nenhum recorrente ainda. Cadastre o salário e as contas fixas acima.
          </p>
        )}
        <ul className="ledger">
          {(items ?? []).map((r) => {
            const cat = r.category_id ? catById.get(r.category_id) : undefined;
            const next = recurringOccurrences({ ...r, generated_until: r.generated_until ?? null }, today, addMonths(today, 13))[0];
            return (
              <li key={r.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${r.active ? "" : "opacity-60"}`}>
                <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: cat?.color ?? "var(--line)" }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.description ?? (cat ? categoryLabel(cat, categories) : "Recorrente")}</p>
                  <p className="truncate text-xs text-muted">
                    Todo dia {r.day_of_month} · {cat ? categoryLabel(cat, categories) : "Sem categoria"} · {(r.account_id && accById.get(r.account_id)) || "Sem conta"}
                    {r.member_id && memberById.get(r.member_id) ? ` · ${memberById.get(r.member_id)}` : ""}
                    {r.active ? (next ? ` · próximo ${dateBR(next)}` : " · encerrado") : " · pausado"}
                  </p>
                </div>
                <Amount kind={r.kind as "income" | "expense"} value={Number(r.amount)} />
                <ActionForm action={updateRecurring} reset={false}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="active" value={r.active ? "false" : "true"} />
                  <SubmitButton className="icon-btn" pendingText="…">
                    {r.active ? <Pause className="h-4 w-4" aria-label="Pausar" /> : <Play className="h-4 w-4" aria-label="Reativar" />}
                  </SubmitButton>
                </ActionForm>
                <DeleteButton action={deleteRecurring} id={r.id} what={`recorrente ${r.description ?? ""}`} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
