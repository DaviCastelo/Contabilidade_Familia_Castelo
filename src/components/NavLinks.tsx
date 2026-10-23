"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Ellipsis, LayoutDashboard, ReceiptText, Settings, Sparkles, Target, TrendingUp } from "lucide-react";

const LINKS = [
  { href: "/", label: "Painel", icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lançamentos", icon: ReceiptText },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/orcamento", label: "Orçamento", icon: Target },
  { href: "/investimentos", label: "Investimentos", icon: TrendingUp },
  { href: "/assistente", label: "Assistente", icon: Sparkles },
  { href: "/configuracoes", label: "Ajustes", icon: Settings },
];

/** No celular cabem 5: o resto fica em "Mais". */
const MOBILE = [
  LINKS[0], LINKS[1], LINKS[5], LINKS[2],
  { href: "/mais", label: "Mais", icon: Ellipsis, matches: ["/mais", "/orcamento", "/investimentos", "/configuracoes", "/recorrentes"] },
];

const isActive = (path: string, href: string, matches?: string[]) =>
  matches ? matches.includes(path) : href === "/" ? path === "/" : path.startsWith(href);

export function TopNav() {
  const path = usePathname();
  return (
    <nav aria-label="Principal" className="hidden gap-0.5 md:flex">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(path, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            title={label}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors duration-150 xl:px-3 ${active ? "bg-sunken font-medium text-ink" : "text-muted hover:bg-sunken hover:text-ink"}`}
          >
            <Icon className={`h-4 w-4 ${href === "/assistente" ? "text-gold" : ""}`} aria-hidden />
            {/* até 1280px só ícones (nome no tooltip e para leitores de tela) */}
            <span className="sr-only xl:not-sr-only">{label}</span>
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
        {MOBILE.map(({ href, label, icon: Icon, ...rest }) => {
          const active = isActive(path, href, "matches" in rest ? rest.matches : undefined);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "font-medium text-accent" : "text-muted"}`}
              >
                <Icon className={`h-5 w-5 ${href === "/assistente" && !active ? "text-gold" : ""}`} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
