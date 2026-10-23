"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { brl } from "@/lib/format";

const fmt = (v: unknown) => brl(Number(v));
const tooltipStyle = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--ink)" },
  itemStyle: { color: "var(--ink)" },
  labelStyle: { color: "var(--muted)" },
};
const legendStyle = { color: "var(--muted)", fontSize: 12 };

export function CategoryPie({ data }: { data: { name: string; color: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={2} stroke="var(--surface)">
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip formatter={fmt} {...tooltipStyle} />
        <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={legendStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyBars({ data }: { data: { mes: string; Ganhos: number; Gastos: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "var(--muted)" }} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} width={72} tick={{ fill: "var(--muted)" }} tickFormatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
        <Tooltip formatter={fmt} cursor={{ fill: "var(--sunken)" }} {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={legendStyle} />
        <Bar dataKey="Ganhos" fill="var(--gain)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Gastos" fill="var(--loss)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const ALLOCATION = ["#2f6b4f", "#a8471f", "#c08a2e", "#4a6fa5", "#7a5c8a", "#5f8a7a", "#78716c"];

export function AllocationPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={90} paddingAngle={2} stroke="var(--surface)">
          {data.map((d, i) => <Cell key={d.name} fill={ALLOCATION[i % ALLOCATION.length]} />)}
        </Pie>
        <Tooltip formatter={fmt} {...tooltipStyle} />
        <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={legendStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}
