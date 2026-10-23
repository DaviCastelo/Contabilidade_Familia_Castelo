"use client";

import { useEffect, useRef, useState } from "react";
import { CastleLights, StatusMark } from "./Animations";

const KEY = "fc-splash";

/** Marca a sessão para o splash não reaparecer (também chamado após o login, que já tem animação própria). */
export function markSplashSeen() {
  try { sessionStorage.setItem(KEY, "1"); } catch {}
  document.documentElement.setAttribute("data-splash-done", "");
}

/** Roda antes da primeira pintura: se o splash já foi visto nesta sessão, o CSS o esconde sem piscar. */
export const splashGuardScript = `try{if(sessionStorage.getItem("${KEY}"))document.documentElement.setAttribute("data-splash-done","")}catch(e){}`;

const stageText = (p: number) =>
  p < 45 ? "Abrindo os portões…" : p < 75 ? "Acendendo as luzes…" : p < 100 ? "Contando as moedas…" : "Tudo pronto";

/**
 * Splash de abertura (Luz & Progresso). O progresso segue etapas reais da carga da página:
 * hidratação (45%), fontes prontas (75%) e evento load (100%). A velocidade é limitada
 * para a animação ser legível (~1s), mas nunca passa da etapa real.
 */
export default function Splash({ name }: { name: string }) {
  const [progress, setProgress] = useState(8);
  const [phase, setPhase] = useState<"loading" | "welcome" | "leaving" | "gone">("loading");
  const target = useRef(8);

  useEffect(() => {
    if (document.documentElement.hasAttribute("data-splash-done") || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("gone");
      return;
    }
    target.current = 45;
    document.fonts?.ready.then(() => { target.current = Math.max(target.current, 75); });
    const onLoad = () => { target.current = 100; };
    if (document.readyState === "complete") onLoad(); else window.addEventListener("load", onLoad, { once: true });

    const id = window.setInterval(() => {
      setProgress((p) => (p < target.current ? Math.min(target.current, p + 2) : p));
    }, 16);
    return () => { window.clearInterval(id); window.removeEventListener("load", onLoad); };
  }, []);

  useEffect(() => {
    if (progress < 100 || phase !== "loading") return;
    const t1 = window.setTimeout(() => setPhase("welcome"), 600);
    return () => window.clearTimeout(t1);
  }, [progress, phase]);

  useEffect(() => {
    if (phase === "welcome") {
      const t = window.setTimeout(() => setPhase("leaving"), 900);
      return () => window.clearTimeout(t);
    }
    if (phase === "leaving") {
      markSplashSeen();
      const t = window.setTimeout(() => setPhase("gone"), 450);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  if (phase === "gone") return null;
  const first = name.split(" ")[0];

  return (
    <div
      role="status"
      aria-label="Carregando o app"
      className={`fc-splash fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#0a1120] px-6 text-center text-[#f6f4ef] ${phase === "leaving" ? "fc-fade-out" : ""}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgb(199_154_43/0.12),transparent_60%)]" aria-hidden />
      <div className="relative mb-6"><CastleLights progress={progress} size={160} /></div>
      <div className="relative flex min-h-28 flex-col items-center">
        {phase === "loading" ? (
          <>
            <p className="flex items-baseline gap-1 text-[#e3b651]">
              <span className="money text-4xl font-semibold tracking-tight">{progress}</span>
              <span className="text-sm font-semibold opacity-80">%</span>
            </p>
            <p className="mb-5 text-sm text-[#c9d2e3]">{stageText(progress)}</p>
            <div className="h-2.5 w-52 rounded-full border border-white/10 bg-[#13294b] p-0.5">
              <div className="h-full rounded-full bg-gradient-to-r from-[#c79a2b] via-[#e3b651] to-[#f6f4ef]" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <StatusMark kind="success" />
            <p className="fc-swap display text-2xl font-semibold">Bem-vindo, {first}</p>
          </div>
        )}
      </div>
      <p className="absolute bottom-8 text-[10px] font-semibold tracking-[0.3em] text-[#f6f4ef]/40 uppercase">Família Castelo</p>
    </div>
  );
}
