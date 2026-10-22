import { getFamilyContext, categoryLabel, sortCategories, type Category } from "@/lib/family";
import { brl, ACCOUNT_KINDS } from "@/lib/format";
import { addAccount, addCategory, deleteAccount, deleteCategory } from "../actions";

export default async function ConfiguracoesPage() {
  const { supabase, family } = await getFamilyContext();
  const [{ data: members }, { data: accounts }, { data: cats }] = await Promise.all([
    supabase.from("family_members").select("user_id, display_name, role").eq("family_id", family.id),
    supabase.from("accounts").select("id, name, kind, initial_balance").eq("family_id", family.id).order("name"),
    supabase.from("categories").select("id, name, kind, color, parent_id").eq("family_id", family.id),
  ]);
  const categories = sortCategories((cats ?? []) as Category[]);
  const roots = categories.filter((c) => !c.parent_id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <div className="card">
        <h2 className="font-semibold">Família</h2>
        <p className="mt-1 text-sm text-slate-500">Para convidar alguém, peça para a pessoa criar uma conta e usar o código:</p>
        <p className="mt-2 inline-block rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-lg tracking-widest">{family.invite_code}</p>
        <ul className="mt-3 text-sm">
          {(members ?? []).map((m) => <li key={m.user_id}>{m.display_name} {m.role === "owner" && <span className="text-xs text-slate-400">(criador)</span>}</li>)}
        </ul>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-3">
          <h2 className="font-semibold">Contas e cartões</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {(accounts ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <span>{a.name} <span className="text-xs text-slate-400">· {ACCOUNT_KINDS[a.kind]} · saldo inicial {brl(Number(a.initial_balance))}</span></span>
                <form action={deleteAccount}><input type="hidden" name="id" value={a.id} /><button className="btn-ghost text-xs text-slate-400 hover:text-red-600">✕</button></form>
              </li>
            ))}
          </ul>
          <form action={addAccount} className="grid gap-2 sm:grid-cols-2">
            <input name="name" placeholder="Nome (ex: Itaú, Nubank)" required className="input" />
            <select name="kind" className="input">{Object.entries(ACCOUNT_KINDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <input name="initial_balance" type="number" step="0.01" placeholder="Saldo inicial" className="input" />
            <button className="btn">Adicionar conta</button>
          </form>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">Categorias</h2>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto text-sm">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-1.5">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                  {categoryLabel(c, categories)}
                  <span className={`text-xs ${c.kind === "income" ? "text-emerald-600" : "text-red-500"}`}>{c.kind === "income" ? "ganho" : "gasto"}</span>
                </span>
                <form action={deleteCategory}><input type="hidden" name="id" value={c.id} /><button className="btn-ghost text-xs text-slate-400 hover:text-red-600">✕</button></form>
              </li>
            ))}
          </ul>
          <form action={addCategory} className="grid gap-2 sm:grid-cols-2">
            <input name="name" placeholder="Nome da categoria" required className="input" />
            <select name="parent_id" className="input">
              <option value="">— Categoria principal —</option>
              {roots.map((r) => <option key={r.id} value={r.id}>Dentro de: {r.name}</option>)}
            </select>
            <select name="kind" className="input"><option value="expense">Gasto</option><option value="income">Ganho</option></select>
            <input name="color" type="color" defaultValue="#64748b" className="input h-10 p-1" />
            <button className="btn sm:col-span-2">Adicionar categoria</button>
          </form>
        </div>
      </div>
    </div>
  );
}
