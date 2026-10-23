/**
 * Regras de dinheiro da família, puras (sem banco):
 * - contas comuns: saldo inicial + ganhos − gastos até hoje − faturas já vencidas que elas pagam
 * - cartão: cada compra cai numa fatura (fechamento/vencimento); a fatura é debitada
 *   automaticamente da conta pagadora no dia do vencimento
 * - previsão: saldo de hoje + lançamentos futuros + recorrentes ainda não gerados − faturas a vencer
 */

export type FinAccount = {
  id: string; name: string; kind: string; initial_balance: number | string;
  closing_day: number | null; due_day: number | null; credit_limit: number | string | null;
  pay_from_account_id: string | null;
};
export type FinTx = {
  id: string; kind: "income" | "expense" | string; amount: number | string; occurred_on: string;
  account_id: string | null; description?: string | null; category_id?: string | null;
  installment_number?: number | null; installment_total?: number | null;
};
export type FinRecurring = {
  id: string; kind: "income" | "expense" | string; amount: number | string; day_of_month: number;
  start_date: string; end_date: string | null; active: boolean; generated_until: string | null;
  account_id: string | null; description?: string | null; category_id?: string | null;
};

export type InvoiceItem = { id: string; date: string; amount: number; kind: string; description: string | null; category_id: string | null; virtual: boolean; installment?: string };
export type Invoice = { cardId: string; dueDate: string; closeDate: string; total: number; items: InvoiceItem[] };

const pad = (n: number) => String(n).padStart(2, "0");
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate(); // m: 1..12

/** Mesmo dia em outro mês, ajustando para o último dia quando o mês é mais curto. */
export function addMonths(iso: string, n: number, day?: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(y, m - 1 + n, 1);
  const yy = t.getFullYear(), mm = t.getMonth() + 1;
  return `${yy}-${pad(mm)}-${pad(Math.min(day ?? d, daysIn(yy, mm)))}`;
}
export const monthOf = (iso: string) => iso.slice(0, 7);
export const lastDayOf = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${pad(daysIn(y, m))}`;
};
const num = (v: number | string | null | undefined) => Number(v ?? 0);
const signed = (t: { kind: string; amount: number | string }) => (t.kind === "income" ? 1 : -1) * num(t.amount);

/** Fatura em que uma compra do cartão cai. Compra no dia do fechamento já vai para a próxima. */
export function invoiceDates(purchase: string, closing: number | null, due: number | null) {
  if (!closing || !due) return { closeDate: purchase, dueDate: purchase }; // cartão sem configuração: debita na hora
  const day = Number(purchase.slice(8, 10));
  const closeMonthStart = addMonths(`${purchase.slice(0, 7)}-01`, day < closing ? 0 : 1);
  const closeDate = addMonths(closeMonthStart, 0, closing);
  const dueDate = addMonths(closeMonthStart, due > closing ? 0 : 1, due);
  return { closeDate, dueDate };
}

/** Ocorrências de um recorrente no intervalo (from, to], ainda não geradas no banco. */
export function recurringOccurrences(r: FinRecurring, fromExclusive: string, toInclusive: string) {
  if (!r.active) return [];
  const after = r.generated_until && r.generated_until > fromExclusive ? r.generated_until : fromExclusive;
  const out: string[] = [];
  let m = `${(after > r.start_date ? after : r.start_date).slice(0, 7)}-01`;
  while (m <= toInclusive) {
    const occ = addMonths(m, 0, r.day_of_month);
    if (occ > after && occ >= r.start_date && occ <= toInclusive && (!r.end_date || occ <= r.end_date)) out.push(occ);
    m = addMonths(m, 1, 1);
  }
  return out;
}

export function computeFinance({ accounts, txs, recurring, today, months = 3 }: {
  accounts: FinAccount[]; txs: FinTx[]; recurring: FinRecurring[]; today: string; months?: number;
}) {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const isCard = (id: string | null) => !!id && byId.get(id)?.kind === "credit_card";
  const horizon = lastDayOf(monthOf(addMonths(`${monthOf(today)}-01`, months - 1, 1)));

  // faturas: compras reais + recorrentes futuros lançados no cartão
  const invoices = new Map<string, Invoice>();
  const pushToInvoice = (cardId: string, item: InvoiceItem) => {
    const card = byId.get(cardId)!;
    const { closeDate, dueDate } = invoiceDates(item.date, card.closing_day, card.due_day);
    const key = `${cardId}|${dueDate}`;
    const inv = invoices.get(key) ?? { cardId, dueDate, closeDate, total: 0, items: [] };
    inv.items.push(item);
    inv.total += (item.kind === "income" ? -1 : 1) * item.amount;
    invoices.set(key, inv);
  };
  for (const t of txs) {
    if (!isCard(t.account_id)) continue;
    pushToInvoice(t.account_id!, {
      id: t.id, date: t.occurred_on, amount: num(t.amount), kind: t.kind, description: t.description ?? null,
      category_id: t.category_id ?? null, virtual: false,
      installment: t.installment_total ? `${t.installment_number}/${t.installment_total}` : undefined,
    });
  }
  for (const r of recurring) {
    if (!isCard(r.account_id)) continue;
    for (const date of recurringOccurrences(r, today, horizon)) {
      pushToInvoice(r.account_id!, { id: `${r.id}:${date}`, date, amount: num(r.amount), kind: r.kind, description: r.description ?? null, category_id: r.category_id ?? null, virtual: true });
    }
  }
  const allInvoices = [...invoices.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // saldos das contas comuns até hoje (faturas vencidas já foram debitadas)
  const balances = new Map<string, number>();
  let unassigned = 0; // lançamentos sem conta
  for (const a of accounts) if (a.kind !== "credit_card") balances.set(a.id, num(a.initial_balance));
  for (const t of txs) {
    if (t.occurred_on > today || isCard(t.account_id)) continue;
    if (t.account_id && balances.has(t.account_id)) balances.set(t.account_id, balances.get(t.account_id)! + signed(t));
    else unassigned += signed(t);
  }
  const debit = (cardId: string, value: number) => {
    const payer = byId.get(cardId)?.pay_from_account_id;
    if (payer && balances.has(payer)) balances.set(payer, balances.get(payer)! - value);
    else unassigned -= value;
  };
  for (const inv of allInvoices) if (inv.dueDate <= today && inv.items.some((i) => !i.virtual)) {
    debit(inv.cardId, inv.items.filter((i) => !i.virtual).reduce((s, i) => s + (i.kind === "income" ? -i.amount : i.amount), 0));
  }
  const liquid = [...balances.values()].reduce((s, v) => s + v, 0) + unassigned;

  // cartões: dívida = faturas ainda não vencidas (inclui parcelas futuras)
  const cards = accounts.filter((a) => a.kind === "credit_card").map((card) => {
    const own = allInvoices.filter((i) => i.cardId === card.id);
    const realOpen = own.filter((i) => i.dueDate > today).map((i) => ({ ...i, total: i.items.filter((x) => !x.virtual).reduce((s, x) => s + (x.kind === "income" ? -x.amount : x.amount), 0) }));
    const debt = realOpen.reduce((s, i) => s + i.total, 0);
    const limit = card.credit_limit == null ? null : num(card.credit_limit);
    return {
      card, debt, limit, available: limit == null ? null : limit - debt,
      current: own.find((i) => i.dueDate > today) ?? null, // próxima fatura a vencer
      upcoming: own.filter((i) => i.dueDate > today),
      past: own.filter((i) => i.dueDate <= today).reverse(),
    };
  });
  const cardDebt = cards.reduce((s, c) => s + c.debt, 0);

  // previsão mês a mês
  let running = liquid;
  const forecast = Array.from({ length: months }, (_, i) => {
    const month = monthOf(addMonths(`${monthOf(today)}-01`, i, 1));
    const to = lastDayOf(month);
    const inRange = (d: string) => d > today && d >= `${month}-01` && d <= to;
    let income = 0, expense = 0, cardBills = 0;
    for (const t of txs) {
      if (isCard(t.account_id) || !inRange(t.occurred_on)) continue;
      if (t.kind === "income") income += num(t.amount); else expense += num(t.amount);
    }
    for (const r of recurring) {
      if (isCard(r.account_id)) continue;
      const count = recurringOccurrences(r, today, to).filter(inRange).length;
      if (r.kind === "income") income += count * num(r.amount); else expense += count * num(r.amount);
    }
    const bills = allInvoices.filter((inv) => inRange(inv.dueDate));
    cardBills = bills.reduce((s, inv) => s + inv.total, 0);
    running += income - expense - cardBills;
    return { month, income, expense, cardBills, bills, endBalance: running };
  });

  return { balances, unassigned, liquid, cards, cardDebt, invoices: allInvoices, forecast };
}
