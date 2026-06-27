import { useState } from "react";
import { Plus, X, TrendingUp, PanelLeftClose, GripVertical } from "lucide-react";
import type { FinanceData } from "@/types/finance";

interface Props {
  data: FinanceData;
  updateIncome: (i: number, f: "name" | "value", v: string | number) => void;
  addIncome: () => void;
  removeIncome: (i: number) => void;
  moveIncome: (fromIndex: number, toIndex: number) => void;
  updateCategory: (ci: number, f: "name" | "color", v: string) => void;
  addCategory: () => void;
  removeCategory: (ci: number) => void;
  moveCategory: (fromIndex: number, toIndex: number) => void;
  updateItem: (ci: number, ii: number, f: "name" | "value", v: string | number) => void;
  addItem: (ci: number) => void;
  removeItem: (ci: number, ii: number) => void;
  moveItem: (ci: number, fromIndex: number, toIndex: number) => void;
  updateIncomeColor: (color: string) => void;
  onClose: () => void;
}

export default function FinanceSidebar({
  data, updateIncome, addIncome, removeIncome, moveIncome,
  updateCategory, addCategory, removeCategory, moveCategory,
  updateItem, addItem, removeItem, moveItem, updateIncomeColor, onClose,
}: Props) {

  const [draggedIncomeIdx, setDraggedIncomeIdx] = useState<number | null>(null);
  const [draggedCategoryIdx, setDraggedCategoryIdx] = useState<number | null>(null);
  const [draggedItemIdx, setDraggedItemIdx] = useState<{ ci: number; ii: number } | null>(null);

  const handleItemDragStart = (ci: number, ii: number) => {
    setDraggedItemIdx({ ci, ii });
  };

  const handleItemDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleItemDrop = (ci: number, ii: number) => {
    if (draggedItemIdx !== null && draggedItemIdx.ci === ci && draggedItemIdx.ii !== ii) {
      moveItem(ci, draggedItemIdx.ii, ii);
    }
    setDraggedItemIdx(null);
  };

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
        <div className="flex items-center justify-between mt-1 mb-2 pr-1">
          <div className="flex items-center gap-1.5">
            {/* Income Color Picker Dot */}
            <label className="relative cursor-pointer flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform">
              <input
                type="color"
                value={data.incomeColor || "#2196F3"}
                onChange={(e) => updateIncomeColor(e.target.value)}
                className="sr-only"
              />
              <div 
                className="w-3.5 h-3.5 rounded-full shadow-sm flex-shrink-0"
                style={{ backgroundColor: data.incomeColor || "#2196F3" }}
                title="Choose income color"
              />
            </label>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Income</p>
          </div>
          <button
            onClick={addIncome}
            className="text-muted-foreground hover:text-primary p-0.5 rounded hover:bg-accent transition-colors"
            title="Add income"
          >
            <Plus size={12} />
          </button>
        </div>
        {data.income.map((inc, i) => (
          <div
            key={inc.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              setDraggedIncomeIdx(i);
            }}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={() => {
              if (draggedIncomeIdx !== null && draggedIncomeIdx !== i) {
                moveIncome(draggedIncomeIdx, i);
              }
              setDraggedIncomeIdx(null);
            }}
            className={`flex items-center gap-1.5 group mb-1 ${draggedIncomeIdx === i ? "opacity-45" : ""}`}
          >
            <div className="text-muted-foreground/30 group-hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing transition-colors shrink-0 p-0.5" title="Drag to reorder">
              <GripVertical size={13} />
            </div>
            <input
              className="flex-1 text-xs px-2.5 py-2 rounded-lg border border-border/70 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all min-w-0"
              value={inc.name}
              onChange={(e) => updateIncome(i, "name", e.target.value)}
              onFocus={(e) => e.target.select()}
            />
            <input
              className="w-[76px] text-xs px-2.5 py-2 rounded-lg border border-border/70 bg-background text-foreground text-right focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all"
              type="number"
              step="0.01"
              min="0"
              value={inc.value}
              onChange={(e) => updateIncome(i, "value", e.target.value)}
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={() => removeIncome(i)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1 rounded-md hover:bg-destructive/10 shrink-0"
              title="Delete"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {/* Categories */}
        <div className="flex items-center justify-between mt-4 mb-2 border-t border-border/30 pt-3 pr-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Categories</p>
          <button
            onClick={addCategory}
            className="text-muted-foreground hover:text-primary p-0.5 rounded hover:bg-accent transition-colors"
            title="Add category"
          >
            <Plus size={12} />
          </button>
        </div>
        {data.categories.map((cat, ci) => (
          <div key={cat.id} className="mt-2">
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                setDraggedCategoryIdx(ci);
              }}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={() => {
                if (draggedCategoryIdx !== null && draggedCategoryIdx !== ci) {
                  moveCategory(draggedCategoryIdx, ci);
                }
                setDraggedCategoryIdx(null);
              }}
              className={`flex items-center gap-1.5 pb-1.5 mb-1.5 border-b-2 group ${draggedCategoryIdx === ci ? "opacity-45" : ""}`}
              style={{ borderBottomColor: cat.color }}
            >
              <label className="relative cursor-pointer flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform">
                <input
                  type="color"
                  value={cat.color}
                  onChange={(e) => updateCategory(ci, "color", e.target.value)}
                  className="sr-only"
                />
                <div 
                  className="w-3.5 h-3.5 rounded-full shadow-sm flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                  title="Choose category color"
                />
              </label>
              <div className="text-muted-foreground/30 group-hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing transition-colors shrink-0 p-0.5" title="Drag category to reorder">
                <GripVertical size={13} />
              </div>
              <input
                className="flex-1 text-xs font-bold text-foreground bg-transparent border-none outline-none min-w-0"
                value={cat.name}
                onChange={(e) => updateCategory(ci, "name", e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={() => addItem(ci)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity p-1 rounded hover:bg-accent/40 shrink-0"
                title="Add item"
              >
                <Plus size={12} />
              </button>
              <button
                onClick={() => removeCategory(ci)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1 rounded hover:bg-destructive/10 shrink-0"
                title="Delete category"
              >
                <X size={12} />
              </button>
            </div>
            {cat.items.map((item, ii) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  handleItemDragStart(ci, ii);
                }}
                onDragOver={handleItemDragOver}
                onDrop={() => handleItemDrop(ci, ii)}
                className={`flex items-center gap-1.5 ml-3 my-1 group ${draggedItemIdx?.ci === ci && draggedItemIdx?.ii === ii ? "opacity-45" : ""}`}
              >
                <div className="text-muted-foreground/30 group-hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing transition-colors shrink-0 p-0.5" title="Drag item to reorder">
                  <GripVertical size={13} />
                </div>
                <input
                  className="flex-1 text-xs px-2.5 py-2 rounded-lg border border-border/70 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all min-w-0"
                  value={item.name}
                  onChange={(e) => updateItem(ci, ii, "name", e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
                <input
                  className="w-[76px] text-xs px-2.5 py-2 rounded-lg border border-border/70 bg-background text-foreground text-right focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all"
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.value}
                  onChange={(e) => updateItem(ci, ii, "value", e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={() => removeItem(ci, ii)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1 rounded-md hover:bg-destructive/10 shrink-0"
                  title="Delete item"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {/* Removed add item block button */}
          </div>
        ))}
      </div>
    </aside>
  );
}
