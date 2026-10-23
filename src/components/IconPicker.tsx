"use client";

import { useState } from "react";
import { ICONS, ICON_KEYS } from "./CategoryIcon";

/** Grade de ícones como radio buttons (acessível por teclado); envia `name` no formulário. */
export default function IconPicker({ name = "icon", defaultValue, color }: { name?: string; defaultValue?: string | null; color?: string }) {
  const [value, setValue] = useState(defaultValue ?? "tag");
  return (
    <fieldset>
      <legend className="label">Ícone</legend>
      <div className="grid max-h-48 grid-cols-7 gap-1.5 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-9">
        {ICON_KEYS.map((key) => {
          const Icon = ICONS[key];
          const active = value === key;
          return (
            <label key={key} title={key} className={`flex h-10 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold ${active ? "bg-sunken ring-2 ring-gold" : "hover:bg-sunken"}`}>
              <input type="radio" name={name} value={key} checked={active} onChange={() => setValue(key)} className="sr-only" />
              <Icon className="h-5 w-5" style={{ color: active ? color : undefined }} aria-hidden />
              <span className="sr-only">{key}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
