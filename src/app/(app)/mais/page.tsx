import Link from "next/link";
import { ChevronRight, Repeat, Settings, Target, TrendingUp } from "lucide-react";
import { MORE_LINKS } from "@/components/NavLinks";

const ICONS = { "/orcamento": Target, "/investimentos": TrendingUp, "/recorrentes": Repeat, "/configuracoes": Settings } as const;

export default function MaisPage() {
  return (
    <div className="space-y-5">
      <h1 className="display text-3xl font-semibold">Mais</h1>
      <ul className="card ledger p-0">
        {MORE_LINKS.map((l) => {
          const Icon = ICONS[l.href as keyof typeof ICONS];
          return (
            <li key={l.href}>
              <Link href={l.href} className="flex min-h-16 items-center gap-3 px-4 hover:bg-sunken/60">
                <Icon className="h-5 w-5 text-gold" aria-hidden />
                <span className="flex-1">
                  <span className="block font-medium">{l.label}</span>
                  <span className="block text-xs text-muted">{l.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
