/** Esqueleto mostrado enquanto a página carrega (troca de mês, navegação). */
export default function Loading() {
  const block = "animate-pulse rounded-xl bg-sunken";
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className={`${block} h-3 w-24`} />
          <div className={`${block} h-8 w-56`} />
        </div>
        <div className={`${block} h-11 w-48`} />
      </div>
      <div className={`${block} h-24`} />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className={`${block} h-24`} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${block} h-72`} />
        <div className={`${block} h-72`} />
      </div>
    </div>
  );
}
