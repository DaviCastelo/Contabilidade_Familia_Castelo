"use client";

import { useState } from "react";
import CategoryIcon from "@/components/CategoryIcon";
import IconPicker from "@/components/IconPicker";
import Modal from "@/components/Modal";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { updateCategory } from "../actions";

type Cat = { id: string; name: string; color: string; icon: string | null; parent_id: string | null };

/** Ícone clicável na lista de categorias: abre o editor de nome, cor e ícone. */
export default function CategoryEditor({ category }: { category: Cat }) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(category.color);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="cursor-pointer rounded-lg transition-transform duration-150 hover:scale-105" aria-label={`Editar categoria ${category.name}`}>
        <CategoryIcon icon={category.icon} color={category.color} size="sm" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar categoria">
        <ActionForm action={updateCategory} reset={false} onSuccess={() => setOpen(false)} className="space-y-4">
          <input type="hidden" name="id" value={category.id} />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Nome"><input name="name" defaultValue={category.name} required className="input" data-autofocus /></Field>
            <Field label={category.parent_id ? "Cor (vem do grupo)" : "Cor"}>
              <input name="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={!!category.parent_id} className="input h-11 w-20 cursor-pointer p-1 disabled:cursor-not-allowed disabled:opacity-60" />
            </Field>
          </div>
          <IconPicker defaultValue={category.icon} color={color} />
          <SubmitButton className="btn w-full sm:w-auto">Salvar categoria</SubmitButton>
        </ActionForm>
      </Modal>
    </>
  );
}
