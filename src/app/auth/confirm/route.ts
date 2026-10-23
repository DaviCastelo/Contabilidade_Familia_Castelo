import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Links dos e-mails (confirmar conta, nova senha) no formato token_hash.
 * Diferente do /auth/callback (PKCE), funciona mesmo abrindo o e-mail em outro
 * navegador ou aparelho. Templates: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=...
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? "/redefinir-senha" : "/";
  const next = searchParams.get("next") ?? fallback;
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : fallback;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}/login?erro=link`);
}
