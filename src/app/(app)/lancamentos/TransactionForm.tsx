"use client";

import { useRef, useState } from "react";
import { addTransaction } from "../actions";
import { PAYMENT_METHODS } from "@/lib/format";

type Opt = { id: string; label: string; kind?: string };

export default function TransactionForm({ categories, accounts, members, myId }: {
  categories: Opt[]; accounts: Opt[]; members: Opt[]; myId: string;
}) {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const ref = useRef<HTMLFormElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      ref={ref}
      action={async (fd) => { await addTransaction(fd); ref.current?.reset(); }}
      className="card grid gap-3 md:grid-cols-4"
    >
      <input type="hidden" name="kind" value={kind} />
      <div className="flex gap-2 md:col-span-4">
        {(["expense", "income"] as const).map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium ${kind === k ? (k === "expense" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700") : "bg-slate-100 text-slate-500"}`}
          >
            {k === "expense" ? "− Gasto" : "+ Ganho"}
          </button>
        ))}
      </div>
      <div>
        <label className="label">Valor (R$)</label>
        <input name="amount" type="number" step="0.01" min="0.01" required className="input" />
      </div>
      <div>
        <label className="label">Data</label>
        <input name="occurred_on" type="date" defaultValue={today} required className="input" />
      </div>
      <div className="md:col-span-2">
        <label className="label">Descrição</label>
        <input name="description" className="input" placeholder="Ex: compras do mês" />
      </div>
      <div>
        <label className="label">Categoria</label>
        <select name="category_id" required className="input" key={kind}>
          {categories.filter((c) => c.kind === kind).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Conta</label>
        <select name="account_id" className="input">
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Quem</label>
        <select name="member_id" defaultValue={myId} className="input">
          {members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Pagamento</label>
        <select name="payment_method" className="input">
          {Object.entries(PAYMENT_METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="md:col-span-4">
        <button className="btn">Salvar lançamento</button>
      </div>
    </form>
  );
}
