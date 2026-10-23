"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { brl } from "@/lib/format";

const fmt = (v: unknown) => brl(Number(v));
const tooltipStyle = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)" },
  itemStyle: { color: "var(--ink)" },
  labelStyle: { color: "var(--muted)" },
};
const legendStyle = { color: "var(--muted)", fontSize: 12 };
const axisProps = { tickLine: false, axisLine: false, tick: { fill: "var(--muted)" } } as const;
const compact = (v: number) => `R$ ${Number(v).toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 })}`;

type Slice = { name: string; color: string; value: number };

/** Mantém as 5 maiores fatias e junta o resto em "Outros": acima de 6 a pizza fica ilegível. */
function topSlices(data: Slice[], max = 6): Slice[] {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  if (sorted.length <= max) return sorted;
  const rest = sorted.slice(max - 1).reduce((s, d) => s + d.value, 0);
  return [...sorted.slice(0, max - 1), { name: "Outros", color: "#a8a29e", value: rest }];
}

/** Pizza + legenda própria com valor e porcentagem (não depende só da cor). */
export function DonutWithLegend({ data }: { data: Slice[] }) {
  const slices = topSlices(data);
  const total = slices.reduce((s, d) => s + d.value, 0);
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
      <div className="relative mx-auto h-[180px] w-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="var(--surface)">
              {slices.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={fmt} {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] text-muted uppercase">Total</span>
          <span className="money text-sm font-medium">{compact(total)}</span>
        </div>
      </div>
      <ul className="ledger text-sm">
        {slices.map((d) => (
          <li key={d.name} className="flex items-center gap-2 py-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="money text-muted">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            <span className="money w-28 text-right">{brl(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MonthlyBars({ data }: { data: { mes: string; Ganhos: number; Gastos: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="mes" fontSize={12} {...axisProps} />
        <YAxis fontSize={11} width={64} tickFormatter={compact} {...axisProps} />
        <Tooltip formatter={fmt} cursor={{ fill: "var(--sunken)" }} {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={legendStyle} />
        <Bar dataKey="Ganhos" fill="var(--gain)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Gastos" fill="var(--loss)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Evolução do valor da carteira mês a mês. */
export function PatrimonyLine({ data }: { data: { mes: string; valor: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="patrimony" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gain)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--gain)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="mes" fontSize={12} {...axisProps} />
        <YAxis fontSize={11} width={64} tickFormatter={compact} domain={["auto", "auto"]} {...axisProps} />
        <Tooltip formatter={fmt} {...tooltipStyle} />
        <Area type="monotone" dataKey="valor" name="Carteira" stroke="var(--gain)" strokeWidth={2} fill="url(#patrimony)" dot={{ r: 3, fill: "var(--gain)" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export const ALLOCATION_COLORS = ["#2f6b4f", "#a8471f", "#c08a2e", "#4a6fa5", "#7a5c8a", "#5f8a7a", "#78716c"];
