import { ArrowDownRight, ArrowUpRight, BarChart3, WalletCards } from "lucide-react";
import type { Stats } from "@/types/finance";

interface Props {
  stats: Stats;
  currency: string;
}

export default function AnalysisPanel({ stats, currency }: Props) {
  const monthlyExpenses = stats.expenses;
  const annualIncome = stats.income * 12;
  const annualExpenses = monthlyExpenses * 12;
  const monthlyDifference = stats.income - monthlyExpenses;
  const annualDifference = annualIncome - annualExpenses;
  const formatAmount = (amount: number) =>
    amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const categories = [...stats.cats].filter((category) => category.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="scrollbar-hidden flex h-full min-h-0 w-full flex-col gap-4 overflow-auto">
      <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-primary">
            <BarChart3 size={18} />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Financial overview</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Analyses</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track your income, spending, and remaining budget.</p>
        </div>
        <div className="hidden items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground sm:flex">
          <WalletCards size={15} />
          <span>Monthly / Annual</span>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        <section className="order-2 flex flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm md:order-1">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-foreground">Spending by category</h3>
              <p className="mt-1 text-xs text-muted-foreground">Where your monthly budget is going.</p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {categories.length} categories
            </span>
          </div>
          {categories.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No expense data available yet.</p>
          ) : (
            <div className="grid content-start grid-cols-1 gap-y-4">
              {categories.slice(0, 6).map((category) => {
                const percentage = monthlyExpenses > 0 ? (category.total / monthlyExpenses) * 100 : 0;
                return (
                  <div key={category.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="flex min-w-0 items-center gap-2 font-semibold text-foreground">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                        <span className="truncate">{category.name}</span>
                      </span>
                      <span className="shrink-0 font-mono text-muted-foreground">{formatAmount(category.total)} {currency}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: category.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="order-1 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3 md:order-2 md:grid-cols-1">
          <AnalysisCard label="Income" monthly={stats.income} annual={annualIncome} currency={currency} valueClassName="text-emerald-500" formatAmount={formatAmount} />
          <AnalysisCard label="Expenses" monthly={monthlyExpenses} annual={annualExpenses} currency={currency} valueClassName="text-foreground" formatAmount={formatAmount} />
          <AnalysisCard
            label="Remaining"
            monthly={monthlyDifference}
            annual={annualDifference}
            currency={currency}
            valueClassName={monthlyDifference >= 0 ? "text-sky-500" : "text-destructive"}
            formatAmount={formatAmount}
            icon={monthlyDifference >= 0 ? ArrowUpRight : ArrowDownRight}
          />
        </div>
      </div>
    </div>
  );
}

interface AnalysisCardProps {
  label: string;
  monthly: number;
  annual: number;
  currency: string;
  valueClassName: string;
  formatAmount: (amount: number) => string;
  icon?: typeof ArrowUpRight;
}

function AnalysisCard({ label, monthly, annual, currency, valueClassName, formatAmount, icon: Icon }: AnalysisCardProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && <Icon size={18} className={valueClassName} />}
      </div>
      <div className={`mt-4 grid grid-cols-2 divide-x divide-border/60 font-mono ${valueClassName}`}>
        <div>
          <span className="block text-[10px] font-sans font-semibold uppercase tracking-wider text-muted-foreground">Monthly</span>
          <span className="mt-1 block text-lg font-bold">{formatAmount(monthly)} {currency}</span>
        </div>
        <div className="pl-4">
          <span className="block text-[10px] font-sans font-semibold uppercase tracking-wider text-muted-foreground">Annual</span>
          <span className="mt-1 block text-lg font-bold">{formatAmount(annual)} {currency}</span>
        </div>
      </div>
    </div>
  );
}
