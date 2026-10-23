"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "comprovantes";
const MAX_BYTES = 10 * 1024 * 1024;

/** Fotos grandes do celular viram JPEG de até 1600px (alguns centos de KB). PDF e HEIC vão como estão. */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/heic") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.82));
  } catch {
    return file;
  }
}

/** Envia o comprovante para <familia>/<id>.<ext> e devolve o caminho salvo no lançamento. */
export async function uploadReceipt(file: File, familyId: string) {
  const blob = await shrink(file);
  if (blob.size > MAX_BYTES) throw new Error("Arquivo maior que 10 MB.");
  const ext = blob.type === "application/pdf" ? "pdf" : blob.type === "image/heic" ? "heic" : blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${familyId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient().storage.from(BUCKET).upload(path, blob, { contentType: blob.type || "application/octet-stream" });
  if (error) throw new Error(error.message);
  return path;
}

/** Abre o comprovante com um link temporário (o bucket é privado). */
export async function openReceipt(path: string) {
  const win = window.open("", "_blank"); // abre já no clique para o navegador não bloquear
  const { data, error } = await createClient().storage.from(BUCKET).createSignedUrl(path, 120);
  if (error || !data) { win?.close(); throw new Error("Não foi possível abrir o comprovante."); }
  if (win) win.location.href = data.signedUrl; else window.location.href = data.signedUrl;
}
