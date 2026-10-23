import Link from "next/link";
import { ChevronRight, Repeat, Settings, Target, TrendingUp } from "lucide-react";
// o que não cabe na barra do celular (fica aqui, não no componente de cliente: página do servidor não lê exports dele)
const MORE_LINKS = [
  { href: "/orcamento", label: "Orçamento", description: "Limites por categoria", icon: Target },
  { href: "/investimentos", label: "Investimentos", description: "Carteira, aportes e rendimento", icon: TrendingUp },
  { href: "/recorrentes", label: "Recorrentes", description: "Salário, aluguel e assinaturas", icon: Repeat },
  { href: "/configuracoes", label: "Ajustes", description: "Família, contas e categorias", icon: Settings },
];

export default function MaisPage() {
  return (
    <div className="space-y-5">
      <h1 className="display text-3xl font-semibold">Mais</h1>
      <ul className="card ledger p-0">
        {MORE_LINKS.map((l) => {
          const Icon = l.icon;
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
