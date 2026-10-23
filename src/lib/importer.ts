/**
 * Leitura de extratos (roda no navegador, sem dependências).
 * OFX: formato padrão dos bancos. CSV: Nubank, Inter, C6 etc. — colunas detectadas pelo cabeçalho.
 */

export type ImportItem = { date: string; description: string; amount: number; externalId?: string };

/** Bancos brasileiros às vezes exportam em windows-1252: tenta UTF-8 e cai para latin1. */
export async function readText(file: File) {
  const buf = await file.arrayBuffer();
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch { return new TextDecoder("windows-1252").decode(buf); }
}

/** "1.234,56" | "-1234.56" | "R$ 12,00" | "(45,90)" → número. */
export function parseAmount(raw: string) {
  let s = raw.trim().replace(/R\$|\s/g, "");
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-") || s.endsWith("-");
  s = s.replace(/[()+-]/g, "");
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? (negative ? -n : n) : NaN;
}

/** "31/12/2026" | "2026-12-31" | "31-12-26" | "20261231" → "2026-12-31". */
export function parseDate(raw: string) {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

export function parseOFX(text: string): ImportItem[] {
  const items: ImportItem[] = [];
  const tag = (block: string, name: string) => block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, "i"))?.[1]?.trim() ?? "";
  for (const [, block] of text.matchAll(/<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|<\/BANKTRANLIST>)/gi)) {
    const date = parseDate(tag(block, "DTPOSTED"));
    const amount = parseAmount(tag(block, "TRNAMT"));
    const description = (tag(block, "MEMO") || tag(block, "NAME") || "Sem descrição").replace(/\s+/g, " ");
    if (date && Number.isFinite(amount) && amount !== 0) items.push({ date, description, amount, externalId: tag(block, "FITID") || undefined });
  }
  return items;
}

/** CSV com aspas, separador , ou ; detectado pela primeira linha. */
export function parseCSV(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  const [headers = [], ...body] = rows;
  return { headers: headers.map((h) => h.trim()), rows: body };
}

export type Mapping = { date: number; description: number; amount: number };

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Adivinha as colunas pelo nome do cabeçalho (data, descrição/título/histórico, valor/amount). */
export function guessMapping(headers: string[]): Mapping {
  const used = new Set<number>();
  // uma coluna não serve para dois papéis (ex.: "Data Lançamento" é data, não descrição)
  const find = (re: RegExp) => {
    const i = headers.findIndex((h, j) => !used.has(j) && re.test(norm(h)));
    if (i >= 0) used.add(i);
    return i;
  };
  const date = find(/^data|date|dt\b/);
  const amount = find(/^valor|amount|value|quantia/);
  const description = find(/descri|title|titulo|historico|memo|estabelecimento|lancamento/);
  return { date, description, amount };
}

export function csvToItems(rows: string[][], m: Mapping, positiveIsExpense: boolean): ImportItem[] {
  return rows.flatMap((r) => {
    const date = parseDate(r[m.date] ?? "");
    const raw = parseAmount(r[m.amount] ?? "");
    if (!date || !Number.isFinite(raw) || raw === 0) return [];
    return [{ date, description: (r[m.description] ?? "").trim() || "Sem descrição", amount: positiveIsExpense ? -raw : raw }];
  });
}

/** Pagamento de fatura no extrato: o app já debita a fatura sozinho, então não deve entrar de novo. */
export const isCardPayment = (description: string) =>
  /pagamento.*(fatura|cart[aã]o)|pgto.*(fat|cart)|fatura.*(paga|cart[aã]o)|pagamento recebido/i.test(description);
