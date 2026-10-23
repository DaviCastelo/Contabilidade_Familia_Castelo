import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { brl } from "@/lib/format";

/** Valor com sinal em ícone + texto, para não depender só da cor. */
export default function Amount({ kind, value, className = "" }: { kind: "income" | "expense"; value: number; className?: string }) {
  const income = kind === "income";
  const Icon = income ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`money inline-flex items-center gap-1 font-medium whitespace-nowrap ${income ? "text-gain" : "text-loss"} ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{income ? "Ganho de" : "Gasto de"}</span>
      {brl(value)}
    </span>
  );
}
