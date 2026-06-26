import { Plus, X, TrendingUp, PanelLeftClose } from "lucide-react";
import type { FinanceData } from "@/types/finance";

interface Props {
  data: FinanceData;
  updateIncome: (i: number, f: "name" | "value", v: string | number) => void;
  addIncome: () => void;
  removeIncome: (i: number) => void;
  updateCategory: (ci: number, f: "name" | "color", v: string) => void;
  addCategory: () => void;
  removeCategory: (ci: number) => void;
  updateItem: (ci: number, ii: number, f: "name" | "value", v: string | number) => void;
  addItem: (ci: number) => void;
  removeItem: (ci: number, ii: number) => void;
  onClose: () => void;
}

export default function FinanceSidebar({
  data, updateIncome, addIncome, removeIncome,
  updateCategory, addCategory, removeCategory,
  updateItem, addItem, removeItem, onClose,
}: Props) {

  return (
    <aside className="w-[300px] min-w-[300px] bg-card flex flex-col h-screen border-r border-border/60">
      {/* Header / Logo */}
      <div className="px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp size={16} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-tight leading-none">BudgetFlow</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">Your financial overview</p>
          </div>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Close sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-1">
        {/* Income */}
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-1 mb-2">Income</p>
        {data.income.map((inc, i) => (
          <div key={inc.id} className="flex items-center gap-1.5 group mb-1">
            <input
              className="flex-1 text-xs px-2.5 py-2 rounded-lg border border-border/70 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all min-w-0"
              value={inc.name}
              onChange={(e) => updateIncome(i, "name", e.target.value)}
            />
            <input
              className="w-[76px] text-xs px-2.5 py-2 rounded-lg border border-border/70 bg-background text-foreground text-right focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all"
              type="number"
              step="0.01"
              min="0"
              value={inc.value}
              onChange={(e) => updateIncome(i, "value", e.target.value)}
            />
            <button onClick={() => removeIncome(i)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded-md hover:bg-destructive/10">
              <X size={12} />
            </button>
          </div>
        ))}
        <button onClick={addIncome} className="text-[11px] text-muted-foreground hover:text-primary border border-dashed border-border hover:border-primary/40 rounded-lg px-3 py-1.5 ml-1 transition-all hover:bg-accent">
          <Plus size={10} className="inline mr-1" />Income
        </button>

        {/* Categories */}
        {data.categories.map((cat, ci) => (
          <div key={cat.id} className="mt-4">
            <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b-2 group" style={{ borderBottomColor: cat.color }}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <input
                className="flex-1 text-xs font-bold text-foreground bg-transparent border-none outline-none min-w-0"
                value={cat.name}
                onChange={(e) => updateCategory(ci, "name", e.target.value)}
              />
              <input
                type="color"
                value={cat.color}
                onChange={(e) => updateCategory(ci, "color", e.target.value)}
                className="w-4 h-4 border-none p-0 cursor-pointer rounded-full flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <button onClick={() => removeCategory(ci)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded-md hover:bg-destructive/10">
                <X size={12} />
              </button>
            </div>
            {cat.items.map((item, ii) => (
              <div key={item.id} className="flex items-center gap-1.5 ml-3 my-1 group">
                <input
                  className="flex-1 text-xs px-2.5 py-2 rounded-lg border border-border/70 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all min-w-0"
                  value={item.name}
                  onChange={(e) => updateItem(ci, ii, "name", e.target.value)}
                />
                <input
                  className="w-[76px] text-xs px-2.5 py-2 rounded-lg border border-border/70 bg-background text-foreground text-right focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all"
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.value}
                  onChange={(e) => updateItem(ci, ii, "value", e.target.value)}
                />
                <button onClick={() => removeItem(ci, ii)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded-md hover:bg-destructive/10">
                  <X size={12} />
                </button>
              </div>
            ))}
            <button onClick={() => addItem(ci)} className="text-[11px] text-muted-foreground hover:text-primary border border-dashed border-border hover:border-primary/40 rounded-lg px-3 py-1.5 ml-3 transition-all hover:bg-accent">
              <Plus size={10} className="inline mr-1" />Item
            </button>
          </div>
        ))}

        <button onClick={addCategory} className="w-full mt-5 py-2.5 text-xs text-muted-foreground hover:text-primary border border-dashed border-border hover:border-primary/40 rounded-xl transition-all hover:bg-accent font-medium">
          <Plus size={12} className="inline mr-1" />Add Category
        </button>
      </div>
    </aside>
  );
}
