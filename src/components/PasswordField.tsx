"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Circle } from "lucide-react";

/** Mesmas regras configuradas no Supabase (Authentication → Email): 8+ caracteres, maiúscula, minúscula, número e símbolo. */
export const PASSWORD_RULES = [
  { label: "8 caracteres ou mais", test: (p: string) => p.length >= 8 },
  { label: "Letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { label: "Número", test: (p: string) => /\d/.test(p) },
  { label: "Símbolo (!@#$…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

/** Campo de senha nova com checklist ao vivo; o navegador não deixa enviar enquanto faltar algo. */
export default function PasswordField({ name = "password", label = "Senha" }: { name?: string; label?: string }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const missing = PASSWORD_RULES.filter((r) => !r.test(value));

  useEffect(() => {
    ref.current?.setCustomValidity(missing.length ? `A senha precisa de: ${missing.map((m) => m.label.toLowerCase()).join(", ")}.` : "");
  }, [missing]);

  return (
    <div>
      <label className="block">
        <span className="label">{label}</span>
        <input
          ref={ref}
          name={name}
          type="password"
          autoComplete="new-password"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-describedby={`${name}-rules`}
          className="input"
        />
      </label>
      <ul id={`${name}-rules`} className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs" aria-label="Requisitos da senha">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(value);
          return (
            <li key={r.label} className={`flex items-center gap-1.5 transition-colors duration-150 ${ok ? "text-gain" : "text-muted"}`}>
              {ok ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Circle className="h-3 w-3" aria-hidden />}
              {r.label}
              <span className="sr-only">{ok ? "(ok)" : "(falta)"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
