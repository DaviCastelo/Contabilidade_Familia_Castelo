"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, CircleAlert, LoaderCircle, Plus, Sparkles, X } from "lucide-react";
import type { DisplayItem } from "@/lib/assistant/agent";

const SUGGESTIONS = [
  "Lança 230 de mercado no pix hoje",
  "Quanto gastamos com alimentação este mês?",
  "Comprei uma TV de 3 mil em 10x no cartão",
  "Vai sobrar dinheiro no fim do mês?",
  "Cadastra o salário de 5 mil todo dia 5",
  "Como está a fatura do cartão?",
];

/** Markdown mínimo: **negrito** e listas com "- ". */
function RichText({ text }: { text: string }) {
  const inline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
    );
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={blocks.length} className="my-1 list-disc space-y-0.5 pl-5">{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    list = [];
  };
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*[-*•]\s+(.*)/);
    if (m) { list.push(m[1]); continue; }
    flush();
    if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="space-y-1.5">{blocks}</div>;
}

export default function Chat({ initialId, initialItems, ready }: { initialId: string | null; initialItems: DisplayItem[]; ready: boolean }) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState(initialId);
  const [items, setItems] = useState<DisplayItem[]>(initialItems);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [items, pending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    setError(null);
    setInput("");
    setItems((prev) => [...prev, { role: "user", text: message, at: new Date().toISOString() }]);
    setPending(true);
    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message }),
      });
      const data = await res.json().catch(() => ({ error: "Sua sessão expirou. Recarregue a página." }));
      if (data.conversationId) setConversationId(data.conversationId);
      if (!res.ok) {
        setItems((prev) => prev.slice(0, -1));
        setInput(message);
        setError(data.error ?? "Algo deu errado.");
        return;
      }
      setItems((prev) => [...prev, { role: "assistant", text: data.reply, actions: data.actions, at: new Date().toISOString() }]);
      if (data.changed) router.refresh();
    } catch {
      setItems((prev) => prev.slice(0, -1));
      setInput(message);
      setError("Sem conexão. Tente de novo.");
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  function newConversation() {
    setConversationId(null);
    setItems([]);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div className="flex h-[calc(100dvh-12rem)] min-h-96 flex-col md:h-[calc(100dvh-8.5rem)]">
      <div className="flex items-center justify-between gap-3 pb-3">
        <h1 className="display flex items-center gap-2 text-3xl font-semibold"><Sparkles className="h-6 w-6 text-gold" aria-hidden />Assistente</h1>
        {items.length > 0 && (
          <button type="button" onClick={newConversation} className="btn-ghost"><Plus className="h-4 w-4" aria-hidden />Nova conversa</button>
        )}
      </div>

      <div className="card flex-1 overflow-y-auto p-4 sm:p-5" aria-live="polite">
        {!ready && (
          <p className="mb-4 flex gap-2 rounded-lg bg-warn/10 p-3 text-sm"><CircleAlert className="h-4 w-4 shrink-0 text-warn" aria-hidden />
            O assistente precisa da chave da API do Claude (ANTHROPIC_API_KEY) configurada na Vercel para funcionar.</p>
        )}
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div className="space-y-1">
              <p className="display text-xl font-semibold">Pergunte ou peça qualquer coisa</p>
              <p className="max-w-md text-sm text-muted">Eu consulto e lanço gastos, ganhos, parcelas, recorrentes, orçamentos e investimentos da família.</p>
            </div>
            <div className="flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={pending || !ready}
                  className="min-h-11 cursor-pointer rounded-full border border-line bg-paper px-3.5 text-sm transition-colors duration-150 hover:border-gold hover:bg-gold-soft disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="space-y-4">
            {items.map((m, i) => (
              <li key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${m.role === "user" ? "rounded-br-md bg-accent text-accent-ink" : "rounded-bl-md bg-sunken"}`}>
                  {m.role === "assistant" && m.actions && m.actions.length > 0 && (
                    <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Ações feitas">
                      {m.actions.map((a, j) => (
                        <li key={j} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${a.ok ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"}`}>
                          {a.ok ? <Check className="h-3 w-3" aria-hidden /> : <X className="h-3 w-3" aria-hidden />}{a.label}
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.role === "assistant" ? <RichText text={m.text} /> : <p className="whitespace-pre-wrap">{m.text}</p>}
                </div>
              </li>
            ))}
            {pending && (
              <li className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-sunken px-4 py-2.5 text-sm text-muted">
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />Pensando…
                </div>
              </li>
            )}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      {error && <p role="alert" className="mt-2 flex gap-2 rounded-lg bg-loss-soft p-3 text-sm"><CircleAlert className="h-4 w-4 shrink-0 text-loss" aria-hidden />{error}</p>}

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => { e.preventDefault(); send(input); }}
      >
        <label className="flex-1">
          <span className="sr-only">Mensagem para o assistente</span>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={1}
            maxLength={4000}
            placeholder="Ex: paguei 180 de luz ontem no débito"
            className="input max-h-40 min-h-12 resize-none py-3"
            disabled={!ready}
          />
        </label>
        <button className="btn h-12 w-12 shrink-0 rounded-full p-0" disabled={pending || !input.trim() || !ready} aria-label="Enviar mensagem">
          {pending ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> : <ArrowUp className="h-5 w-5" aria-hidden />}
        </button>
      </form>
    </div>
  );
}
