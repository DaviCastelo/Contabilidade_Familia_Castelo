import Image from "next/image";
import Logo from "./Logo";

/**
 * Telas sem login: ilustração do castelo à esquerda (no celular vira cabeçalho)
 * e o formulário à direita. O céu escuro da imagem recebe o texto em creme.
 */
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[1.1fr_1fr]">
      <aside className="relative h-64 overflow-hidden bg-[#0a1120] md:sticky md:top-0 md:h-screen">
        <Image
          src="/login.jpg"
          alt="Ilustração de um castelo iluminado no alto de uma colina, sob o céu noturno"
          fill
          priority
          sizes="(min-width: 768px) 55vw, 100vw"
          className="object-cover object-[center_78%] md:object-bottom"
        />
        {/* véu do céu: garante leitura do texto mesmo em telas baixas, onde o castelo sobe */}
        <div className="absolute inset-x-0 top-0 h-3/5 bg-gradient-to-b from-[#0a1120]/90 via-[#0a1120]/55 to-transparent" aria-hidden />
        <div className="relative flex h-full flex-col gap-[7vh] p-6 text-[#f6f4ef] md:p-12">
          <div className="flex items-center gap-3">
            <Logo size={44} className="rounded-xl ring-1 ring-[#e3b651]/30" />
            <span className="display text-xl font-semibold tracking-tight">Família Castelo</span>
          </div>
          <div className="hidden max-w-md space-y-3 md:block">
            <p className="display text-3xl leading-tight font-semibold lg:text-4xl xl:text-5xl">
              O patrimônio da família, <span className="text-[#e3b651]">guardado como num castelo.</span>
            </p>
            <p className="text-[#c9d2e3]">Gastos, ganhos, orçamento e investimentos de todos em um só lugar.</p>
          </div>
        </div>
      </aside>

      <main className="relative -mt-6 flex items-start justify-center rounded-t-3xl bg-paper px-5 pt-8 pb-12 md:mt-0 md:items-center md:rounded-none md:px-12">
        <div className="rise w-full max-w-sm space-y-7">
          <div className="space-y-1.5">
            <h1 className="display text-3xl font-semibold">{title}</h1>
            {subtitle && <p className="text-muted">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
