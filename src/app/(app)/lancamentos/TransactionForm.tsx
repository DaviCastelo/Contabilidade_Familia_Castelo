"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { addTransaction } from "../actions";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { PAYMENT_METHODS } from "@/lib/format";

type Opt = { id: string; label: string; kind?: string };

export default function TransactionForm({ categories, accounts, members, myId }: {
  categories: Opt[]; accounts: Opt[]; members: Opt[]; myId: string;
}) {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ActionForm action={addTransaction} className="card grid gap-4 md:grid-cols-4">
      <input type="hidden" name="kind" value={kind} />
      <div role="radiogroup" aria-label="Tipo de lançamento" className="flex gap-2 md:col-span-4">
        {(["expense", "income"] as const).map((k) => {
          const active = kind === k;
          const Icon = k === "expense" ? ArrowDownRight : ArrowUpRight;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={active}
              key={k}
              onClick={() => setKind(k)}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors duration-150 ${
                active
                  ? k === "expense" ? "border-loss/40 bg-loss-soft text-loss" : "border-gain/40 bg-gain-soft text-gain"
                  : "border-line text-muted hover:bg-sunken"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {k === "expense" ? "Gasto" : "Ganho"}
            </button>
          );
        })}
      </div>
      <Field label="Valor (R$)">
        <input name="amount" type="number" inputMode="decimal" step="0.01" min="0.01" required className="input money" placeholder="0,00" />
      </Field>
      <Field label="Data">
        <input name="occurred_on" type="date" defaultValue={today} required className="input" />
      </Field>
      <Field label="Descrição" className="md:col-span-2">
        <input name="description" className="input" placeholder="Ex: compras do mês" />
      </Field>
      <Field label="Categoria">
        <select name="category_id" required className="input" key={kind}>
          {categories.filter((c) => c.kind === kind).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Conta">
        <select name="account_id" className="input">
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </Field>
      <Field label="Quem">
        <select name="member_id" defaultValue={myId} className="input">
          {members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </Field>
      <Field label="Pagamento">
        <select name="payment_method" className="input">
          {Object.entries(PAYMENT_METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <div className="md:col-span-4">
        <SubmitButton className="btn w-full md:w-auto">Salvar lançamento</SubmitButton>
      </div>
    </ActionForm>
  );
}
