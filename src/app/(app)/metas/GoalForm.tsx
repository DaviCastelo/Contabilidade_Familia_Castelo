"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import IconPicker from "@/components/IconPicker";
import Modal from "@/components/Modal";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { saveGoal } from "./actions";

type Inv = { id: string; name: string };
type Goal = { id: string; name: string; icon: string; color: string; target: number | null; targetDate: string | null; investmentId: string | null };

function Fields({ goal, investments }: { goal?: Goal; investments: Inv[] }) {
  const [color, setColor] = useState(goal?.color ?? "#c79a2b");
  return (
    <>
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Nome da meta"><input name="name" defaultValue={goal?.name} required placeholder="Ex: Viagem para o Nordeste" className="input" data-autofocus /></Field>
        <Field label="Cor"><input name="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="input h-11 w-20 cursor-pointer p-1" /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Quanto quer juntar (R$)">
          <input name="target_amount" type="number" inputMode="decimal" step="0.01" min="0" defaultValue={goal?.target ?? ""} required className="input money" placeholder="0,00" />
        </Field>
        <Field label="Até quando (opcional)"><input name="target_date" type="date" defaultValue={goal?.targetDate ?? ""} className="input" /></Field>
        <Field label="Acompanhar investimento">
          <select name="investment_id" defaultValue={goal?.investmentId ?? ""} className="input">
            <option value="">Não, vou registrar depósitos</option>
            {investments.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </Field>
      </div>
      <IconPicker defaultValue={goal?.icon ?? "flag"} color={color} />
    </>
  );
}

export function NewGoal({ investments }: { investments: Inv[] }) {
  return (
    <ActionForm action={saveGoal} className="card space-y-4">
      <h2 className="display text-lg font-semibold">Nova meta</h2>
      <Fields investments={investments} />
      <SubmitButton className="btn">Criar meta</SubmitButton>
    </ActionForm>
  );
}

export function EditGoal({ goal, investments }: { goal: Goal; investments: Inv[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label={`Editar meta ${goal.name}`}><Pencil className="h-4 w-4" aria-hidden /></button>
      <Modal open={open} onClose={() => setOpen(false)} title="Editar meta">
        <ActionForm action={saveGoal} reset={false} onSuccess={() => setOpen(false)} className="space-y-4">
          <Fields goal={goal} investments={investments} />
          <SubmitButton className="btn">Salvar meta</SubmitButton>
        </ActionForm>
      </Modal>
    </>
  );
}
