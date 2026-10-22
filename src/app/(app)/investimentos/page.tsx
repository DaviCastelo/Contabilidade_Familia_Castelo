import { getFamilyContext } from "@/lib/family";
import { brl, dateBR, ASSET_TYPES } from "@/lib/format";
import { AllocationPie } from "@/components/Charts";
import { addInvestment, addMovement, deleteInvestment, updateInvestmentValue } from "../actions";

export default async function InvestimentosPage() {
  const { supabase, family } = await getFamilyContext();
  const [{ data: investments }, { data: movements }] = await Promise.all([
    supabase.from("investments").select("id, name, asset_type, institution, current_value, updated_value_at").eq("family_id", family.id).order("name"),
    supabase.from("investment_movements").select("investment_id, kind, amount, occurred_on").eq("family_id", family.id).order("occurred_on", { ascending: false }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const year = today.slice(0, 4);
  const total = (investments ?? []).reduce((s, i) => s + Number(i.current_value), 0);
  const net = (id: string) => (movements ?? []).filter((m) => m.investment_id === id)
    .reduce((s, m) => s + (m.kind === "aporte" ? Number(m.amount) : m.kind === "resgate" ? -Number(m.amount) : 0), 0);
  const totalNet = (investments ?? []).reduce((s, i) => s + net(i.id), 0);
  const proventosAno = (movements ?? []).filter((m) => m.kind === "provento" && m.occurred_on.startsWith(year)).reduce((s, m) => s + Number(m.amount), 0);

  const alloc = new Map<string, number>();
  for (const i of investments ?? []) alloc.set(ASSET_TYPES[i.asset_type], (alloc.get(ASSET_TYPES[i.asset_type]) ?? 0) + Number(i.current_value));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Investimentos</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card"><p className="text-xs text-slate-500">Valor atual</p><p className="mt-1 text-2xl font-semibold">{brl(total)}</p></div>
        <div className="card">
          <p className="text-xs text-slate-500">Rendimento (valor atual − aportes líquidos)</p>
          <p className={`mt-1 text-2xl font-semibold ${total - totalNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>{brl(total - totalNet)}</p>
          {totalNet > 0 && <p className="text-xs text-slate-500">{(((total - totalNet) / totalNet) * 100).toFixed(2)}%</p>}
        </div>
        <div className="card"><p className="text-xs text-slate-500">Proventos em {year}</p><p className="mt-1 text-2xl font-semibold text-emerald-600">{brl(proventosAno)}</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form action={addInvestment} className="card grid gap-3 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Novo investimento</h2>
          <input name="name" placeholder="Nome (ex: CDB Nubank 110%)" required className="input sm:col-span-2" />
          <select name="asset_type" className="input">
            {Object.entries(ASSET_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input name="institution" placeholder="Instituição" className="input" />
          <input name="initial" type="number" step="0.01" min="0" placeholder="Valor aplicado (R$)" className="input" />
          <button className="btn">Adicionar</button>
        </form>
        <div className="card">
          <h2 className="mb-2 font-semibold">Distribuição da carteira</h2>
          {alloc.size ? <AllocationPie data={[...alloc].map(([name, value]) => ({ name, value }))} /> : <p className="py-8 text-center text-sm text-slate-400">Nenhum investimento ainda.</p>}
        </div>
      </div>

      <div className="space-y-3">
        {(investments ?? []).map((i) => {
          const n = net(i.id);
          const gain = Number(i.current_value) - n;
          const recent = (movements ?? []).filter((m) => m.investment_id === i.id).slice(0, 5);
          return (
            <div key={i.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{i.name}</p>
                  <p className="text-xs text-slate-500">{ASSET_TYPES[i.asset_type]}{i.institution ? ` · ${i.institution}` : ""} · atualizado em {dateBR(i.updated_value_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold">{brl(Number(i.current_value))}</p>
                  <p className={`text-xs ${gain >= 0 ? "text-emerald-600" : "text-red-600"}`}>{gain >= 0 ? "+" : ""}{brl(gain)} sobre {brl(n)} aplicados</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <form action={addMovement} className="flex flex-wrap gap-2">
                  <input type="hidden" name="investment_id" value={i.id} />
                  <select name="kind" className="input w-auto">
                    <option value="aporte">Aporte</option>
                    <option value="resgate">Resgate</option>
                    <option value="provento">Provento</option>
                  </select>
                  <input name="amount" type="number" step="0.01" min="0.01" required placeholder="R$" className="input w-28" />
                  <input name="occurred_on" type="date" defaultValue={today} className="input w-auto" />
                  <button className="btn-ghost border border-slate-200">Lançar</button>
                </form>
                <form action={updateInvestmentValue} className="flex gap-2">
                  <input type="hidden" name="id" value={i.id} />
                  <input name="current_value" type="number" step="0.01" min="0" required placeholder="Valor atual" className="input w-32" />
                  <button className="btn-ghost border border-slate-200">Atualizar valor</button>
                </form>
                <form action={deleteInvestment} className="ml-auto">
                  <input type="hidden" name="id" value={i.id} />
                  <button className="btn-ghost text-xs text-slate-400 hover:text-red-600">Excluir</button>
                </form>
              </div>
              {recent.length > 0 && (
                <ul className="text-xs text-slate-500">
                  {recent.map((m, k) => <li key={k}>{dateBR(m.occurred_on)} · {m.kind} · {brl(Number(m.amount))}</li>)}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
