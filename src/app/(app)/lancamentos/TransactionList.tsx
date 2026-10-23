"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Pencil, Repeat, Search, X } from "lucide-react";
import Amount from "@/components/Amount";
import Modal from "@/components/Modal";
import { ActionForm, DeleteButton, SubmitButton } from "@/components/forms";
import { brl, localISODate } from "@/lib/format";
import type { FormOptions } from "@/lib/family";
import { deleteInstallmentGroup, deleteTransaction } from "../actions";
import TransactionForm, { type EditableTransaction } from "./TransactionForm";

export type Row = EditableTransaction & {
  recurring_id: string | null; installment_group: string | null; installment_number: number | null; installment_total: number | null;
  catLabel: string; catColor: string; rootId: string | null; account: string; member: string; payment: string;
};

const dayKey = (d: Date) => localISODate(d);

function dayLabel(iso: string) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (iso === dayKey(today)) return "Hoje";
  if (iso === dayKey(yesterday)) return "Ontem";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, (c) => c.toUpperCase());
}

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function TransactionList({ rows, options, rootCategories, today }: {
  rows: Row[]; options: FormOptions; rootCategories: { id: string; name: string }[]; today: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [member, setMember] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return rows.filter((r) =>
      (!q || normalize(`${r.description ?? ""} ${r.catLabel} ${r.account} ${r.member}`).includes(q)) &&
      (!category || r.rootId === category || r.category_id === category) &&
      (!member || r.member_id === member));
  }, [rows, query, category, member]);

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of filtered) map.set(r.occurred_on, [...(map.get(r.occurred_on) ?? []), r]);
    return [...map];
  }, [filtered]);

  const filtering = query || category || member;
  const total = filtered.reduce((s, r) => s + (r.kind === "income" ? r.amount : -r.amount), 0);

  return (
    <section className="space-y-4" aria-label="Lançamentos do mês">
      <div className="flex flex-col gap-2 md:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar lançamentos</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por descrição, categoria, conta…" className="input pl-9"
          />
        </label>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <label>
            <span className="sr-only">Filtrar por categoria</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input md:w-48">
              <option value="">Todas as categorias</option>
              {rootCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar por pessoa</span>
            <select value={member} onChange={(e) => setMember(e.target.value)} className="input md:w-40">
              <option value="">Todos</option>
              {options.members.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {filtering && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <span>{filtered.length} lançamento(s) · saldo do filtro <span className="money text-ink">{brl(total)}</span></span>
          <button type="button" className="btn-ghost" onClick={() => { setQuery(""); setCategory(""); setMember(""); }}>
            <X className="h-4 w-4" aria-hidden /> Limpar filtros
          </button>
        </div>
      )}

      {!groups.length && (
        <p className="card py-10 text-center text-muted">
          {filtering ? "Nada encontrado com esses filtros." : "Nenhum lançamento neste mês ainda. Use o botão + para registrar."}
        </p>
      )}

      {groups.map(([day, items]) => {
        const net = items.reduce((s, r) => s + (r.kind === "income" ? r.amount : -r.amount), 0);
        return (
          <div key={day} className="card p-0">
            <h3 className="flex items-center justify-between border-b border-line px-4 py-2.5 text-sm">
              <span className="font-medium">{dayLabel(day)}</span>
              <span className={`money ${net >= 0 ? "text-gain" : "text-loss"}`}>{net >= 0 ? "+" : "−"} {brl(Math.abs(net))}</span>
            </h3>
            <ul className="ledger">
              {items.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: t.catColor }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-medium">
                      <span className="truncate">{t.description ?? t.catLabel}</span>
                      {t.installment_total && <span className="money shrink-0 rounded bg-sunken px-1.5 text-[11px] text-muted">{t.installment_number}/{t.installment_total}</span>}
                      {t.recurring_id && <Repeat className="h-3.5 w-3.5 shrink-0 text-muted" aria-label="Recorrente" />}
                      {t.occurred_on > today && <span className="inline-flex shrink-0 items-center gap-1 rounded bg-gold-soft px-1.5 text-[11px] text-gold"><CalendarClock className="h-3 w-3" aria-hidden />previsto</span>}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {t.catLabel} · {t.member}<span className="hidden md:inline"> · {t.account} · {t.payment}</span>
                    </p>
                  </div>
                  <Amount kind={t.kind} value={t.amount} />
                  <div className="flex">
                    <button type="button" className="icon-btn" onClick={() => setEditing(t)} aria-label={`Editar ${t.description ?? t.catLabel}`}>
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                    <DeleteButton action={deleteTransaction} id={t.id} what={`lançamento ${t.description ?? t.catLabel}`} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar lançamento">
        {editing && <TransactionForm options={options} initial={editing} card={false} onDone={() => setEditing(null)} />}
        {editing?.installment_group && (
          <ActionForm action={deleteInstallmentGroup} reset={false} onSuccess={() => setEditing(null)} className="mt-4 border-t border-line pt-4">
            <input type="hidden" name="id" value={editing.installment_group} />
            <p className="mb-2 text-sm text-muted">Esta é a parcela {editing.installment_number} de {editing.installment_total}. Salvar acima altera só esta parcela.</p>
            <SubmitButton className="btn-ghost border-loss/40 text-loss" pendingText="Excluindo…">Excluir todas as {editing.installment_total} parcelas</SubmitButton>
          </ActionForm>
        )}
      </Modal>
    </section>
  );
}
