/**
 * As três animações de carregamento do Família Castelo:
 * 1. Construção (CastleBuild): o castelo é desenhado — para ações que "constroem" algo (entrar, criar a família).
 * 2. Prosperidade (ProsperityOrbit): aura e moedas em órbita — para esperas sem duração conhecida.
 * 3. Luz & Progresso (CastleLights): janelas acendem conforme o progresso real — para o splash de abertura.
 */

export function CastleBuild({ size = 192 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="fc-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c79a2b" />
            <stop offset="100%" stopColor="#e3b651" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="none" stroke="#1d3b6a" strokeWidth="2" />
        <circle className="fc-ring" cx="50" cy="50" r="45" fill="none" stroke="url(#fc-gold)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <svg className="fc-glow" style={{ width: size * 0.58, height: size * 0.58 }} viewBox="0 0 100 100" fill="none">
        <g className="fc-castle-path" stroke="#e3b651" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 85 H80 M25 85 V55 H75 V85" />
          <path d="M20 55 V40 H32 V55" />
          <path d="M68 55 V40 H80 V55" />
          <path d="M38 55 V28 H62 V55" />
          <path d="M38 28 V22 H44 V25 H50 V22 H56 V25 H62 V22" />
          <path d="M44 85 V68 C44 64.5 56 64.5 56 68 V85" />
        </g>
        <g className="fc-castle-fill">
          <rect x="26" y="42" width="5" height="10" rx="1" fill="#e3b651" />
          <rect x="69" y="42" width="5" height="10" rx="1" fill="#e3b651" />
          <circle cx="50" cy="40" r="3" fill="#f6f4ef" />
          <polygon points="50,12 50,22 58,17" fill="#e3b651" />
          <line x1="50" y1="12" x2="50" y2="22" stroke="#e3b651" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}

/** `sm` (40px) cabe em uma linha de texto, como no "Pensando…" do assistente. */
export function ProsperityOrbit({ size = "lg" }: { size?: "sm" | "lg" }) {
  if (size === "sm") {
    return (
      <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden>
        <span className="fc-aura absolute inset-0 rounded-full bg-gold/25" />
        <span className="fc-orbit absolute inset-0">
          <span className="absolute top-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gold" />
        </span>
        <MiniCastle className="relative h-3.5 w-3.5 text-gold" />
      </span>
    );
  }
  return (
    <div className="relative flex h-52 w-52 items-center justify-center" aria-hidden>
      <div className="fc-aura absolute h-36 w-36 rounded-full bg-[radial-gradient(circle,rgb(199_154_43/0.35),rgb(199_154_43/0.08)_60%,transparent_75%)]" />
      <div className="fc-orbit absolute inset-0">
        <Coin className="absolute top-2 left-1/2 h-7 w-7 -translate-x-1/2 text-[10px]" />
        <Coin className="absolute bottom-4 left-6 h-5 w-5 text-[8px]" delay="0.5s" />
        <svg className="fc-twinkle absolute top-1/3 right-3 h-5 w-5 text-[#e3b651]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
        </svg>
      </div>
      <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-3xl border border-[#c79a2b]/40 bg-[#0a1120]/90 p-4 shadow-2xl" style={{ filter: "drop-shadow(0 0 25px rgb(227 182 81 / 0.5))" }}>
        <svg className="h-full w-full text-[#c79a2b]" viewBox="0 0 100 100" fill="none" stroke="currentColor">
          <path d="M15 85H85" strokeWidth="4" strokeLinecap="round" />
          <path d="M22 85V50H78V85" strokeWidth="3" fill="#13294b" />
          <path d="M35 50V28H65V50" strokeWidth="3" fill="#13294b" />
          <path d="M35 28V20H43V24H50V20H57V24H65V20" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M42 85V66C42 61.5 58 61.5 58 66V85" strokeWidth="3" fill="#e3b651" />
          <circle cx="50" cy="40" r="4" fill="#f6f4ef" stroke="none" />
        </svg>
      </div>
    </div>
  );
}

function Coin({ className, delay }: { className: string; delay?: string }) {
  return (
    <span className={`fc-coin fc-glow flex items-center justify-center rounded-full border border-[#f6f4ef]/60 bg-gradient-to-tr from-[#a37b1e] to-[#e3b651] font-black text-[#13294b] ${className}`} style={{ animationDelay: delay }}>
      $
    </span>
  );
}

function MiniCastle({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor">
      <path d="M25 85 V55 H75 V85 H25 Z M20 55 V40 H32 V55 H20 Z M68 55 V40 H80 V55 H68 Z M38 55 V28 H62 V55 H38 Z" />
    </svg>
  );
}

/** Castelo cujas janelas acendem de baixo para cima conforme `progress` (0–100). */
export function CastleLights({ progress, size = 144 }: { progress: number; size?: number }) {
  const on = (min: number) => String(progress >= min);
  return (
    <div className="relative" style={{ width: size, height: size }} aria-hidden>
      <svg className="h-full w-full" viewBox="0 0 100 100">
        <path d="M15 88 H85 V82 H80 V52 L75 52 V42 H68 V52 H62 V30 H68 V22 H58 V25 H52 V22 H48 V25 H42 V22 H32 V30 H38 V52 H32 V42 H25 V52 L20 52 V82 H15 Z" fill="#0a1120" stroke="#c79a2b" strokeWidth="2" />
        <rect className="fc-window" data-on={on(20)} x="27" y="60" width="6" height="10" rx="3" />
        <rect className="fc-window" data-on={on(40)} x="67" y="60" width="6" height="10" rx="3" />
        <rect className="fc-window" data-on={on(60)} x="43" y="42" width="5" height="9" rx="2.5" />
        <rect className="fc-window" data-on={on(75)} x="52" y="42" width="5" height="9" rx="2.5" />
        <circle className="fc-window" data-on={on(90)} cx="50" cy="32" r="3.5" />
        <path className="fc-door" data-on={on(100)} d="M43 88 V72 C43 68 57 68 57 72 V88 Z" />
      </svg>
      <svg className={`absolute top-1 left-[52%] h-4 w-4 text-[#e3b651] transition-opacity duration-500 ${progress >= 100 ? "opacity-100" : "opacity-0"}`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L15 8L21 9L16.5 14L18 20L12 17L6 20L7.5 14L3 9L9 8L12 2Z" />
      </svg>
    </div>
  );
}

/** Check (sucesso) ou X (erro) desenhado, como nos estados finais das telas de carregamento. */
export function StatusMark({ kind }: { kind: "success" | "error" }) {
  const ok = kind === "success";
  return (
    <span className={`fc-swap flex h-12 w-12 items-center justify-center rounded-full border ${ok ? "border-[#4a9b6b]/40 bg-[#387c54] shadow-[0_0_20px_rgb(56_124_84/0.4)]" : "border-loss/40 bg-loss/10 shadow-[0_0_20px_rgb(211_47_47/0.25)]"}`} aria-hidden>
      <svg className={`h-6 w-6 ${ok ? "text-[#f6f4ef]" : "text-loss"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path className="fc-mark-path" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={ok ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
      </svg>
    </span>
  );
}
