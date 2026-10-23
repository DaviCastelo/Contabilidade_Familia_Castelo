import { ProsperityOrbit } from "./Animations";

/** Prosperidade em página inteira: para telas que fazem contas pesadas (faturas, carteira). */
export default function PageLoading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div role="status" aria-label={title} className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <ProsperityOrbit />
      <p className="mt-4 text-base font-semibold tracking-[0.12em] uppercase">{title}</p>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </div>
  );
}
