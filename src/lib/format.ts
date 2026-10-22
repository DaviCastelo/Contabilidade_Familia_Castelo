export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dateBR = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

/** "2026-10" -> { start: "2026-10-01", end: "2026-11-01" } */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { start: `${month}-01`, end: `${next}-01` };
}

export const currentMonth = () => new Date().toISOString().slice(0, 7);

export const monthLabel = (month: string) =>
  new Date(month + "-01T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

export const PAYMENT_METHODS: Record<string, string> = {
  pix: "Pix", debit: "Débito", credit: "Crédito", cash: "Dinheiro",
  transfer: "Transferência", boleto: "Boleto", other: "Outro",
};

export const ASSET_TYPES: Record<string, string> = {
  renda_fixa: "Renda fixa", tesouro: "Tesouro Direto", acoes: "Ações", fii: "FIIs",
  cripto: "Cripto", previdencia: "Previdência", outro: "Outro",
};

export const ACCOUNT_KINDS: Record<string, string> = {
  checking: "Conta corrente", savings: "Poupança", credit_card: "Cartão de crédito", cash: "Dinheiro", other: "Outra",
};
