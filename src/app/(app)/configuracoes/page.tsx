import { getFamilyContext, categoryLabel, sortCategories, type Category } from "@/lib/family";
import { brl, ACCOUNT_KINDS } from "@/lib/format";
import { ActionForm, DeleteButton, Field, SubmitButton } from "@/components/forms";
import IconPicker from "@/components/IconPicker";
import { loadFinance } from "@/lib/ops";
import CopyCode from "./CopyCode";
import CategoryEditor from "./CategoryEditor";
import { addAccount, addCategory, deleteAccount, deleteCategory } from "../actions";

export default async function ConfiguracoesPage() {
  const { supabase, family } = await getFamilyContext();
  const [{ data: members }, { data: accounts }, { data: cats }, fin] = await Promise.all([
    supabase.from("family_members").select("user_id, display_name, role").eq("family_id", family.id),
    supabase.from("accounts").select("id, name, kind, initial_balance").eq("family_id", family.id).order("name"),
    supabase.from("categories").select("id, name, kind, color, icon, parent_id").eq("family_id", family.id),
    loadFinance(supabase, family.id, 1),
  ]);
  const cardDebt = new Map(fin.cards.map((c) => [c.card.id, c.debt]));
  const categories = sortCategories((cats ?? []) as Category[]);
  const roots = categories.filter((c) => !c.parent_id);

  return (
    <div className="space-y-5">
      <h1 className="display text-3xl font-semibold">Ajustes</h1>

      <section className="card space-y-3">
        <h2 className="display text-lg font-semibold">Família</h2>
        <p className="text-muted">Para convidar alguém, peça para a pessoa criar uma conta e usar este código:</p>
        <CopyCode code={family.invite_code} />
        <ul className="ledger text-sm">
          {(members ?? []).map((m) => (
            <li key={m.user_id} className="py-2">
              {m.display_name} {m.role === "owner" && <span className="text-xs text-muted">· criou a família</span>}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-4">
          <h2 className="display text-lg font-semibold">Contas e cartões</h2>
          <ul className="ledger text-sm">
            {(accounts ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="min-w-0 flex-1">
                  {a.name}
                  <span className="block text-xs text-muted">{ACCOUNT_KINDS[a.kind]} · saldo inicial <span className="money">{brl(Number(a.initial_balance))}</span></span>
                </span>
                {a.kind === "credit_card"
                  ? <span className="money text-right text-xs text-muted">a pagar<span className="block text-sm text-loss">{brl(cardDebt.get(a.id) ?? 0)}</span></span>
                  : <span className="money text-right text-xs text-muted">saldo hoje<span className={`block text-sm ${(fin.balances.get(a.id) ?? 0) < 0 ? "text-loss" : "text-ink"}`}>{brl(fin.balances.get(a.id) ?? 0)}</span></span>}
                <DeleteButton action={deleteAccount} id={a.id} what={`conta ${a.name}`} />
              </li>
            ))}
          </ul>
          <ActionForm action={addAccount} className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome">
              <input name="name" placeholder="Ex: Itaú, Nubank" required className="input" />
            </Field>
            <Field label="Tipo">
              <select name="kind" className="input">{Object.entries(ACCOUNT_KINDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </Field>
            <Field label="Saldo inicial (R$)">
              <input name="initial_balance" type="number" inputMode="decimal" step="0.01" placeholder="0,00" className="input money" />
            </Field>
            <div className="flex items-end"><SubmitButton className="btn w-full">Adicionar conta</SubmitButton></div>
          </ActionForm>
        </section>

        <section className="card space-y-4">
          <div>
            <h2 className="display text-lg font-semibold">Categorias</h2>
            <p className="text-xs text-muted">Toque no ícone para trocar ícone, cor ou nome.</p>
          </div>
          <ul className="ledger max-h-96 overflow-y-auto text-sm">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-1">
                <span className="inline-flex items-center gap-2.5">
                  <CategoryEditor category={c} />
                  {categoryLabel(c, categories)}
                  <span className={`text-xs ${c.kind === "income" ? "text-gain" : "text-loss"}`}>{c.kind === "income" ? "ganho" : "gasto"}</span>
                </span>
                <DeleteButton action={deleteCategory} id={c.id} what={`categoria ${c.name}`} />
              </li>
            ))}
          </ul>
          <ActionForm action={addCategory} className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome">
              <input name="name" placeholder="Ex: Pets" required className="input" />
            </Field>
            <Field label="Dentro de">
              <select name="parent_id" className="input">
                <option value="">Nenhuma (categoria principal)</option>
                {roots.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Tipo">
              <select name="kind" className="input"><option value="expense">Gasto</option><option value="income">Ganho</option></select>
            </Field>
            <Field label="Cor">
              <input name="color" type="color" defaultValue="#8a94a6" className="input h-11 cursor-pointer p-1" />
            </Field>
            <details className="sm:col-span-2">
              <summary className="cursor-pointer py-1 text-sm text-muted">Escolher ícone</summary>
              <div className="pt-2"><IconPicker /></div>
            </details>
            <SubmitButton className="btn sm:col-span-2">Adicionar categoria</SubmitButton>
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
