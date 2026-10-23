import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { AssistantError, runAssistantTurn, type DisplayItem } from "@/lib/assistant/agent";

export const maxDuration = 120;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Faça login de novo." }, 401);

  const { data: me } = await supabase.from("family_members").select("family_id, display_name").eq("user_id", user.id).limit(1).maybeSingle();
  if (!me) return json({ error: "Você ainda não está em uma família." }, 403);

  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: "O assistente ainda não foi configurado: falta a chave ANTHROPIC_API_KEY na Vercel." }, 503);
  }

  const body = await request.json().catch(() => null) as { conversationId?: string | null; message?: string } | null;
  const message = body?.message?.trim();
  if (!message) return json({ error: "Escreva uma mensagem." }, 400);
  if (message.length > 4000) return json({ error: "Mensagem longa demais." }, 400);

  // conversa existente (do próprio usuário, garantido pelo RLS) ou uma nova
  let conversation: { id: string; messages: Anthropic.Beta.BetaMessageParam[]; display: DisplayItem[] };
  if (body?.conversationId) {
    const { data } = await supabase.from("ai_conversations").select("id, messages, display").eq("id", body.conversationId).maybeSingle();
    if (!data) return json({ error: "Conversa não encontrada." }, 404);
    conversation = data as typeof conversation;
  } else {
    const { data, error } = await supabase.from("ai_conversations").insert({ family_id: me.family_id }).select("id, messages, display").single();
    if (error) return json({ error: "Não foi possível iniciar a conversa." }, 500);
    conversation = data as typeof conversation;
  }
  if (conversation.messages.length > 300) {
    return json({ error: "Esta conversa ficou muito longa. Comece uma nova conversa.", conversationId: conversation.id }, 400);
  }

  const now = new Date().toISOString();
  try {
    const turn = await runAssistantTurn(conversation.messages, message, me.display_name, { supabase, familyId: me.family_id, userId: user.id });
    const display: DisplayItem[] = [
      ...conversation.display,
      { role: "user", text: message, at: now },
      { role: "assistant", text: turn.reply, actions: turn.actions, at: new Date().toISOString() },
    ];
    await supabase.from("ai_conversations").update({ messages: turn.messages, display, updated_at: new Date().toISOString() }).eq("id", conversation.id);
    return json({ conversationId: conversation.id, reply: turn.reply, actions: turn.actions, changed: turn.changed });
  } catch (e) {
    // o turno não é salvo no histórico da API; a conversa continua de onde estava
    let error = "O assistente teve um problema. Tente de novo em instantes.";
    if (e instanceof AssistantError) error = e.message;
    else if (e instanceof Anthropic.AuthenticationError) error = "A chave da API do Claude é inválida. Confira ANTHROPIC_API_KEY na Vercel.";
    else if (e instanceof Anthropic.RateLimitError) error = "Muitas mensagens seguidas. Espere um minuto e tente de novo.";
    else if (e instanceof Anthropic.APIError) error = `Erro na API do Claude (${e.status}). Tente de novo.`;
    console.error("assistente:", e);
    return json({ error, conversationId: conversation.id }, 502);
  }
}
