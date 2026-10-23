"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleAlert, FileUp, LoaderCircle } from "lucide-react";
import { Field } from "@/components/forms";
import { CastleLights, StatusMark } from "@/components/loading/Animations";
import { brl, dateBR } from "@/lib/format";
import { csvToItems, guessMapping, isCardPayment, parseCSV, parseOFX, readText, type ImportItem, type Mapping } from "@/lib/importer";
import { importBatch, previewImport } from "./actions";

type Account = { id: string; name: string; kind: string };
type Cat = { id: string; label: string; kind: string };
type Review = ImportItem & { categoryId: string | null; selected: boolean; note?: string };
const BATCH = 25;

export default function ImportWizard({ accounts, categories }: { accounts: Account[]; categories: Cat[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const account = accounts.find((a) => a.id === accountId);
  const [fileName, setFileName] = useState<string | null>(null);
  const [ofx, setOfx] = useState<ImportItem[] | null>(null);
  const [csv, setCsv] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Mapping>({ date: -1, description: -1, amount: -1 });
  const [positiveIsExpense, setPositiveIsExpense] = useState(false);
  const [review, setReview] = useState<Review[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; inserted: number } | null>(null);
  const [finished, setFinished] = useState<number | null>(null);

  const items = useMemo(() => {
    if (ofx) return ofx;
    if (csv && mapping.date >= 0 && mapping.description >= 0 && mapping.amount >= 0) return csvToItems(csv.rows, mapping, positiveIsExpense);
    return [];
  }, [ofx, csv, mapping, positiveIsExpense]);

  async function onFile(file: File | undefined) {
    setError(null); setReview(null); setOfx(null); setCsv(null);
    if (!file) return;
    setFileName(file.name);
    const text = await readText(file);
    if (/<OFX|<STMTTRN/i.test(text)) {
      const parsed = parseOFX(text);
      if (!parsed.length) setError("Não encontrei lançamentos nesse OFX.");
      setOfx(parsed);
    } else {
      const parsed = parseCSV(text);
      if (!parsed.rows.length) { setError("O arquivo está vazio ou não é um CSV."); return; }
      setCsv(parsed);
      setMapping(guessMapping(parsed.headers));
      setPositiveIsExpense(account?.kind === "credit_card");
    }
  }

  async function goReview() {
    setBusy(true); setError(null);
    try {
      const hints = await previewImport(accountId, items);
      setReview(items.map((it, i) => {
        const payment = isCardPayment(it.description);
        const note = hints[i].duplicate ? "já lançado" : payment ? "pagamento de fatura (o app já desconta)" : undefined;
        return { ...it, categoryId: hints[i].categoryId, selected: !hints[i].duplicate && !payment, note };
      }));
    } catch {
      setError("Não foi possível analisar o arquivo. Tente de novo.");
    } finally { setBusy(false); }
  }

  async function runImport() {
    const rows = review!.filter((r) => r.selected);
    setProgress({ done: 0, total: rows.length, inserted: 0 });
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH).map(({ date, description, amount, externalId, categoryId }) => ({ date, description, amount, externalId, categoryId }));
      const res = await importBatch(accountId, chunk).catch(() => ({ ok: false as const, error: "Falha na conexão." }));
      if (!res.ok) { setError(`Parei no lançamento ${i + 1}: ${res.error} Os anteriores já foram importados.`); setProgress(null); return; }
      inserted += res.inserted;
      setProgress({ done: Math.min(rows.length, i + BATCH), total: rows.length, inserted });
    }
    setTimeout(() => { setFinished(inserted); setProgress(null); }, 700);
  }

  function restart() {
    setReview(null); setOfx(null); setCsv(null); setFileName(null); setFinished(null); setError(null);
  }

  // ---------- importando / concluído ----------
  if (progress || finished !== null) {
    const pct = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 100;
    return (
      <div role="status" className="card flex flex-col items-center gap-4 bg-[#0a1120] py-12 text-center text-[#f6f4ef]">
        <CastleLights progress={pct} size={150} />
        {finished === null ? (
          <>
            <p className="flex items-baseline gap-1 text-[#e3b651]"><span className="money text-4xl font-semibold">{pct}</span><span className="text-sm">%</span></p>
            <p className="text-sm text-[#c9d2e3]">Importando {progress!.done} de {progress!.total} lançamentos…</p>
            <div className="h-2.5 w-56 rounded-full border border-white/10 bg-[#13294b] p-0.5">
              <div className="h-full rounded-full bg-gradient-to-r from-[#c79a2b] via-[#e3b651] to-[#f6f4ef] transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
          </>
        ) : (
          <>
            <StatusMark kind="success" />
            <p className="fc-swap display text-2xl font-semibold">{finished} lançamento{finished === 1 ? "" : "s"} importado{finished === 1 ? "" : "s"}</p>
            <div className="flex gap-2">
              <Link href="/lancamentos" className="btn">Ver lançamentos</Link>
              <button type="button" onClick={restart} className="btn-ghost border-white/20 text-[#f6f4ef] hover:bg-white/10">Importar outro</button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ---------- revisão ----------
  if (review) {
    const selected = review.filter((r) => r.selected);
    const total = selected.reduce((s, r) => s + r.amount, 0);
    const skipped = review.length - selected.length;
    const set = (i: number, patch: Partial<Review>) => setReview((rs) => rs!.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    return (
      <div className="space-y-4">
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{selected.length} de {review.length} lançamentos selecionados · <span className="money">{brl(total)}</span></p>
            {skipped > 0 && <p className="text-sm text-muted">{skipped} desmarcado{skipped === 1 ? "" : "s"} (já lançados ou pagamentos de fatura). Marque se quiser importar mesmo assim.</p>}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={() => setReview(null)}>Voltar</button>
            <button type="button" className="btn" disabled={!selected.length} onClick={runImport}>Importar {selected.length}</button>
          </div>
        </div>
        {error && <p role="alert" className="flex gap-2 rounded-lg bg-loss-soft p-3 text-sm"><CircleAlert className="h-4 w-4 shrink-0 text-loss" aria-hidden />{error}</p>}
        <ul className="card ledger p-0">
          {review.map((r, i) => {
            const kind = r.amount < 0 ? "expense" : "income";
            return (
              <li key={i} className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[auto_6rem_1fr_14rem_8rem] ${r.selected ? "" : "opacity-55"}`}>
                <input type="checkbox" checked={r.selected} onChange={(e) => set(i, { selected: e.target.checked })} className="h-5 w-5 accent-[var(--accent)]" aria-label={`Importar ${r.description}`} />
                <span className="money hidden text-sm text-muted md:block">{dateBR(r.date)}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.description}</span>
                  <span className="block text-xs text-muted"><span className="md:hidden">{dateBR(r.date)}</span>{r.note && <span className="text-warn"> · {r.note}</span>}</span>
                </span>
                <span className={`money text-right font-medium md:order-last ${kind === "income" ? "text-gain" : "text-loss"}`}>{kind === "income" ? "+" : "−"}{brl(Math.abs(r.amount))}</span>
                <label className="col-span-3 md:col-span-1">
                  <span className="sr-only">Categoria de {r.description}</span>
                  <select value={r.categoryId ?? ""} onChange={(e) => set(i, { categoryId: e.target.value || null })} className="input py-1.5">
                    {categories.filter((c) => c.kind === kind).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // ---------- conta + arquivo ----------
  return (
    <div className="card space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Importar para a conta">
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.kind === "credit_card" ? " (cartão)" : ""}</option>)}
          </select>
        </Field>
        <div>
          <span className="label">Arquivo do extrato</span>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line bg-sunken px-3 text-sm transition-colors hover:border-gold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold">
            <FileUp className="h-4 w-4 text-gold" aria-hidden />
            <span className="truncate">{fileName ?? "Escolher OFX ou CSV"}</span>
            <input type="file" accept=".ofx,.qfx,.csv,.txt" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        </div>
      </div>

      {csv && (
        <div className="space-y-3 rounded-lg bg-sunken p-4">
          <p className="text-sm text-muted">Confira quais colunas do CSV são a data, a descrição e o valor:</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["date", "description", "amount"] as const).map((k) => (
              <Field key={k} label={{ date: "Data", description: "Descrição", amount: "Valor" }[k]}>
                <select value={mapping[k]} onChange={(e) => setMapping({ ...mapping, [k]: Number(e.target.value) })} className="input">
                  <option value={-1}>Escolha…</option>
                  {csv.headers.map((h, i) => <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>)}
                </select>
              </Field>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={positiveIsExpense} onChange={(e) => setPositiveIsExpense(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Valores positivos são gastos (comum em CSV de fatura de cartão)
          </label>
        </div>
      )}

      {items.length > 0 && (
        <p className="text-sm text-muted">
          Encontrei <b className="text-ink">{items.length}</b> lançamentos de {dateBR(items.map((i) => i.date).sort()[0])} a {dateBR(items.map((i) => i.date).sort().at(-1)!)}.
        </p>
      )}
      {error && <p role="alert" className="flex gap-2 rounded-lg bg-loss-soft p-3 text-sm"><CircleAlert className="h-4 w-4 shrink-0 text-loss" aria-hidden />{error}</p>}
      <button type="button" className="btn" disabled={!items.length || busy || !accountId} onClick={goReview}>
        {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}Revisar e escolher categorias
      </button>
    </div>
  );
}
