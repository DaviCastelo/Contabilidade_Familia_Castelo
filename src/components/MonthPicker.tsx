"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const shift = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const path = usePathname();
  const go = (m: string) => router.push(`${path}?mes=${m}`);
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="icon-btn" onClick={() => go(shift(month, -1))} aria-label="Mês anterior">
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <input
        type="month"
        value={month}
        aria-label="Escolher mês"
        onChange={(e) => e.target.value && go(e.target.value)}
        className="input w-auto"
      />
      <button type="button" className="icon-btn" onClick={() => go(shift(month, 1))} aria-label="Próximo mês">
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
