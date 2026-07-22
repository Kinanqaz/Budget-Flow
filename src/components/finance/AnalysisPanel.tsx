import { ArrowDownRight, ArrowUpRight, BarChart3, BriefcaseBusiness, ChartNoAxesCombined, Receipt } from "lucide-react";
import type { Stats } from "@/types/finance";

interface Props {
  stats: Stats;
  currency: string;
}

export default function AnalysisPanel({ stats, currency }: Props) {
  const annualIncome = stats.income * 12;
  const annualExpenses = stats.expenses * 12;
  const annualInvestments = stats.investments * 12;
  const annualDifference = stats.remaining * 12;
  const formatAmount = (amount: number) =>
    amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="scrollbar-hidden flex h-full min-h-0 w-full flex-col gap-4 overflow-auto">
      <div className="flex items-start gap-4 border-b border-border/50 pb-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-primary">
            <BarChart3 size={18} />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Financial overview</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Analyses</h2>
          <p className="mt-1 text-sm text-muted-foreground">Compare income, regular spending, investments, and remaining budget.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalysisCard label="Income" monthly={stats.income} annual={annualIncome} currency={currency} valueClassName="text-emerald-500" formatAmount={formatAmount} />
        <AnalysisCard label="Expenses" monthly={stats.expenses} annual={annualExpenses} currency={currency} valueClassName="text-foreground" formatAmount={formatAmount} icon={Receipt} />
        <AnalysisCard label="Investments" monthly={stats.investments} annual={annualInvestments} currency={currency} valueClassName="text-violet-500" formatAmount={formatAmount} icon={BriefcaseBusiness} />
        <AnalysisCard
          label="Remaining"
          monthly={stats.remaining}
          annual={annualDifference}
          currency={currency}
          valueClassName={stats.remaining >= 0 ? "text-sky-500" : "text-destructive"}
          formatAmount={formatAmount}
          icon={stats.remaining >= 0 ? ArrowUpRight : ArrowDownRight}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CategoryBreakdown
          title="Spending by category"
          description="Regular monthly expenses and obligations."
          emptyMessage="No expense data available yet."
          categories={stats.expenseCats}
          total={stats.expenses}
          currency={currency}
          formatAmount={formatAmount}
          icon={Receipt}
          accentClassName="text-primary"
        />
        <CategoryBreakdown
          title="Investments by category"
          description="Monthly allocations toward assets and investment goals."
          emptyMessage="No investment data available yet."
          categories={stats.investmentCats}
          total={stats.investments}
          currency={currency}
          formatAmount={formatAmount}
          icon={ChartNoAxesCombined}
          accentClassName="text-violet-500"
          showItems
        />
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
      <div className={`mt-4 grid grid-cols-2 divide-x divide-border/60 font-display ${valueClassName}`}>
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

interface CategoryBreakdownProps {
  title: string;
  description: string;
  emptyMessage: string;
  categories: Stats["expenseCats"];
  total: number;
  currency: string;
  formatAmount: (amount: number) => string;
  icon: typeof Receipt;
  accentClassName: string;
  showItems?: boolean;
}

function CategoryBreakdown({ title, description, emptyMessage, categories, total, currency, formatAmount, icon: Icon, accentClassName, showItems = false }: CategoryBreakdownProps) {
  const visibleCategories = [...categories].filter((category) => category.total > 0).sort((a, b) => b.total - a.total);

  return (
    <section className="flex flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className={`mb-1 flex items-center gap-2 ${accentClassName}`}>
            <Icon size={16} />
            <h3 className="font-bold text-foreground">{title}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {visibleCategories.length} categories
        </span>
      </div>
      {visibleCategories.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="grid content-start grid-cols-1 gap-y-4">
          {visibleCategories.slice(0, 8).map((category) => {
            const percentage = total > 0 ? (category.total / total) * 100 : 0;
            const investmentItems = category.items.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
            return (
              <div key={category.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 font-semibold text-foreground">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="truncate">{category.name}</span>
                  </span>
                  <span className="shrink-0 font-display text-muted-foreground">{formatAmount(category.total)} {currency}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: category.color }} />
                </div>
                {showItems && investmentItems.length > 0 && (
                  <div className="mt-2 ml-4 space-y-2 border-l border-border/60 pl-3">
                    {investmentItems.map((item) => {
                      const itemPercentage = category.total > 0 ? (item.value / category.total) * 100 : 0;
                      return (
                        <div key={item.id}>
                          <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                            <span className="min-w-0 truncate text-muted-foreground">{item.name}</span>
                            <span className="shrink-0 font-display text-muted-foreground">{formatAmount(item.value)} {currency}</span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-muted/70">
                            <div className="h-full rounded-full opacity-75" style={{ width: `${itemPercentage}%`, backgroundColor: category.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
