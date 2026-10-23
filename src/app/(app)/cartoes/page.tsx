import Link from "next/link";
import { CreditCard } from "lucide-react";
import { getFamilyContext, getCategories } from "@/lib/family";
import { brl, dateBR } from "@/lib/format";
import { loadFinance } from "@/lib/ops";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { updateCard } from "../actions";

export default async function CartoesPage() {
  const { supabase, family } = await getFamilyContext();
  const [fin, categories] = await Promise.all([loadFinance(supabase, family.id, 6), getCategories()]);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const payers = fin.accounts.filter((a) => a.kind !== "credit_card");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-3xl font-semibold">Cartões</h1>
        <p className="text-muted">Cada compra cai na fatura certa pelo dia de fechamento. No vencimento, a fatura sai da conta pagadora.</p>
      </div>

      {!fin.cards.length && (
        <div className="card flex flex-col items-center gap-2 py-10 text-center text-muted">
          <CreditCard className="h-6 w-6" aria-hidden />
          Nenhum cartão cadastrado. <Link href="/configuracoes" className="font-medium text-accent hover:underline">Adicione um em Ajustes</Link> com o tipo “Cartão de crédito”.
        </div>
      )}

      {fin.cards.map(({ card, debt, limit, available, current, upcoming, past }) => {
        const configured = card.closing_day && card.due_day;
        const usedPct = limit ? Math.min(100, (debt / limit) * 100) : 0;
        return (
          <section key={card.id} className="card space-y-5" aria-label={`Cartão ${card.name}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="display flex items-center gap-2 text-xl font-semibold"><CreditCard className="h-5 w-5 text-gold" aria-hidden />{card.name}</h2>
                <p className="text-sm text-muted">
                  {configured ? `Fecha dia ${card.closing_day} · vence dia ${card.due_day}` : "Configure fechamento e vencimento abaixo"}
                  {card.pay_from_account_id && ` · paga por ${fin.accounts.find((a) => a.id === card.pay_from_account_id)?.name}`}
                </p>
              </div>
              <div className="text-right">
                <p className="label">Fatura atual</p>
                <p className="display money text-3xl font-semibold">{brl(current?.total ?? 0)}</p>
                {current && <p className="text-xs text-muted">{current.closeDate > fin.today ? `fecha ${dateBR(current.closeDate)}` : "fechada"} · vence {dateBR(current.dueDate)}</p>}
              </div>
            </div>

            {limit != null && (
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>Usado <span className="money text-ink">{brl(debt)}</span> de <span className="money">{brl(limit)}</span></span>
                  <span>Disponível <span className={`money ${available! < 0 ? "text-loss" : "text-gain"}`}>{brl(available!)}</span></span>
                </div>
                <div className="h-2 rounded-full bg-sunken" role="progressbar" aria-label="Limite usado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usedPct)}>
                  <div className={`h-2 rounded-full ${usedPct > 90 ? "bg-loss" : usedPct > 70 ? "bg-warn" : "bg-gold"}`} style={{ width: `${usedPct}%` }} />
                </div>
              </div>
            )}

            {current && (
              <div>
                <h3 className="label mb-1">Compras da fatura atual</h3>
                <ul className="ledger text-sm">
                  {current.items.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: (i.category_id && catById.get(i.category_id)?.color) || "var(--line)" }} aria-hidden />
                        <span className="truncate">{i.description ?? catById.get(i.category_id ?? "")?.name ?? "Compra"}</span>
                        {i.installment && <span className="money rounded bg-sunken px-1.5 text-[11px] text-muted">{i.installment}</span>}
                        {i.virtual && <span className="rounded bg-gold-soft px-1.5 text-[11px] text-gold">recorrente</span>}
                      </span>
                      <span className="money shrink-0 text-muted">{dateBR(i.date)} · <span className={i.kind === "income" ? "text-gain" : "text-ink"}>{i.kind === "income" ? "−" : ""}{brl(i.amount)}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {upcoming.length > 1 && (
              <div>
                <h3 className="label mb-2">Próximas faturas</h3>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {upcoming.slice(1, 7).map((inv) => (
                    <div key={inv.dueDate} className="min-w-28 rounded-lg bg-sunken px-3 py-2">
                      <p className="text-xs text-muted">{new Date(inv.dueDate + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(/^./, (c) => c.toUpperCase())}</p>
                      <p className="money text-sm font-medium">{brl(inv.total)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {past[0] && <p className="text-xs text-muted">Última fatura paga: <span className="money">{brl(past[0].total)}</span> em {dateBR(past[0].dueDate)}</p>}

            <details className="rounded-lg border border-line px-4 py-2" open={!configured}>
              <summary className="cursor-pointer py-1 text-sm font-medium">Configurar cartão</summary>
              <ActionForm action={updateCard} reset={false} className="grid gap-3 py-3 sm:grid-cols-5">
                <input type="hidden" name="id" value={card.id} />
                <Field label="Dia do fechamento"><input name="closing_day" type="number" min={1} max={31} defaultValue={card.closing_day ?? ""} className="input money" /></Field>
                <Field label="Dia do vencimento"><input name="due_day" type="number" min={1} max={31} defaultValue={card.due_day ?? ""} className="input money" /></Field>
                <Field label="Limite (R$)"><input name="credit_limit" type="number" step="0.01" min="0" defaultValue={card.credit_limit ?? ""} className="input money" /></Field>
                <Field label="Paga pela conta">
                  <select name="pay_from_account_id" defaultValue={card.pay_from_account_id ?? ""} className="input">
                    <option value="">Nenhuma</option>
                    {payers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </Field>
                <div className="flex items-end"><SubmitButton className="btn w-full">Salvar</SubmitButton></div>
              </ActionForm>
            </details>
          </section>
        );
      })}
    </div>
  );
}
