import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { categoryLabel, sortCategories, rootCategory, type Category } from "@/lib/family";
import { ASSET_TYPES, ACCOUNT_KINDS, PAYMENT_METHODS, localISODate, monthRange } from "@/lib/format";
import { createRecurring, createTransactions, findByName, loadFinance } from "@/lib/ops";

/**
 * Ferramentas do assistente. Rodam com o cliente Supabase do usuário logado,
 * então só enxergam e alteram a família dele (RLS).
 */
export type ToolContext = { supabase: SupabaseClient; familyId: string; userId: string };

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use AAAA-MM-DD");
const month = z.string().regex(/^\d{4}-\d{2}$/, "use AAAA-MM");
const money = z.coerce.number().positive();
const kind = z.enum(["income", "expense"]);
const payment = z.enum(Object.keys(PAYMENT_METHODS) as [string, ...string[]]);

const S = { type: "string" } as const;
const N = { type: "number" } as const;
const KIND = { type: "string", enum: ["income", "expense"], description: "income = ganho, expense = gasto" } as const;
const PAYMENT = { type: "string", enum: Object.keys(PAYMENT_METHODS), description: "pix, debit, credit, cash, transfer, boleto, other" } as const;
const DATE = { type: "string", description: "AAAA-MM-DD" } as const;

type Def = { tool: Anthropic.Beta.BetaTool; schema: z.ZodType; mutates: boolean; label: string; run: (input: never, ctx: ToolContext) => Promise<unknown> };
const defs: Def[] = [];
function tool<T extends z.ZodType>(name: string, label: string, description: string, properties: Record<string, unknown>, required: string[], schema: T, mutates: boolean, run: (input: z.infer<T>, ctx: ToolContext) => Promise<unknown>) {
  defs.push({ tool: { name, description, input_schema: { type: "object", properties, required } }, schema, mutates, label, run: run as Def["run"] });
}

// ---------- apoio ----------

async function registry(ctx: ToolContext) {
  const [{ data: cats }, { data: accounts }, { data: members }] = await Promise.all([
    ctx.supabase.from("categories").select("id, name, kind, color, parent_id").eq("family_id", ctx.familyId),
    ctx.supabase.from("accounts").select("id, name, kind, closing_day, due_day, credit_limit, pay_from_account_id").eq("family_id", ctx.familyId).order("name"),
    ctx.supabase.from("family_members").select("user_id, display_name").eq("family_id", ctx.familyId),
  ]);
  const categories = sortCategories((cats ?? []) as Category[]);
  return { categories, accounts: accounts ?? [], members: members ?? [] };
}
type Registry = Awaited<ReturnType<typeof registry>>;

const findCategory = (r: Registry, name: string, k?: string) =>
  findByName(r.categories.filter((c) => !k || c.kind === k), name, (c) => [categoryLabel(c, r.categories), c.name], "Categoria");
const findAccount = (r: Registry, name: string) => findByName(r.accounts, name, (a) => [a.name], "Conta");
const findMember = (r: Registry, name: string) => findByName(r.members, name, (m) => [m.display_name], "Pessoa");
const two = (v: number) => Math.round(v * 100) / 100;

function txView(t: Record<string, unknown>, r: Registry) {
  const cat = r.categories.find((c) => c.id === t.category_id);
  return {
    id: t.id, data: t.occurred_on, tipo: t.kind === "income" ? "ganho" : "gasto", valor: Number(t.amount),
    descricao: t.description, categoria: cat ? categoryLabel(cat, r.categories) : null,
    conta: r.accounts.find((a) => a.id === t.account_id)?.name ?? null,
    pessoa: r.members.find((m) => m.user_id === t.member_id)?.display_name ?? null,
    pagamento: t.payment_method, ...(t.installment_total ? { parcela: `${t.installment_number}/${t.installment_total}`, grupo_parcelas: t.installment_group } : {}),
    ...(t.recurring_id ? { recorrente: true } : {}),
  };
}

// ---------- leitura ----------

tool("listar_cadastros", "Consultou cadastros",
  "Lista categorias (com subcategorias), contas/cartões e pessoas da família. Use antes de lançar se não souber os nomes exatos.",
  {}, [], z.object({}), false,
  async (_, ctx) => {
    const r = await registry(ctx);
    return {
      categorias: r.categories.map((c) => ({ nome: categoryLabel(c, r.categories), tipo: c.kind === "income" ? "ganho" : "gasto" })),
      contas: r.accounts.map((a) => ({ nome: a.name, tipo: ACCOUNT_KINDS[a.kind] ?? a.kind,
        ...(a.kind === "credit_card" ? { fechamento: a.closing_day, vencimento: a.due_day, limite: a.credit_limit, paga_por: r.accounts.find((x) => x.id === a.pay_from_account_id)?.name ?? null } : {}) })),
      pessoas: r.members.map((m) => m.display_name),
    };
  });

tool("resumo_mes", "Consultou o resumo",
  "Resumo de um mês: ganhos, gastos, saldo, gastos por categoria, orçamentos, e a situação atual (saldo das contas, dívida de cartões, investimentos, patrimônio, previsão dos próximos meses).",
  { mes: { ...S, description: "AAAA-MM; padrão = mês atual" } }, [], z.object({ mes: month.optional() }), false,
  async ({ mes }, ctx) => {
    const m = mes ?? localISODate().slice(0, 7);
    const { start, end } = monthRange(m);
    const [r, fin, { data: txs }, { data: budgets }] = await Promise.all([
      registry(ctx), loadFinance(ctx.supabase, ctx.familyId, 3),
      ctx.supabase.from("transactions").select("kind, amount, category_id").eq("family_id", ctx.familyId).gte("occurred_on", start).lt("occurred_on", end),
      ctx.supabase.from("budgets").select("category_id, amount").eq("family_id", ctx.familyId).eq("month", start),
    ]);
    const byId = new Map(r.categories.map((c) => [c.id, c]));
    const byRoot = new Map<string, number>();
    let income = 0, expense = 0;
    for (const t of txs ?? []) {
      if (t.kind === "income") { income += Number(t.amount); continue; }
      expense += Number(t.amount);
      const root = rootCategory(t.category_id, byId)?.name ?? "Sem categoria";
      byRoot.set(root, (byRoot.get(root) ?? 0) + Number(t.amount));
    }
    return {
      mes: m, ganhos: two(income), gastos: two(expense), saldo_do_mes: two(income - expense),
      gastos_por_categoria: Object.fromEntries([...byRoot].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, two(v)])),
      orcamentos: (budgets ?? []).map((b) => {
        const name = byId.get(b.category_id)?.name ?? "?";
        return { categoria: name, limite: Number(b.amount), usado: two(byRoot.get(name) ?? 0) };
      }),
      hoje: fin.today,
      saldo_contas_hoje: Object.fromEntries([...fin.balances].map(([id, v]) => [r.accounts.find((a) => a.id === id)?.name ?? id, two(v)])),
      total_em_contas: two(fin.liquid), divida_cartoes: two(fin.cardDebt), investido: two(fin.invested), patrimonio: two(fin.patrimony),
      previsao: fin.forecast.map((f) => ({ mes: f.month, saldo_previsto_fim_do_mes: two(f.endBalance), entradas: two(f.income), saidas: two(f.expense), faturas: two(f.cardBills) })),
    };
  });

tool("listar_lancamentos", "Consultou lançamentos",
  "Busca lançamentos (gastos e ganhos) com filtros. Retorna id, data, valor, categoria, conta, pessoa, parcela. Use para responder perguntas e para achar o id antes de editar/excluir.",
  {
    de: { ...DATE, description: "data inicial (inclusive)" }, ate: { ...DATE, description: "data final (inclusive)" },
    tipo: KIND, categoria: { ...S, description: "nome da categoria (inclui subcategorias)" }, pessoa: S, conta: S,
    busca: { ...S, description: "texto na descrição" }, limite: { ...N, description: "padrão 50, máximo 200" },
  }, [],
  z.object({ de: date.optional(), ate: date.optional(), tipo: kind.optional(), categoria: z.string().optional(), pessoa: z.string().optional(), conta: z.string().optional(), busca: z.string().optional(), limite: z.coerce.number().int().min(1).max(200).optional() }),
  false,
  async (f, ctx) => {
    const r = await registry(ctx);
    let q = ctx.supabase.from("transactions")
      .select("id, kind, amount, occurred_on, description, category_id, account_id, member_id, payment_method, installment_group, installment_number, installment_total, recurring_id")
      .eq("family_id", ctx.familyId).order("occurred_on", { ascending: false }).limit(f.limite ?? 50);
    if (f.de) q = q.gte("occurred_on", f.de);
    if (f.ate) q = q.lte("occurred_on", f.ate);
    if (f.tipo) q = q.eq("kind", f.tipo);
    if (f.busca) q = q.ilike("description", `%${f.busca}%`);
    if (f.conta) q = q.eq("account_id", findAccount(r, f.conta).id);
    if (f.pessoa) q = q.eq("member_id", findMember(r, f.pessoa).user_id);
    if (f.categoria) {
      const c = findCategory(r, f.categoria);
      q = q.in("category_id", [c.id, ...r.categories.filter((x) => x.parent_id === c.id).map((x) => x.id)]);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (data ?? []).map((t) => txView(t, r));
    return { quantidade: rows.length, total_ganhos: two(rows.filter((x) => x.tipo === "ganho").reduce((s, x) => s + x.valor, 0)), total_gastos: two(rows.filter((x) => x.tipo === "gasto").reduce((s, x) => s + x.valor, 0)), lancamentos: rows };
  });

tool("faturas_cartao", "Consultou faturas",
  "Faturas dos cartões: atual, próximas e últimas pagas, com as compras de cada uma, limite e disponível.",
  { cartao: { ...S, description: "nome do cartão; vazio = todos" } }, [], z.object({ cartao: z.string().optional() }), false,
  async ({ cartao }, ctx) => {
    const [r, fin] = await Promise.all([registry(ctx), loadFinance(ctx.supabase, ctx.familyId, 6)]);
    const only = cartao ? findAccount(r, cartao).id : null;
    const cat = (id: string | null) => r.categories.find((c) => c.id === id)?.name ?? null;
    return fin.cards.filter((c) => !only || c.card.id === only).map((c) => ({
      cartao: c.card.name, fechamento: c.card.closing_day, vencimento: c.card.due_day, limite: c.limit, usado: two(c.debt), disponivel: c.available == null ? null : two(c.available),
      faturas_a_vencer: c.upcoming.map((i) => ({ vence: i.dueDate, fecha: i.closeDate, total: two(i.total),
        compras: i.items.map((x) => ({ data: x.date, valor: x.amount, descricao: x.description, categoria: cat(x.category_id), parcela: x.installment, prevista_recorrente: x.virtual || undefined })) })),
      ultimas_pagas: c.past.slice(0, 3).map((i) => ({ venceu: i.dueDate, total: two(i.total) })),
    }));
  });

tool("listar_recorrentes", "Consultou recorrentes",
  "Lista os lançamentos recorrentes (que entram sozinhos todo mês).", {}, [], z.object({}), false,
  async (_, ctx) => {
    const r = await registry(ctx);
    const { data } = await ctx.supabase.from("recurring_transactions").select("*").eq("family_id", ctx.familyId).order("day_of_month");
    return (data ?? []).map((x) => ({ id: x.id, descricao: x.description, tipo: x.kind === "income" ? "ganho" : "gasto", valor: Number(x.amount), dia: x.day_of_month,
      categoria: r.categories.find((c) => c.id === x.category_id)?.name ?? null, conta: r.accounts.find((a) => a.id === x.account_id)?.name ?? null,
      ativo: x.active, inicio: x.start_date, fim: x.end_date }));
  });

tool("listar_investimentos", "Consultou investimentos",
  "Lista investimentos com valor atual, aportes líquidos, rendimento e últimas movimentações.", {}, [], z.object({}), false,
  async (_, ctx) => {
    const [{ data: inv }, { data: mov }] = await Promise.all([
      ctx.supabase.from("investments").select("id, name, asset_type, institution, current_value, updated_value_at").eq("family_id", ctx.familyId).order("name"),
      ctx.supabase.from("investment_movements").select("investment_id, kind, amount, occurred_on").eq("family_id", ctx.familyId).order("occurred_on", { ascending: false }),
    ]);
    return (inv ?? []).map((i) => {
      const ms = (mov ?? []).filter((m) => m.investment_id === i.id);
      const net = ms.reduce((s, m) => s + (m.kind === "aporte" ? Number(m.amount) : m.kind === "resgate" ? -Number(m.amount) : 0), 0);
      return { id: i.id, nome: i.name, tipo: ASSET_TYPES[i.asset_type], instituicao: i.institution, valor_atual: Number(i.current_value), atualizado_em: i.updated_value_at,
        aplicado_liquido: two(net), rendimento: two(Number(i.current_value) - net), ultimas_movimentacoes: ms.slice(0, 5) };
    });
  });

// ---------- escrita ----------

tool("criar_lancamento", "Lançou",
  "Registra um gasto ou ganho. Para compra parcelada informe `parcelas` (>1) e `valor` = valor TOTAL da compra; o app divide e lança uma parcela por mês. Se não souber a categoria exata, passe o nome mais próximo (ex: 'mercado'); se der erro, ele lista as opções.",
  {
    tipo: KIND, valor: { ...N, description: "em reais; total da compra se parcelada" }, data: { ...DATE, description: "padrão = hoje" },
    descricao: S, categoria: S, conta: { ...S, description: "conta ou cartão; padrão = nenhuma" }, pessoa: { ...S, description: "quem gastou/recebeu; padrão = quem está falando" },
    forma_pagamento: PAYMENT, parcelas: { ...N, description: "nº de parcelas (só gastos); padrão 1" },
  }, ["tipo", "valor", "categoria"],
  z.object({ tipo: kind, valor: money, data: date.optional(), descricao: z.string().optional(), categoria: z.string(), conta: z.string().optional(), pessoa: z.string().optional(), forma_pagamento: payment.optional(), parcelas: z.coerce.number().int().min(1).max(72).optional() }),
  true,
  async (i, ctx) => {
    const r = await registry(ctx);
    const account = i.conta ? findAccount(r, i.conta) : null;
    const ids = await createTransactions(ctx.supabase, ctx.familyId, {
      kind: i.tipo, amount: i.valor, occurred_on: i.data ?? localISODate(), description: i.descricao ?? null,
      category_id: findCategory(r, i.categoria, i.tipo).id, account_id: account?.id ?? null,
      member_id: i.pessoa ? findMember(r, i.pessoa).user_id : ctx.userId,
      payment_method: i.forma_pagamento ?? (account?.kind === "credit_card" ? "credit" : null), installments: i.tipo === "expense" ? i.parcelas : 1,
    });
    return { ok: true, ids, parcelas: ids.length };
  });

tool("editar_lancamento", "Editou lançamento",
  "Altera campos de um lançamento existente (pelo id, obtido em listar_lancamentos). Só os campos informados mudam.",
  { id: S, tipo: KIND, valor: N, data: DATE, descricao: S, categoria: S, conta: S, pessoa: S, forma_pagamento: PAYMENT }, ["id"],
  z.object({ id: z.string().uuid(), tipo: kind.optional(), valor: money.optional(), data: date.optional(), descricao: z.string().optional(), categoria: z.string().optional(), conta: z.string().optional(), pessoa: z.string().optional(), forma_pagamento: payment.optional() }),
  true,
  async (i, ctx) => {
    const r = await registry(ctx);
    const patch: Record<string, unknown> = {};
    if (i.tipo) patch.kind = i.tipo;
    if (i.valor) patch.amount = i.valor;
    if (i.data) patch.occurred_on = i.data;
    if (i.descricao !== undefined) patch.description = i.descricao;
    if (i.categoria) patch.category_id = findCategory(r, i.categoria, i.tipo).id;
    if (i.conta) patch.account_id = findAccount(r, i.conta).id;
    if (i.pessoa) patch.member_id = findMember(r, i.pessoa).user_id;
    if (i.forma_pagamento) patch.payment_method = i.forma_pagamento;
    const { data, error } = await ctx.supabase.from("transactions").update(patch).eq("id", i.id).select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error("Lançamento não encontrado.");
    return { ok: true };
  });

tool("excluir_lancamento", "Excluiu lançamento",
  "Exclui um lançamento pelo id. Com `todas_as_parcelas: true` exclui o parcelamento inteiro. SÓ chame depois que a pessoa confirmou explicitamente a exclusão nesta conversa.",
  { id: S, todas_as_parcelas: { type: "boolean" } }, ["id"],
  z.object({ id: z.string().uuid(), todas_as_parcelas: z.boolean().optional() }), true,
  async ({ id, todas_as_parcelas }, ctx) => {
    if (todas_as_parcelas) {
      const { data: t } = await ctx.supabase.from("transactions").select("installment_group").eq("id", id).single();
      if (!t?.installment_group) throw new Error("Esse lançamento não é parcelado.");
      const { data, error } = await ctx.supabase.from("transactions").delete().eq("installment_group", t.installment_group).select("id");
      if (error) throw new Error(error.message);
      return { ok: true, excluidos: data?.length ?? 0 };
    }
    const { data, error } = await ctx.supabase.from("transactions").delete().eq("id", id).select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error("Lançamento não encontrado.");
    return { ok: true, excluidos: 1 };
  });

tool("criar_recorrente", "Criou recorrente",
  "Cria um lançamento que se repete todo mês no mesmo dia (salário, aluguel, assinaturas). As ocorrências até hoje são geradas na hora; as futuras entram sozinhas.",
  { tipo: KIND, valor: N, dia: { ...N, description: "dia do mês 1-31" }, descricao: S, categoria: S, conta: S, pessoa: S, forma_pagamento: PAYMENT,
    inicio: { ...DATE, description: "padrão = hoje" }, fim: { ...DATE, description: "opcional" } },
  ["tipo", "valor", "dia", "descricao", "categoria"],
  z.object({ tipo: kind, valor: money, dia: z.coerce.number().int().min(1).max(31), descricao: z.string(), categoria: z.string(), conta: z.string().optional(), pessoa: z.string().optional(), forma_pagamento: payment.optional(), inicio: date.optional(), fim: date.optional() }),
  true,
  async (i, ctx) => {
    const r = await registry(ctx);
    const id = await createRecurring(ctx.supabase, ctx.familyId, {
      kind: i.tipo, amount: i.valor, day_of_month: i.dia, start_date: i.inicio ?? localISODate(), end_date: i.fim ?? null, description: i.descricao,
      category_id: findCategory(r, i.categoria, i.tipo).id, account_id: i.conta ? findAccount(r, i.conta).id : null,
      member_id: i.pessoa ? findMember(r, i.pessoa).user_id : ctx.userId, payment_method: i.forma_pagamento ?? null,
    });
    return { ok: true, id };
  });

tool("editar_recorrente", "Editou recorrente",
  "Altera um recorrente (pelo id de listar_recorrentes): valor, dia, ativo (pausar/reativar) ou data de fim. Vale para as próximas ocorrências.",
  { id: S, valor: N, dia: N, ativo: { type: "boolean" }, fim: DATE, descricao: S }, ["id"],
  z.object({ id: z.string().uuid(), valor: money.optional(), dia: z.coerce.number().int().min(1).max(31).optional(), ativo: z.boolean().optional(), fim: date.optional(), descricao: z.string().optional() }),
  true,
  async (i, ctx) => {
    const patch: Record<string, unknown> = {};
    if (i.valor) patch.amount = i.valor;
    if (i.dia) patch.day_of_month = i.dia;
    if (i.ativo !== undefined) patch.active = i.ativo;
    if (i.fim) patch.end_date = i.fim;
    if (i.descricao) patch.description = i.descricao;
    const { data, error } = await ctx.supabase.from("recurring_transactions").update(patch).eq("id", i.id).select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error("Recorrente não encontrado.");
    return { ok: true };
  });

tool("excluir_recorrente", "Excluiu recorrente",
  "Exclui um recorrente (para de gerar novos; os já lançados ficam). SÓ chame após confirmação explícita.",
  { id: S }, ["id"], z.object({ id: z.string().uuid() }), true,
  async ({ id }, ctx) => {
    const { error } = await ctx.supabase.from("recurring_transactions").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

tool("definir_orcamento", "Definiu orçamento",
  "Define (ou remove, com valor 0) o limite mensal de uma categoria principal de gastos.",
  { categoria: S, valor: N, mes: { ...S, description: "AAAA-MM; padrão = mês atual" } }, ["categoria", "valor"],
  z.object({ categoria: z.string(), valor: z.coerce.number().min(0), mes: month.optional() }), true,
  async (i, ctx) => {
    const r = await registry(ctx);
    const c = findCategory(r, i.categoria, "expense");
    const root = c.parent_id ? r.categories.find((x) => x.id === c.parent_id)! : c;
    const match = { family_id: ctx.familyId, category_id: root.id, month: `${i.mes ?? localISODate().slice(0, 7)}-01` };
    const { error } = i.valor
      ? await ctx.supabase.from("budgets").upsert({ ...match, amount: i.valor }, { onConflict: "family_id,category_id,month" })
      : await ctx.supabase.from("budgets").delete().match(match);
    if (error) throw new Error(error.message);
    return { ok: true, categoria: root.name };
  });

tool("criar_investimento", "Criou investimento",
  "Cadastra um investimento novo, opcionalmente com o valor já aplicado.",
  { nome: S, tipo: { type: "string", enum: Object.keys(ASSET_TYPES) }, instituicao: S, valor_inicial: N }, ["nome", "tipo"],
  z.object({ nome: z.string(), tipo: z.enum(Object.keys(ASSET_TYPES) as [string, ...string[]]), instituicao: z.string().optional(), valor_inicial: z.coerce.number().min(0).optional() }), true,
  async (i, ctx) => {
    const { data, error } = await ctx.supabase.from("investments").insert({ family_id: ctx.familyId, name: i.nome, asset_type: i.tipo, institution: i.instituicao ?? null, current_value: i.valor_inicial ?? 0 }).select("id").single();
    if (error) throw new Error(error.message);
    if (i.valor_inicial) await ctx.supabase.from("investment_movements").insert({ investment_id: data.id, family_id: ctx.familyId, kind: "aporte", amount: i.valor_inicial, note: "Saldo inicial" });
    return { ok: true, id: data.id };
  });

async function findInvestment(ctx: ToolContext, name: string) {
  const { data } = await ctx.supabase.from("investments").select("id, name, current_value").eq("family_id", ctx.familyId);
  return findByName(data ?? [], name, (i) => [i.name], "Investimento");
}

tool("movimentar_investimento", "Movimentou investimento",
  "Registra aporte (soma ao valor), resgate (subtrai) ou provento (dividendo/juros recebido) em um investimento.",
  { investimento: { ...S, description: "nome" }, tipo: { type: "string", enum: ["aporte", "resgate", "provento"] }, valor: N, data: DATE }, ["investimento", "tipo", "valor"],
  z.object({ investimento: z.string(), tipo: z.enum(["aporte", "resgate", "provento"]), valor: money, data: date.optional() }), true,
  async (i, ctx) => {
    const inv = await findInvestment(ctx, i.investimento);
    const { error } = await ctx.supabase.from("investment_movements").insert({ investment_id: inv.id, family_id: ctx.familyId, kind: i.tipo, amount: i.valor, occurred_on: i.data ?? localISODate() });
    if (error) throw new Error(error.message);
    if (i.tipo !== "provento") {
      const value = Number(inv.current_value) + (i.tipo === "aporte" ? i.valor : -i.valor);
      await ctx.supabase.from("investments").update({ current_value: value }).eq("id", inv.id);
    }
    return { ok: true, investimento: inv.name };
  });

tool("atualizar_valor_investimento", "Atualizou investimento",
  "Atualiza o valor atual de um investimento (o que aparece no banco/corretora hoje).",
  { investimento: S, valor_atual: N }, ["investimento", "valor_atual"],
  z.object({ investimento: z.string(), valor_atual: z.coerce.number().min(0) }), true,
  async (i, ctx) => {
    const inv = await findInvestment(ctx, i.investimento);
    const { error } = await ctx.supabase.from("investments").update({ current_value: i.valor_atual, updated_value_at: localISODate() }).eq("id", inv.id);
    if (error) throw new Error(error.message);
    return { ok: true, investimento: inv.name };
  });

tool("criar_categoria", "Criou categoria",
  "Cria categoria. Com `dentro_de` vira subcategoria (herda tipo e cor do pai).",
  { nome: S, tipo: KIND, dentro_de: { ...S, description: "categoria pai (opcional)" }, cor: { ...S, description: "#rrggbb (opcional)" } }, ["nome"],
  z.object({ nome: z.string(), tipo: kind.optional(), dentro_de: z.string().optional(), cor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() }), true,
  async (i, ctx) => {
    const r = await registry(ctx);
    const parent = i.dentro_de ? findCategory(r, i.dentro_de) : null;
    const k = parent?.kind ?? i.tipo;
    if (!k) throw new Error("Informe o tipo (ganho ou gasto) para categoria principal.");
    const { error } = await ctx.supabase.from("categories").insert({ family_id: ctx.familyId, name: i.nome, kind: k, color: parent?.color ?? i.cor ?? "#8a94a6", parent_id: parent?.id ?? null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

tool("criar_conta", "Criou conta",
  "Cadastra conta bancária, dinheiro ou cartão de crédito. Para cartão informe fechamento, vencimento, limite e a conta que paga a fatura.",
  { nome: S, tipo: { type: "string", enum: Object.keys(ACCOUNT_KINDS) }, saldo_inicial: N, fechamento: N, vencimento: N, limite: N, paga_pela_conta: S }, ["nome", "tipo"],
  z.object({ nome: z.string(), tipo: z.enum(Object.keys(ACCOUNT_KINDS) as [string, ...string[]]), saldo_inicial: z.coerce.number().optional(), fechamento: z.coerce.number().int().min(1).max(31).optional(), vencimento: z.coerce.number().int().min(1).max(31).optional(), limite: z.coerce.number().min(0).optional(), paga_pela_conta: z.string().optional() }), true,
  async (i, ctx) => {
    const r = await registry(ctx);
    const { error } = await ctx.supabase.from("accounts").insert({
      family_id: ctx.familyId, name: i.nome, kind: i.tipo, initial_balance: i.saldo_inicial ?? 0,
      closing_day: i.fechamento ?? null, due_day: i.vencimento ?? null, credit_limit: i.limite ?? null,
      pay_from_account_id: i.paga_pela_conta ? findAccount(r, i.paga_pela_conta).id : null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- exportação ----------

export const TOOLS: Anthropic.Beta.BetaTool[] = defs.map((d) => d.tool);

export async function runTool(name: string, input: unknown, ctx: ToolContext) {
  const def = defs.find((d) => d.tool.name === name);
  if (!def) return { isError: true, content: `Ferramenta desconhecida: ${name}`, mutates: false, label: name };
  const parsed = def.schema.safeParse(input ?? {});
  if (!parsed.success) {
    return { isError: true, content: `Entrada inválida: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`, mutates: false, label: def.label };
  }
  try {
    const result = await def.run(parsed.data as never, ctx);
    return { isError: false, content: JSON.stringify(result), mutates: def.mutates, label: def.label };
  } catch (e) {
    return { isError: true, content: (e as Error).message, mutates: false, label: def.label };
  }
}
