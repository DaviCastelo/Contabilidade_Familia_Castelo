"use client";

import { Copy } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function CopyCode({ code }: { code: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(code).then(() => toast("ok", "Código copiado."))}
      className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line bg-sunken px-4 font-mono text-lg tracking-[0.3em] transition-colors duration-150 hover:border-accent"
      aria-label={`Copiar código de convite ${code}`}
    >
      {code}
      <Copy className="h-4 w-4 text-muted" aria-hidden />
    </button>
  );
}
