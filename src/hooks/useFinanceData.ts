import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { FinanceData, Stats, ExpenseItem } from "@/types/finance";
import { toast } from "sonner";
import { api } from "@/lib/api";

const STORAGE_KEY = "budgetflow-data";
const CURRENCY_KEY = "budgetflow-currency";
const uid = () => "_" + Math.random().toString(36).slice(2, 9);

const defaultCurrencies = ["€", "$", "£", "CHF", "¥", "₹", "₽", "¥", "₩"];

const defaultData: FinanceData = {
  income: [{ id: "i0", name: "Income", value: 3000 }],
  categories: [
    {
      id: "c0", name: "Housing", color: "#FF8B7B", items: [
        { id: "w0", name: "Rent", value: 800 },
        { id: "w1", name: "Utilities", value: 150 },
        { id: "w2", name: "Insurance", value: 50 },
      ],
    },
    {
      id: "c1", name: "Living", color: "#FFE066", items: [
        { id: "t0", name: "Groceries", value: 400 },
        { id: "t1", name: "Transport", value: 100 },
        { id: "t2", name: "Leisure", value: 150 },
      ],
    },
    {
      id: "c2", name: "Savings & Investments", color: "#4DB6AC", items: [
        { id: "iv0", name: "ETF Plan", value: 500 },
        { id: "iv1", name: "Savings Account", value: 200 },
      ],
    },
    {
      id: "c3", name: "Other", color: "#64B5F6", items: [
        { id: "s0", name: "Reserves", value: 650 },
      ],
    },
  ],
};

function loadFromStorage(): FinanceData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.income && parsed.categories) return parsed;
    }
  } catch (e) {
    console.error("Failed to load from storage:", e);
  }
  return defaultData;
}

function loadCurrency(): string {
  try {
    const raw = localStorage.getItem(CURRENCY_KEY);
    if (raw && defaultCurrencies.includes(raw)) return raw;
  } catch (e) {
    console.error("Failed to load currency:", e);
  }
  return "€";
}

function hasMeaningfulFinanceData(fd: FinanceData): boolean {
  if (!fd.categories || fd.categories.length === 0) return false;
  return fd.income?.some((i) => (i.value || 0) > 0) ?? false;
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
  const delimiter = dateStr.includes('/') ? '/' : (dateStr.includes('.') ? '.' : '-');
  const parts = dateStr.split(delimiter);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) {
      year = "20" + year;
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

export function useFinanceData(userId: string | undefined, authenticated: boolean) {
  const [data, setData] = useState<FinanceData>(loadFromStorage);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [currency, setCurrencyState] = useState<string>(loadCurrency);
  const [loading, setLoading] = useState(false);
  const [serverReady, setServerReady] = useState(!authenticated);
  const dataRef = useRef(data);
  const darkModeRef = useRef(darkMode);
  const currencyRef = useRef(currency);
  const userIdRef = useRef(userId);

  dataRef.current = data;
  darkModeRef.current = darkMode;
  currencyRef.current = currency;
  userIdRef.current = userId;

  const stats: Stats = useMemo(() => {
    const income = Math.round(data.income.reduce((s, i) => s + (i.value || 0), 0));
    const cats = data.categories.map((c) => ({
      ...c,
      total: Math.round(c.items.reduce((s, i) => s + (i.value || 0), 0)),
    }));
    const expenses = cats.reduce((s, c) => s + c.total, 0);
    return { income, cats, expenses, remaining: income - expenses };
  }, [data]);

  const loadFromServer = useCallback(async () => {
    if (!authenticated) return;
    try {
      const row = await api.budget.get();
      if (row?.finance_data && hasMeaningfulFinanceData(row.finance_data)) {
        setData(row.finance_data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(row.finance_data));
      } else if (!hasMeaningfulFinanceData(dataRef.current)) {
        setData(defaultData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
      }
      if (row) {
        setDarkMode(row.dark_mode);
        document.documentElement.classList.toggle("dark", row.dark_mode);
        if (row.currency) {
          setCurrencyState(row.currency);
          localStorage.setItem(CURRENCY_KEY, row.currency);
        }
      }
    } catch {
      // Server unavailable, use localStorage cache
    }
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated || !userId) {
      setServerReady(true);
      return;
    }
    setServerReady(false);
    loadFromServer().finally(() => setServerReady(true));
  }, [authenticated, userId, loadFromServer]);

  const saveToServer = useCallback(async () => {
    if (!userIdRef.current) return;
    try {
      await api.budget.save(dataRef.current, darkModeRef.current, currencyRef.current);
    } catch (err) {
      console.error("Auto-save failed:", err);
    }
  }, []);

  useEffect(() => {
    if (!userId || !serverReady) return;
    const timer = setTimeout(() => {
      saveToServer();
    }, 2000);
    return () => clearTimeout(timer);
  }, [data, darkMode, currency, userId, serverReady, saveToServer]);

  const updateIncome = useCallback((index: number, field: "name" | "value", val: string | number) => {
    setData((d) => {
      const income = [...d.income];
      income[index] = { ...income[index], [field]: field === "value" ? +val || 0 : val };
      return { ...d, income };
    });
  }, []);

  const addIncome = useCallback(() => {
    setData((d) => ({ ...d, income: [...d.income, { id: uid(), name: "New", value: 0 }] }));
  }, []);

  const removeIncome = useCallback((index: number) => {
    setData((d) => ({ ...d, income: d.income.filter((_, i) => i !== index) }));
  }, []);

  const updateCategory = useCallback((ci: number, field: "name" | "color", val: string) => {
    setData((d) => {
      const categories = [...d.categories];
      categories[ci] = { ...categories[ci], [field]: val };
      return { ...d, categories };
    });
  }, []);

  const addCategory = useCallback(() => {
    const colors = ["#FF8B7B", "#FFE066", "#4DB6AC", "#64B5F6", "#CE93D8", "#FFCC80", "#EF9A9A", "#A5D6A7"];
    setData((d) => ({
      ...d,
      categories: [
        ...d.categories,
        { id: uid(), name: "New Category", color: colors[d.categories.length % colors.length], items: [] },
      ],
    }));
  }, []);

  const removeCategory = useCallback((ci: number) => {
    setData((d) => ({ ...d, categories: d.categories.filter((_, i) => i !== ci) }));
  }, []);
  const updateItem = useCallback((ci: number, ii: number, field: keyof ExpenseItem, val: string | number | undefined) => {
    setData((d) => {
      const categories = [...d.categories];
      const items = [...categories[ci].items];
      items[ii] = { ...items[ii], [field]: field === "value" ? +(val as string | number) || 0 : val } as ExpenseItem;
      categories[ci] = { ...categories[ci], items };
      return { ...d, categories };
    });
  }, []);
  const moveItemCategory = useCallback((sourceCi: number, ii: number, targetCi: number) => {
    setData((d) => {
      const categories = [...d.categories];
      const item = categories[sourceCi]?.items[ii];
      if (!item) return d;

      // Remove from source category
      categories[sourceCi] = {
        ...categories[sourceCi],
        items: categories[sourceCi].items.filter((_, idx) => idx !== ii),
      };

      // Add to target category
      categories[targetCi] = {
        ...categories[targetCi],
        items: [...categories[targetCi].items, item],
      };

      return { ...d, categories };
    });
  }, []);

  const addItem = useCallback((ci: number) => {
    setData((d) => {
      const categories = [...d.categories];
      categories[ci] = { ...categories[ci], items: [...categories[ci].items, { id: uid(), name: "New", value: 0 }] };
      return { ...d, categories };
    });
  }, []);

  const removeItem = useCallback((ci: number, ii: number) => {
    setData((d) => {
      const categories = [...d.categories];
      categories[ci] = { ...categories[ci], items: categories[ci].items.filter((_, i) => i !== ii) };
      return { ...d, categories };
    });
  }, []);

  const moveIncome = useCallback((fromIndex: number, toIndex: number) => {
    setData((d) => {
      const income = [...d.income];
      if (toIndex < 0 || toIndex >= income.length) return d;
      const [moved] = income.splice(fromIndex, 1);
      income.splice(toIndex, 0, moved);
      return { ...d, income };
    });
  }, []);

  const moveCategory = useCallback((fromIndex: number, toIndex: number) => {
    setData((d) => {
      const categories = [...d.categories];
      if (toIndex < 0 || toIndex >= categories.length) return d;
      const [moved] = categories.splice(fromIndex, 1);
      categories.splice(toIndex, 0, moved);
      return { ...d, categories };
    });
  }, []);

  const moveItem = useCallback((ci: number, fromIndex: number, toIndex: number) => {
    setData((d) => {
      const categories = [...d.categories];
      const items = [...categories[ci].items];
      if (toIndex < 0 || toIndex >= items.length) return d;
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      categories[ci] = { ...categories[ci], items };
      return { ...d, categories };
    });
  }, []);

  const saveToJson = useCallback(() => {
    const exportData = {
      finance_data: data,
      currency,
      dark_mode: darkMode,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budgetflow-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported to JSON!");
  }, [data, currency, darkMode]);

  const setCurrencyAndSave = useCallback((c: string) => {
    setCurrencyState(c);
    localStorage.setItem(CURRENCY_KEY, c);
  }, []);

  const updateRemainingColor = useCallback((color: string) => {
    setData((d) => ({ ...d, remainingColor: color }));
  }, []);

  const updateIncomeColor = useCallback((color: string) => {
    setData((d) => ({ ...d, incomeColor: color }));
  }, []);

  const importFromJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.finance_data && parsed.finance_data.income && parsed.finance_data.categories) {
          setData(parsed.finance_data);
          if (parsed.currency && defaultCurrencies.includes(parsed.currency)) {
            setCurrencyAndSave(parsed.currency);
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.finance_data));
          toast.success("Imported from JSON!");
        } else {
          toast.error("Invalid JSON format");
        }
      } catch {
        toast.error("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
  }, [setCurrencyAndSave]);

  const exportToCsv = useCallback(() => {
    const headers = ["Name", "Amount", "Category", "Date Range", "Infos", "Cancellation Date", "Billing Period"];
    const rows = [headers];

    data.categories.forEach((cat) => {
      cat.items.forEach((item) => {
        const dateRange = item.startDate
          ? `${formatDateForDisplay(item.startDate)}${item.endDate ? ` -> ${formatDateForDisplay(item.endDate)}` : ""}`
          : "";
        const row = [
          item.name,
          (item.value || 0).toString(),
          cat.name,
          dateRange,
          item.infos || "",
          item.cancellationDate ? formatDateForDisplay(item.cancellationDate) : "",
          item.billingPeriod || "Monthly",
        ];
        const escapedRow = row.map((val) => `"${val.replace(/"/g, '""')}"`);
        rows.push(escapedRow);
      });
    });

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budgetflow-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV!");
  }, [data]);

  const importFromCsv = useCallback((text: string) => {
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
      
      if (lowerName === "income" || lowerName === "salary" || lowerName.includes("salary") || lowerName.includes("income")) {
        continue;
      }
      
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

    toast.success(`Successfully imported ${importedItems.length} expenses!`);
  }, []);

  const save = useCallback(async () => {
    setLoading(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(CURRENCY_KEY, currency);

      if (userId) {
        await api.budget.save(data, darkMode, currency);
      }

      toast.success(userId ? "Saved to server!" : "Saved locally!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Save failed: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [data, darkMode, currency, userId]);

  return {
    data, setData, stats, darkMode, setDarkMode, currency, setCurrency: setCurrencyAndSave, currencies: defaultCurrencies, loading,
    updateIncome, addIncome, removeIncome, moveIncome,
    updateCategory, addCategory, removeCategory, moveCategory,
    updateItem, addItem, removeItem, moveItem, moveItemCategory,
    updateRemainingColor,
    updateIncomeColor,
    importFromCsv,
    exportToCsv,
    save, saveToJson, importFromJson, loadFromServer,
  };
}
