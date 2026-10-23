import { getFamilyContext } from "@/lib/family";
import { brl, dateBR, ASSET_TYPES, localISODate } from "@/lib/format";
import { ALLOCATION_COLORS, DonutWithLegend, PatrimonyLine } from "@/components/Charts";
import { ActionForm, DeleteButton, Field, SubmitButton } from "@/components/forms";
import { addInvestment, addMovement, deleteInvestment, updateInvestmentValue } from "../actions";

const MOVEMENT_LABEL: Record<string, string> = { aporte: "Aporte", resgate: "Resgate", provento: "Provento" };

export default async function InvestimentosPage() {
  const { supabase, family } = await getFamilyContext();
  const [{ data: investments }, { data: movements }, { data: snapshots }] = await Promise.all([
    supabase.from("investments").select("id, name, asset_type, institution, current_value, updated_value_at").eq("family_id", family.id).order("name"),
    supabase.from("investment_movements").select("investment_id, kind, amount, occurred_on").eq("family_id", family.id).order("occurred_on", { ascending: false }),
    supabase.from("investment_values").select("investment_id, value, recorded_on").eq("family_id", family.id).order("recorded_on").order("created_at"),
  ]);

  const today = localISODate();
  const year = today.slice(0, 4);
  const total = (investments ?? []).reduce((s, i) => s + Number(i.current_value), 0);
  const net = (id: string) => (movements ?? []).filter((m) => m.investment_id === id)
    .reduce((s, m) => s + (m.kind === "aporte" ? Number(m.amount) : m.kind === "resgate" ? -Number(m.amount) : 0), 0);
  const totalNet = (investments ?? []).reduce((s, i) => s + net(i.id), 0);
  const gainTotal = total - totalNet;
  const proventosAno = (movements ?? []).filter((m) => m.kind === "provento" && m.occurred_on.startsWith(year)).reduce((s, m) => s + Number(m.amount), 0);

  // evolução: em cada mês, soma o último valor conhecido de cada investimento que ainda existe
  const alive = new Set((investments ?? []).map((i) => i.id));
  const latest = new Map<string, number>();
  const byMonth = new Map<string, number>();
  for (const s of snapshots ?? []) {
    if (!alive.has(s.investment_id)) continue;
    latest.set(s.investment_id, Number(s.value));
    byMonth.set(s.recorded_on.slice(0, 7), [...latest.values()].reduce((a, b) => a + b, 0));
  }
  const evolution = [...byMonth].map(([mo, valor]) => ({
    mes: new Date(mo + "-01T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
    valor,
  }));

  const alloc = new Map<string, number>();
  for (const i of investments ?? []) alloc.set(ASSET_TYPES[i.asset_type], (alloc.get(ASSET_TYPES[i.asset_type]) ?? 0) + Number(i.current_value));

  return (
    <div className="space-y-5">
      <h1 className="display text-3xl font-semibold">Investimentos</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="label">Valor atual</p>
          <p className="display money mt-1 text-3xl font-semibold">{brl(total)}</p>
        </div>
        <div className="card">
          <p className="label">Rendimento acumulado</p>
          <p className={`money mt-1 text-2xl font-medium ${gainTotal >= 0 ? "text-gain" : "text-loss"}`}>
            {gainTotal >= 0 ? "+" : "−"} {brl(Math.abs(gainTotal))}
          </p>
          {totalNet > 0 && <p className="money text-xs text-muted">{((gainTotal / totalNet) * 100).toFixed(2)}% sobre {brl(totalNet)} aplicados</p>}
        </div>
        <div className="card">
          <p className="label">Proventos em {year}</p>
          <p className="money mt-1 text-2xl font-medium text-gain">{brl(proventosAno)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ActionForm action={addInvestment} className="card grid gap-4 sm:grid-cols-2">
          <h2 className="display text-lg font-semibold sm:col-span-2">Novo investimento</h2>
          <Field label="Nome" className="sm:col-span-2">
            <input name="name" placeholder="Ex: CDB Nubank 110% CDI" required className="input" />
          </Field>
          <Field label="Tipo">
            <select name="asset_type" className="input">
              {Object.entries(ASSET_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Instituição">
            <input name="institution" placeholder="Ex: Nubank" className="input" />
          </Field>
          <Field label="Valor aplicado (R$)">
            <input name="initial" type="number" inputMode="decimal" step="0.01" min="0" placeholder="0,00" className="input money" />
          </Field>
          <div className="flex items-end">
            <SubmitButton className="btn w-full">Adicionar</SubmitButton>
          </div>
        </ActionForm>
        <section className="card">
          <h2 className="display mb-2 text-lg font-semibold">Distribuição da carteira</h2>
          {alloc.size
            ? <DonutWithLegend data={[...alloc].map(([name, value], i) => ({ name, value, color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }))} />
            : <p className="py-10 text-center text-sm text-muted">Nenhum investimento cadastrado ainda.</p>}
        </section>
      </div>

      <section className="card">
        <h2 className="display mb-2 text-lg font-semibold">Evolução da carteira</h2>
        {evolution.length > 1
          ? <PatrimonyLine data={evolution} />
          : <p className="py-10 text-center text-sm text-muted">O gráfico aparece a partir do segundo mês com valores registrados. Atualize o valor dos investimentos todo mês.</p>}
      </section>

      <div className="space-y-4">
        {(investments ?? []).map((i) => {
          const n = net(i.id);
          const gain = Number(i.current_value) - n;
          const recent = (movements ?? []).filter((m) => m.investment_id === i.id).slice(0, 5);
          return (
            <article key={i.id} className="card space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="display text-lg font-semibold">{i.name}</h3>
                  <p className="text-sm text-muted">{ASSET_TYPES[i.asset_type]}{i.institution ? ` · ${i.institution}` : ""} · atualizado em {dateBR(i.updated_value_at)}</p>
                </div>
                <div className="flex items-start gap-1">
                  <div className="text-right">
                    <p className="money text-xl font-medium">{brl(Number(i.current_value))}</p>
                    <p className={`money text-xs ${gain >= 0 ? "text-gain" : "text-loss"}`}>{gain >= 0 ? "+" : "−"} {brl(Math.abs(gain))} sobre {brl(n)}</p>
                  </div>
                  <DeleteButton action={deleteInvestment} id={i.id} what={`investimento ${i.name}`} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <ActionForm action={addMovement} className="flex flex-wrap items-end gap-2 rounded-lg bg-sunken p-3">
                  <input type="hidden" name="investment_id" value={i.id} />
                  <Field label="Movimentação">
                    <select name="kind" className="input w-auto">
                      <option value="aporte">Aporte</option>
                      <option value="resgate">Resgate</option>
                      <option value="provento">Provento</option>
                    </select>
                  </Field>
                  <Field label="Valor" className="w-28">
                    <input name="amount" type="number" inputMode="decimal" step="0.01" min="0.01" required placeholder="0,00" className="input money" />
                  </Field>
                  <Field label="Data">
                    <input name="occurred_on" type="date" defaultValue={today} className="input w-auto" />
                  </Field>
                  <SubmitButton className="btn-ghost bg-surface" pendingText="…">Lançar</SubmitButton>
                </ActionForm>
                <ActionForm action={updateInvestmentValue} className="flex flex-wrap items-end gap-2 rounded-lg bg-sunken p-3">
                  <input type="hidden" name="id" value={i.id} />
                  <Field label="Valor atual no banco" className="flex-1">
                    <input name="current_value" type="number" inputMode="decimal" step="0.01" min="0" required placeholder="0,00" className="input money" />
                  </Field>
                  <SubmitButton className="btn-ghost bg-surface" pendingText="…">Atualizar</SubmitButton>
                </ActionForm>
              </div>
              {recent.length > 0 && (
                <ul className="ledger text-sm">
                  {recent.map((m, k) => (
                    <li key={k} className="flex justify-between py-1.5 text-muted">
                      <span><span className="money">{dateBR(m.occurred_on)}</span> · {MOVEMENT_LABEL[m.kind]}</span>
                      <span className={`money ${m.kind === "resgate" ? "text-loss" : "text-gain"}`}>{brl(Number(m.amount))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
