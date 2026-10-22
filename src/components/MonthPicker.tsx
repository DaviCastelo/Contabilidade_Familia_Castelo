"use client";

import { useRouter, usePathname } from "next/navigation";

export default function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const path = usePathname();
  return (
    <input
      type="month"
      value={month}
      onChange={(e) => e.target.value && router.push(`${path}?mes=${e.target.value}`)}
      className="input w-auto"
    />
  );
}
