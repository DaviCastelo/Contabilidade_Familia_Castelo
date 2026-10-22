"use client";

import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { brl } from "@/lib/format";

const fmt = (v: unknown) => brl(Number(v));

export function CategoryPie({ data }: { data: { name: string; color: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip formatter={fmt} />
        <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyBars({ data }: { data: { mes: string; Ganhos: number; Gastos: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} width={70} tickFormatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
        <Tooltip formatter={fmt} />
        <Legend iconType="circle" />
        <Bar dataKey="Ganhos" fill="#16a34a" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AllocationPie({ data }: { data: { name: string; value: number }[] }) {
  const colors = ["#0ea5e9", "#16a34a", "#f97316", "#8b5cf6", "#eab308", "#ec4899", "#64748b"];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
          {data.map((d, i) => <Cell key={d.name} fill={colors[i % colors.length]} />)}
        </Pie>
        <Tooltip formatter={fmt} />
        <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
