import React, { useMemo, useState, useRef } from "react";
import type { FinanceData, ExpenseItem, Stats } from "@/types/finance";
import { 
  Plus, Trash2, Calendar, FileText, Info, 
  Search, Upload, AlertTriangle, CheckCircle, 
  HelpCircle, Clock, ArrowRight 
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  data: FinanceData;
  setData: React.Dispatch<React.SetStateAction<FinanceData>>;
  stats: Stats;
  updateItem: (ci: number, ii: number, field: keyof ExpenseItem, val: string | number | undefined) => void;
  removeItem: (ci: number, ii: number) => void;
  moveItemCategory: (sourceCi: number, ii: number, targetCi: number) => void;
  addItem: (ci: number) => void;
  currency: string;
}

interface FlattenedItem {
  categoryIndex: number;
  itemIndex: number;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  item: ExpenseItem;
}

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

const convertDateToISO = (dateStr: string): string | undefined => {
  if (!dateStr) return undefined;
  // Handle formats like DD/MM/YYYY or DD.MM.YYYY
  const delimiter = dateStr.includes('/') ? '/' : (dateStr.includes('.') ? '.' : '-');
  const parts = dateStr.split(delimiter);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) {
      year = "20" + year; // assume 20xx for 2 digit years
    }
    return `${year}-${month}-${day}`;
  }
  return undefined;
};

const formatDateForDisplay = (isoStr?: string): string => {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return isoStr;
};

const calculateNoticeDate = (endDateStr?: string, noticePeriodStr?: string): string | undefined => {
  if (!endDateStr || !noticePeriodStr || noticePeriodStr === "none" || noticePeriodStr === "custom") {
    return undefined;
  }
  const months = parseInt(noticePeriodStr, 10);
  if (isNaN(months) || months <= 0) return undefined;

  const date = new Date(endDateStr);
  if (isNaN(date.getTime())) return undefined;

  const targetDay = date.getDate();
  // Subtract months safely
  date.setMonth(date.getMonth() - months);
  
  // Prevent date overflow/wrapping (e.g. May 31 minus 3 months becomes March 3 instead of Feb 28/29)
  if (date.getDate() < targetDay) {
    date.setDate(0);
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function FinanceTable({
  data,
  setData,
  stats,
  updateItem,
  removeItem,
  moveItemCategory,
  addItem,
  currency,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryForNewItem, setSelectedCategoryForNewItem] = useState(0);
  const [activeDateEditorItemId, setActiveDateEditorItemId] = useState<string | null>(null);

  // Flatten nested items for tabular display, excluding income/salary items
  const flattenedItems = useMemo(() => {
    const list: FlattenedItem[] = [];
    data.categories.forEach((category, ci) => {
      const catLower = category.name.toLowerCase();
      if (catLower === "income" || catLower === "salary" || catLower.includes("salary") || catLower.includes("income")) {
        return;
      }
      category.items.forEach((item, ii) => {
        const itemLower = item.name.toLowerCase();
        if (itemLower === "income" || itemLower === "salary" || itemLower.includes("salary") || itemLower.includes("income")) {
          return;
        }
        list.push({
          categoryIndex: ci,
          itemIndex: ii,
          categoryId: category.id,
          categoryName: category.name,
          categoryColor: category.color,
          item,
        });
      });
    });
    return list;
  }, [data.categories]);

  // Handle Search Filtering
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return flattenedItems;
    return flattenedItems.filter((fi) => {
      return (
        fi.item.name.toLowerCase().includes(query) ||
        fi.categoryName.toLowerCase().includes(query) ||
        (fi.item.infos || "").toLowerCase().includes(query)
      );
    });
  }, [flattenedItems, searchQuery]);

  // Notice alerts configuration
  const noticeAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return flattenedItems
      .filter((fi) => fi.item.cancellationDate)
      .map((fi) => {
        const target = new Date(fi.item.cancellationDate!);
        target.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...fi, diffDays };
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [flattenedItems]);

  const activeWarnings = useMemo(() => {
    return noticeAlerts.filter((alert) => alert.diffDays >= 0 && alert.diffDays <= 90);
  }, [noticeAlerts]);

  // Sum totals of filtered list
  const totals = useMemo(() => {
    let monthly = 0;
    let annual = 0;

    filteredItems.forEach((fi) => {
      const val = fi.item.value || 0;
      monthly += val;
      if (fi.item.billingPeriod === "Annual") {
        annual += val * 12; // value is always monthly equivalent in hook
      } else {
        annual += val * 12;
      }
    });

    return {
      monthly: Math.round(monthly * 100) / 100,
      annual: Math.round(annual * 100) / 100,
    };
  }, [filteredItems]);

  // File CSV parsing handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleCSVImport(text);
      }
      e.target.value = ""; // clear input
    };
    reader.readAsText(file);
  };

  const handleCSVImport = (text: string) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length <= 1) {
      toast.error("CSV is empty or invalid");
      return;
    }

    const importedItems: ExpenseItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (row.length === 0 || !row[0]) continue;

      const name = row[0].replace(/^"|"$/g, "").trim();
      const lowerName = name.toLowerCase();
      
      // Skip income or salary items from table expenses
      if (lowerName === "income" || lowerName === "salary" || lowerName.includes("salary") || lowerName.includes("income")) {
        continue;
      }
      
      // Parse values (strip currency symbols and commas)
      const rawAmount = row[1] || "0";
      const amount = parseFloat(rawAmount.replace(/[^\d.-]/g, "")) || 0;

      const dateRange = row[3] || "";
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (dateRange.includes("→") || dateRange.includes("->")) {
        const sep = dateRange.includes("→") ? "→" : "->";
        const parts = dateRange.split(sep).map((s) => s.trim());
        if (parts[0]) startDate = convertDateToISO(parts[0]);
        if (parts[1]) endDate = convertDateToISO(parts[1]);
      } else if (dateRange.trim()) {
        startDate = convertDateToISO(dateRange);
      }

      const infos = (row[4] || "").replace(/^"|"$/g, "").trim();
      const cancellationDate = convertDateToISO(row[5] || "");
      const type = (row[6] || "Monthly").trim();
      const billingPeriod =
        type.toLowerCase() === "annual" || type.toLowerCase() === "annually"
          ? "Annual"
          : "Monthly";

      importedItems.push({
        id: "_" + Math.random().toString(36).slice(2, 9),
        name,
        value: amount,
        startDate,
        endDate,
        infos,
        cancellationDate,
        billingPeriod,
      });
    }

    if (importedItems.length === 0) {
      toast.error("No valid items found in CSV file");
      return;
    }

    // Add elements under "CSV Import" category
    setData((prev) => {
      const categories = [...prev.categories];
      let csvCat = categories.find((c) => c.name === "CSV Import");
      if (!csvCat) {
        csvCat = {
          id: "_" + Math.random().toString(36).slice(2, 9),
          name: "CSV Import",
          color: "#CE93D8",
          items: [],
        };
        categories.push(csvCat);
      }
      csvCat.items = [...csvCat.items, ...importedItems];
      return { ...prev, categories };
    });

    toast.success(`Successfully imported ${importedItems.length} expenses into "CSV Import" category!`);
  };

  const handleAddNewItem = () => {
    if (data.categories.length === 0) {
      toast.error("Please create a category in the sidebar first");
      return;
    }
    // Default to the first category, or one named "Other"
    const otherIdx = data.categories.findIndex(c => c.name.toLowerCase() === "other");
    const defaultIndex = otherIdx !== -1 ? otherIdx : 0;
    addItem(defaultIndex);
    toast.success(`Added new item to ${data.categories[defaultIndex].name}`);
  };

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      {/* Notice alerts banner */}
      {activeWarnings.length > 0 && (
        <div className="bg-destructive/15 border border-destructive/35 rounded-xl p-3 flex items-start gap-3 text-destructive-foreground">
          <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={18} />
          <div className="flex-1 text-xs">
            <span className="font-bold block text-sm mb-1 text-destructive">
              Notice Cancellation Warnings ({activeWarnings.length})
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              {activeWarnings.map((w, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className="font-semibold">{w.item.name}</span> in{" "}
                  <span className="opacity-85 font-medium" style={{ color: w.categoryColor }}>
                    {w.categoryName}
                  </span>{" "}
                  notice date is on{" "}
                  <span className="font-bold underline">
                    {formatDateForDisplay(w.item.cancellationDate)}
                  </span>{" "}
                  ({w.diffDays === 0 ? "today" : `${w.diffDays} days left`})
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Control bar: search, add item button, CSV button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            size={16}
          />
          <input
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border/80 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all"
            placeholder="Search items, categories, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          <button
            onClick={handleAddNewItem}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-3.5 bg-primary text-primary-foreground hover:opacity-90 rounded-xl text-xs font-semibold shadow-sm transition-all h-9"
          >
            <Plus size={14} /> Add Item
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-3.5 bg-card hover:bg-accent text-foreground border border-border rounded-xl text-xs font-semibold transition-all h-9"
          >
            <Upload size={14} /> Import CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Main Table area */}
      <div className="flex-1 bg-card border border-border/70 rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border/70 text-[10px] uppercase font-bold text-muted-foreground tracking-wider select-none">
                <th className="py-3 px-4 min-w-[180px]">Expense Name</th>
                <th className="py-3 px-4 w-[110px]">Monthly ({currency})</th>
                <th className="py-3 px-4 w-[110px]">Annual ({currency})</th>
                <th className="py-3 px-4 w-[70px] text-center">%</th>
                <th className="py-3 px-4 w-[100px]">Frequency</th>
                <th className="py-3 px-4 w-[220px]">Dates / Contract</th>
                <th className="py-3 px-4 min-w-[150px]">Infos / Notes</th>
                <th className="py-3 px-4 w-[50px] text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground font-medium">
                    No expense items found. Import a CSV or add new items.
                  </td>
                </tr>
              ) : (
                filteredItems.map((fi, idx) => {
                  const { item, categoryIndex: ci, itemIndex: ii } = fi;

                  // Compute notice alert status
                  let alertBadge = null;
                  if (item.cancellationDate) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const target = new Date(item.cancellationDate);
                    target.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) {
                      alertBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground text-center justify-center min-w-[70px]">
                          <Clock size={10} /> Expired
                        </span>
                      );
                    } else if (diffDays <= 30) {
                      alertBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/20 animate-pulse text-center justify-center min-w-[70px]">
                          <AlertTriangle size={10} /> {diffDays === 0 ? "Today!" : `${diffDays}d left`}
                        </span>
                      );
                    } else if (diffDays <= 90) {
                      alertBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/15 text-center justify-center min-w-[70px]">
                          <AlertTriangle size={10} /> {diffDays}d left
                        </span>
                      );
                    }
                  }

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 group transition-all"
                    >
                      {/* Item Name with slight Category color indicator on the left */}
                      <td 
                        className="py-2.5 px-4 border-l-[3px] border-l-transparent transition-all"
                        style={{ borderLeftColor: fi.categoryColor }}
                        title={`Category: ${fi.categoryName}`}
                      >
                        <input
                          className="w-full bg-transparent border-none outline-none text-foreground font-medium focus:underline focus:bg-background/40 py-1 px-1.5 rounded"
                          value={item.name}
                          onChange={(e) => updateItem(ci, ii, "name", e.target.value)}
                        />
                      </td>

                      {/* Monthly Value */}
                      <td className="py-2.5 px-4 font-mono font-medium">
                        <div className="flex items-center bg-background/30 rounded border border-transparent focus-within:border-border/80 px-1 py-0.5">
                          <span className="text-muted-foreground mr-0.5">{currency}</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full bg-transparent border-none outline-none text-foreground text-right"
                            value={item.value || 0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              updateItem(ci, ii, "value", val);
                            }}
                          />
                        </div>
                      </td>

                      {/* Annual Value */}
                      <td className="py-2.5 px-4 font-mono font-medium">
                        <div className="flex items-center bg-background/30 rounded border border-transparent focus-within:border-border/80 px-1 py-0.5">
                          <span className="text-muted-foreground mr-0.5">{currency}</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full bg-transparent border-none outline-none text-foreground text-right"
                            value={Math.round((item.value || 0) * 12 * 100) / 100}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              updateItem(ci, ii, "value", Math.round((val / 12) * 100) / 100);
                            }}
                          />
                        </div>
                      </td>

                      {/* Percentage of Income */}
                      <td className="py-2.5 px-4 font-mono font-semibold text-muted-foreground text-center">
                        {stats.income > 0 ? (
                          `${Math.round((item.value / stats.income) * 100)}%`
                        ) : (
                          "0%"
                        )}
                      </td>

                      {/* Billing Frequency */}
                      <td className="py-2.5 px-4">
                        <select
                          className="bg-transparent border-none outline-none cursor-pointer font-medium"
                          value={item.billingPeriod || "Monthly"}
                          onChange={(e) => {
                            updateItem(ci, ii, "billingPeriod", e.target.value);
                          }}
                        >
                          <option value="Monthly" className="bg-card text-foreground">Monthly</option>
                          <option value="Annual" className="bg-card text-foreground">Annual</option>
                        </select>
                      </td>

                      {/* Dates / Contract (with Popover editor) */}
                      <td className="py-2.5 px-4 relative">
                        <div className="flex items-center gap-2 select-none">
                          <button
                            onClick={() => setActiveDateEditorItemId(activeDateEditorItemId === item.id ? null : item.id)}
                            className="flex flex-col text-left hover:bg-muted/40 p-1 rounded border border-transparent hover:border-border/30 transition-all max-w-[160px] truncate"
                            title="Click to configure dates"
                          >
                            <span className="font-semibold text-[11px] text-foreground block leading-tight">
                              {item.startDate || item.endDate ? (
                                `${formatDateForDisplay(item.startDate) || "..."} - ${formatDateForDisplay(item.endDate) || "..."}`
                              ) : (
                                <span className="text-muted-foreground italic font-normal">Set Dates</span>
                              )}
                            </span>
                            {item.cancellationDate && (() => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const target = new Date(item.cancellationDate);
                              target.setHours(0, 0, 0, 0);
                              const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                              
                              let colorClass = "text-muted-foreground";
                              if (diffDays < 0) colorClass = "text-muted-foreground/60 line-through";
                              else if (diffDays <= 30) colorClass = "text-destructive font-bold animate-pulse";
                              else if (diffDays <= 90) colorClass = "text-amber-500 font-bold";
                              
                              return (
                                <span className={`flex items-center gap-1 text-[11px] font-semibold mt-1 ${colorClass}`}>
                                  <Clock size={11} className="shrink-0" />
                                  <span>Notice: {formatDateForDisplay(item.cancellationDate)}</span>
                                </span>
                              );
                            })()}
                          </button>
                          
                          {/* Alert Badge right next to the date for immediate feedback */}
                          {alertBadge}
                        </div>

                        {/* Dropdown date config card */}
                        {activeDateEditorItemId === item.id && (
                          <>
                            {/* Backdrop overlay to close when clicking outside */}
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setActiveDateEditorItemId(null)}
                            />
                            <div className="absolute right-4 top-full mt-1 bg-card border border-border/90 rounded-2xl shadow-xl p-4 z-50 min-w-[240px] space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                              <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                                <span className="font-bold text-xs text-foreground">Configure Dates</span>
                                <button
                                  onClick={() => setActiveDateEditorItemId(null)}
                                  className="text-[10px] text-muted-foreground hover:text-foreground font-semibold px-2 py-0.5 bg-muted/60 rounded"
                                >
                                  Done
                                </button>
                              </div>
                              
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  Start Date
                                </label>
                                <input
                                  type="date"
                                  className="w-full bg-background border border-border/60 text-xs p-1.5 rounded-lg outline-none text-foreground focus:border-primary/50"
                                  value={item.startDate || ""}
                                  onChange={(e) => updateItem(ci, ii, "startDate", e.target.value)}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  End Date
                                </label>
                                <input
                                  type="date"
                                  className="w-full bg-background border border-border/60 text-xs p-1.5 rounded-lg outline-none text-foreground focus:border-primary/50"
                                  value={item.endDate || ""}
                                  onChange={(e) => {
                                    const newEndDate = e.target.value;
                                    updateItem(ci, ii, "endDate", newEndDate);
                                    if (item.noticePeriod && item.noticePeriod !== "none" && item.noticePeriod !== "custom") {
                                      const calcDate = calculateNoticeDate(newEndDate, item.noticePeriod);
                                      if (calcDate) {
                                        updateItem(ci, ii, "cancellationDate", calcDate);
                                      }
                                    }
                                  }}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  Notice Period
                                </label>
                                <select
                                  value={item.noticePeriod || "none"}
                                  onChange={(e) => {
                                    const period = e.target.value;
                                    updateItem(ci, ii, "noticePeriod", period);
                                    if (period !== "none" && period !== "custom" && item.endDate) {
                                      const calcDate = calculateNoticeDate(item.endDate, period);
                                      if (calcDate) {
                                        updateItem(ci, ii, "cancellationDate", calcDate);
                                      }
                                    } else if (period === "none") {
                                      updateItem(ci, ii, "cancellationDate", undefined);
                                    }
                                  }}
                                  className="w-full bg-background border border-border/60 text-xs p-1.5 rounded-lg outline-none text-foreground cursor-pointer focus:border-primary/50"
                                >
                                  <option value="none" className="bg-card text-foreground">None (No warning)</option>
                                  <option value="1" className="bg-card text-foreground">1 Month before</option>
                                  <option value="2" className="bg-card text-foreground">2 Months before</option>
                                  <option value="3" className="bg-card text-foreground">3 Months before</option>
                                  <option value="6" className="bg-card text-foreground">6 Months before</option>
                                  <option value="custom" className="bg-card text-foreground">Custom notice date</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  Kündigung (Notice Date)
                                </label>
                                <input
                                  type="date"
                                  className={`w-full bg-background border border-border/60 text-xs p-1.5 rounded-lg outline-none text-foreground font-semibold focus:border-primary/50 ${
                                    (item.noticePeriod && item.noticePeriod !== "none" && item.noticePeriod !== "custom")
                                      ? "opacity-60 cursor-not-allowed bg-muted/40"
                                      : ""
                                  }`}
                                  value={item.cancellationDate || ""}
                                  disabled={item.noticePeriod !== "custom" && item.noticePeriod !== "none" && item.noticePeriod !== undefined}
                                  onChange={(e) => updateItem(ci, ii, "cancellationDate", e.target.value)}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </td>

                      {/* Notes / Infos */}
                      <td className="py-2.5 px-4">
                        <input
                          className="w-full bg-transparent border-none outline-none text-muted-foreground placeholder:text-muted-foreground/30 focus:underline focus:text-foreground focus:bg-background/40 py-1 px-1.5 rounded"
                          placeholder="e.g. Allianz"
                          value={item.infos || ""}
                          onChange={(e) => updateItem(ci, ii, "infos", e.target.value)}
                        />
                      </td>

                      {/* Delete item */}
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => {
                            removeItem(ci, ii);
                            toast.success(`Removed ${item.name}`);
                          }}
                          className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Bar */}
        <div className="bg-muted/30 border-t border-border/70 p-4 flex flex-col sm:flex-row items-center gap-4 text-sm select-none">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Table Summaries ({filteredItems.length} expenses)
          </span>
          <div className="flex items-center gap-5 sm:ml-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Total Monthly:</span>
              <span className="font-mono font-bold text-foreground">
                {currency}
                {totals.monthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-4 w-px bg-border/70 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Total Annual:</span>
              <span className="font-mono font-bold text-primary">
                {currency}
                {totals.annual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
