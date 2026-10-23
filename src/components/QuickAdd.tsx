"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import Modal from "./Modal";
import TransactionForm from "@/app/(app)/lancamentos/TransactionForm";
import type { FormOptions } from "@/lib/family";

/** Botão "+" flutuante, presente em todas as telas, para lançar em poucos segundos. */
export default function QuickAdd({ options }: { options: FormOptions }) {
  const [open, setOpen] = useState(false);
  // no chat do assistente o botão cobriria o campo de mensagem
  if (usePathname() === "/assistente") return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Novo lançamento"
        className="fixed right-4 bottom-20 z-40 inline-flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg shadow-ink/20 transition-colors duration-150 hover:bg-accent-hover md:right-8 md:bottom-8"
      >
        <Plus className="h-6 w-6" aria-hidden />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo lançamento">
        <TransactionForm options={options} card={false} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
