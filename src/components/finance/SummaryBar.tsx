import type { Stats } from "@/types/finance";

const fmt = (v: number) =>
  Math.round(v).toLocaleString("en-US") + " €";

export default function SummaryBar({ stats }: { stats: Stats }) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 text-sm leading-relaxed">
      Your total budget is{" "}
      <span className="font-bold text-primary">{fmt(stats.income)}</span> and your expenses are{" "}
      <span className="font-bold text-primary">{fmt(stats.expenses)}</span>.{" "}
      You have{" "}
      <span className={`font-semibold ${stats.remaining >= 0 ? "text-positive" : "text-negative"}`}>
        {fmt(stats.remaining)}
      </span>{" "}
      remaining.
    </div>
  );
}
