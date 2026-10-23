import { getFamilyContext } from "@/lib/family";
import type { DisplayItem } from "@/lib/assistant/agent";
import Chat from "./Chat";

export default async function AssistentePage() {
  const { supabase, user } = await getFamilyContext();
  // retoma a conversa mais recente de quem está logado
  const { data } = await supabase.from("ai_conversations").select("id, display")
    .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();

  return <Chat initialId={data?.id ?? null} initialItems={(data?.display ?? []) as DisplayItem[]} ready={!!process.env.ANTHROPIC_API_KEY} />;
}
