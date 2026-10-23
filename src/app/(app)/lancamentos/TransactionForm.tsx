"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Paperclip } from "lucide-react";
import { openReceipt, uploadReceipt } from "@/lib/receipts";
import type { ActionResult } from "@/components/forms";
import { addTransaction, updateTransaction } from "../actions";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { PAYMENT_METHODS, localISODate } from "@/lib/format";
import type { FormOptions } from "@/lib/family";

export type EditableTransaction = {
  id: string; kind: "income" | "expense"; amount: number; occurred_on: string; description: string | null;
  category_id: string | null; account_id: string | null; member_id: string | null; payment_method: string | null;
  receipt_path?: string | null;
};

export default function TransactionForm({ options, initial, onDone, card = true }: {
  options: FormOptions; initial?: EditableTransaction; onDone?: () => void; card?: boolean;
}) {
  const { categories, accounts, members, myId } = options;
  const [kind, setKind] = useState<"expense" | "income">(initial?.kind ?? "expense");
  const [frequency, setFrequency] = useState<"once" | "installments" | "monthly">("once");
  const installments = kind === "expense" && frequency === "installments";
  const today = localISODate();
  const [fileName, setFileName] = useState<string | null>(null);

  // o arquivo sobe direto do navegador para o Storage; a action recebe só o caminho
  async function submit(fd: FormData): Promise<ActionResult> {
    const file = fd.get("receipt");
    fd.delete("receipt");
    if (file instanceof File && file.size > 0) {
      try {
        fd.set("receipt_path", await uploadReceipt(file, options.familyId));
      } catch (e) {
        return { ok: false, error: `Não foi possível enviar o comprovante (${(e as Error).message})` };
      }
    }
    const result = await (initial ? updateTransaction : addTransaction)(fd);
    if (result.ok) setFileName(null);
    return result;
  }

  return (
    <ActionForm
      action={submit}
      onSuccess={onDone}
      reset={!initial}
      className={`grid gap-4 md:grid-cols-4 ${card ? "card" : ""}`}
    >
      {initial && <input type="hidden" name="id" value={initial.id} />}
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
              className={`inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors duration-150 md:flex-none ${
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
      {!initial && (
        <Field label="Repetição">
          <select name="frequency" value={installments || frequency === "monthly" ? frequency : "once"} onChange={(e) => setFrequency(e.target.value as typeof frequency)} className="input">
            <option value="once">Só esta vez</option>
            {kind === "expense" && <option value="installments">Parcelada</option>}
            <option value="monthly">Todo mês (recorrente)</option>
          </select>
        </Field>
      )}
      {installments && (
        <Field label="Nº de parcelas">
          <input name="installments" type="number" inputMode="numeric" min={2} max={72} defaultValue={2} required className="input money" />
        </Field>
      )}
      <Field label={installments ? "Valor total (R$)" : "Valor (R$)"}>
        <input
          name="amount" type="number" inputMode="decimal" step="0.01" min="0.01" required
          defaultValue={initial?.amount} data-autofocus className="input money" placeholder="0,00"
        />
      </Field>
      <Field label={frequency === "monthly" && !initial ? "Primeira data" : installments ? "Data da compra" : "Data"}>
        <input name="occurred_on" type="date" defaultValue={initial?.occurred_on ?? today} required className="input" />
      </Field>
      <Field label="Descrição" className={installments || (!initial && frequency !== "once") ? "" : "md:col-span-2"}>
        <input name="description" defaultValue={initial?.description ?? ""} className="input" placeholder="Ex: compras do mês" />
      </Field>
      <Field label="Categoria">
        <select
          name="category_id" required className="input" key={kind}
          defaultValue={initial?.kind === kind ? initial.category_id ?? undefined : undefined}
        >
          {categories.filter((c) => c.kind === kind).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Conta">
        <select name="account_id" defaultValue={initial?.account_id ?? undefined} className="input">
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </Field>
      <Field label="Quem">
        <select name="member_id" defaultValue={initial?.member_id ?? myId} className="input">
          {members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </Field>
      <Field label="Pagamento">
        <select name="payment_method" defaultValue={initial?.payment_method ?? undefined} className="input">
          {Object.entries(PAYMENT_METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <div className="flex flex-wrap items-center gap-3 md:col-span-4">
        <label className="btn-ghost max-w-full min-w-0 cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold">
          <Paperclip className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{fileName ?? (initial?.receipt_path ? "Trocar comprovante" : "Anexar comprovante")}</span>
          <input name="receipt" type="file" accept="image/*,application/pdf" className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
        </label>
        {initial?.receipt_path && !fileName && (
          <>
            <button type="button" className="text-sm font-medium text-accent hover:underline" onClick={() => openReceipt(initial.receipt_path!)}>Ver atual</button>
            <label className="inline-flex items-center gap-1.5 text-sm text-muted">
              <input type="checkbox" name="remove_receipt" value="1" className="h-4 w-4 accent-[var(--loss)]" /> remover
            </label>
          </>
        )}
      </div>
      <div className="md:col-span-4">
        <SubmitButton className="btn w-full md:w-auto">{initial ? "Salvar alterações" : "Salvar lançamento"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
