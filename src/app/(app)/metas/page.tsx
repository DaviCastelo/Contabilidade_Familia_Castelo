import { Umbrella } from "lucide-react";
import { getFamilyContext } from "@/lib/family";
import { loadGoals, type GoalView } from "@/lib/goals";
import { brl, dateBR, monthLabel } from "@/lib/format";
import CategoryIcon from "@/components/CategoryIcon";
import { ActionForm, DeleteButton, Field, SubmitButton } from "@/components/forms";
import { contribute, deleteGoal, saveEmergency } from "./actions";
import { EditGoal, NewGoal } from "./GoalForm";

const months = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2.5 rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <div className="h-2.5 rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/** Guardar / retirar (metas manuais) ou aviso de que o valor vem do investimento. */
function Deposit({ goal }: { goal: GoalView }) {
  if (goal.investmentId) {
    return <p className="text-xs text-muted">Acompanha o investimento <b className="text-ink">{goal.investmentName}</b>: guarde fazendo aportes nele.</p>;
  }
  return (
    <ActionForm action={contribute} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="goal_id" value={goal.id} />
      <label className="flex-1">
        <span className="sr-only">Valor para {goal.name}</span>
        <input name="amount" type="number" inputMode="decimal" step="0.01" min="0.01" required placeholder="R$ 0,00" className="input money" />
      </label>
      <SubmitButton name="direction" value="in" className="btn" pendingText="…">Guardar</SubmitButton>
      <SubmitButton name="direction" value="out" className="btn-ghost" pendingText="…">Retirar</SubmitButton>
    </ActionForm>
  );
}

export default async function MetasPage() {
  const { supabase, family } = await getFamilyContext();
  const { emergency, goals, monthlyCost, investments } = await loadGoals(supabase, family.id);
  const invOptions = investments.map((i) => ({ id: i.id, name: i.name }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-3xl font-semibold">Metas</h1>
        <p className="text-muted">A reserva de emergência e os sonhos da família, com quanto falta e quando chegam.</p>
      </div>

      {/* ---------- reserva de emergência ---------- */}
      <section className="card space-y-4 border-[#2ba5a0]/30" aria-label="Reserva de emergência">
        <div className="flex items-start gap-3">
          <CategoryIcon icon="umbrella" color="#2ba5a0" size="lg" />
          <div className="flex-1">
            <h2 className="display text-xl font-semibold">Reserva de emergência</h2>
            <p className="text-sm text-muted">
              {monthlyCost
                ? <>Custo de vida médio: <span className="money text-ink">{brl(monthlyCost)}</span>/mês (últimos 3 meses).</>
                : "Lance os gastos de pelo menos um mês completo para eu calcular o custo de vida."}
            </p>
          </div>
        </div>

        {emergency ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label">Vocês têm guardado</p>
                <p className="display money text-3xl font-semibold">{brl(emergency.saved)}</p>
              </div>
              {emergency.monthsCovered != null && (
                <p className={`text-right text-lg font-medium ${emergency.monthsCovered >= emergency.emergencyMonths ? "text-gain" : emergency.monthsCovered >= 3 ? "text-warn" : "text-loss"}`}>
                  {months(emergency.monthsCovered)} {emergency.monthsCovered === 1 ? "mês" : "meses"} de custo de vida
                  <span className="block text-xs font-normal text-muted">meta: {emergency.emergencyMonths} meses{emergency.target ? ` = ${brl(emergency.target)}` : ""}</span>
                </p>
              )}
            </div>
            {emergency.target != null && <Bar pct={emergency.pct} color="#2ba5a0" />}
            {emergency.remaining ? (
              <p className="text-sm text-muted">
                Faltam <span className="money text-ink">{brl(emergency.remaining)}</span>
                {emergency.eta ? <> · no ritmo atual, completa em <b className="text-ink">{monthLabel(emergency.eta)}</b>.</> : "."}
              </p>
            ) : emergency.target ? <p className="text-sm font-medium text-gain">Reserva completa. A família está protegida!</p> : null}
            <Deposit goal={emergency} />
            <details className="rounded-lg border border-line px-4 py-2">
              <summary className="cursor-pointer py-1 text-sm font-medium">Configurar reserva</summary>
              <ActionForm action={saveEmergency} reset={false} className="grid gap-3 py-3 sm:grid-cols-3">
                <Field label="Quantos meses guardar">
                  <select name="emergency_months" defaultValue={emergency.emergencyMonths} className="input">
                    {[3, 6, 9, 12].map((n) => <option key={n} value={n}>{n} meses</option>)}
                  </select>
                </Field>
                <Field label="Acompanhar investimento">
                  <select name="investment_id" defaultValue={emergency.investmentId ?? ""} className="input">
                    <option value="">Não, registro depósitos</option>
                    {invOptions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </Field>
                <div className="flex items-end"><SubmitButton className="btn w-full">Salvar</SubmitButton></div>
              </ActionForm>
            </details>
          </>
        ) : (
          <ActionForm action={saveEmergency} className="grid gap-3 rounded-lg bg-sunken p-4 sm:grid-cols-3">
            <p className="text-sm sm:col-span-3">
              O recomendado é ter de <b>3 a 6 meses</b> do custo de vida guardados num investimento de resgate rápido (CDB com liquidez diária, Tesouro Selic).
            </p>
            <Field label="Quantos meses guardar">
              <select name="emergency_months" defaultValue={6} className="input">{[3, 6, 9, 12].map((n) => <option key={n} value={n}>{n} meses</option>)}</select>
            </Field>
            <Field label="Onde está guardada">
              <select name="investment_id" className="input">
                <option value="">Vou registrar depósitos</option>
                {invOptions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </Field>
            <div className="flex items-end"><SubmitButton className="btn w-full"><Umbrella className="h-4 w-4" aria-hidden />Criar reserva</SubmitButton></div>
          </ActionForm>
        )}
      </section>

      {/* ---------- metas ---------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        {goals.map((g) => (
          <article key={g.id} className="card space-y-3">
            <div className="flex items-start gap-3">
              <CategoryIcon icon={g.icon} color={g.color} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="display truncate text-lg font-semibold">{g.name}</h2>
                <p className="text-sm text-muted">
                  <span className="money text-ink">{brl(g.saved)}</span> de <span className="money">{g.target ? brl(g.target) : "—"}</span>
                  {g.targetDate && ` · até ${dateBR(g.targetDate)}`}
                </p>
              </div>
              <span className="money text-lg font-medium" style={{ color: g.color }}>{Math.round(g.pct)}%</span>
            </div>
            <Bar pct={g.pct} color={g.color} />
            <p className="text-sm text-muted">
              {!g.remaining ? <span className="font-medium text-gain">Meta alcançada!</span>
                : g.perMonthNeeded ? <>Guarde <b className="money text-ink">{brl(g.perMonthNeeded)}</b>/mês para chegar na data.{g.eta && <> No ritmo atual: {monthLabel(g.eta)}.</>}</>
                : g.eta ? <>Faltam <span className="money text-ink">{brl(g.remaining)}</span> · no ritmo atual, chega em <b className="text-ink">{monthLabel(g.eta)}</b>.</>
                : <>Faltam <span className="money text-ink">{brl(g.remaining)}</span>. Guarde um valor para eu calcular quando chega.</>}
            </p>
            <Deposit goal={g} />
            <div className="flex justify-end gap-1 border-t border-line pt-2">
              <EditGoal goal={g} investments={invOptions} />
              <DeleteButton action={deleteGoal} id={g.id} what={`meta ${g.name}`} />
            </div>
          </article>
        ))}
      </div>

      <NewGoal investments={invOptions} />
    </div>
  );
}
