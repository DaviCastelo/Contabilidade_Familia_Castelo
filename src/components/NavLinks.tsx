"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Painel" },
  { href: "/lancamentos", label: "Lançamentos" },
  { href: "/orcamento", label: "Orçamento" },
  { href: "/investimentos", label: "Investimentos" },
  { href: "/configuracoes", label: "Configurações" },
];

export default function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-lg px-3 py-1.5 text-sm ${path === l.href ? "bg-emerald-50 font-medium text-emerald-700" : "text-slate-600 hover:bg-slate-100"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
