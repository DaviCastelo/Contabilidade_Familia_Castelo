"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ReceiptText, Target, TrendingUp, Settings } from "lucide-react";

const LINKS = [
  { href: "/", label: "Painel", icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lançamentos", icon: ReceiptText },
  { href: "/orcamento", label: "Orçamento", icon: Target },
  { href: "/investimentos", label: "Investimentos", icon: TrendingUp },
  { href: "/configuracoes", label: "Ajustes", icon: Settings },
];

export function TopNav() {
  const path = usePathname();
  return (
    <nav aria-label="Principal" className="hidden gap-1 md:flex">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm transition-colors duration-150 ${active ? "bg-sunken font-medium text-ink" : "text-muted hover:bg-sunken hover:text-ink"}`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barra fixa no rodapé, só no celular — como em app de banco. */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-md justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "font-medium text-accent" : "text-muted"}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
