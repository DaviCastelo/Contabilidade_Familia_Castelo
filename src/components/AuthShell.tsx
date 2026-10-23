import Monogram from "./Monogram";

/** Moldura das telas sem login: papel com régua de livro-caixa ao fundo. */
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 31px, var(--line) 31px 32px)" }}
    >
      <div className="rise card w-full max-w-sm space-y-6 p-7 shadow-xl shadow-ink/5">
        <div className="space-y-3">
          <Monogram className="h-11 w-11" />
          <div>
            <h1 className="display text-2xl font-semibold">{title}</h1>
            {subtitle && <p className="text-muted">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
