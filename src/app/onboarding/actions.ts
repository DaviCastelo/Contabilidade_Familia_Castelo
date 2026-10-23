"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createFamily(_: { error: string } | null, formData: FormData): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_family", {
    family_name: String(formData.get("family_name")),
    member_name: String(formData.get("member_name")),
  });
  if (error) return { error: error.message };
  redirect("/");
}

export async function joinFamily(_: { error: string } | null, formData: FormData): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_family", {
    code: String(formData.get("code")),
    member_name: String(formData.get("member_name")),
  });
  if (error) return { error: error.message };
  redirect("/");
}
