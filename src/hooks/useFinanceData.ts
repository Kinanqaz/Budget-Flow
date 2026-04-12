import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FinanceData, Stats } from "@/types/finance";
import { toast } from "sonner";

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
  } catch { }
  return defaultData;
}

function loadCurrency(): string {
  try {
    const raw = localStorage.getItem(CURRENCY_KEY);
    if (raw && defaultCurrencies.includes(raw)) return raw;
  } catch { }
  return "€";
}

export function useFinanceData(userId: string | undefined) {
  const [data, setData] = useState<FinanceData>(() => userId ? loadFromStorage() : defaultData);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [currency, setCurrency] = useState<string>(loadCurrency);
  const [loading, setLoading] = useState(false);

  const stats: Stats = useMemo(() => {
    const income = Math.round(data.income.reduce((s, i) => s + (i.value || 0), 0));
    const cats = data.categories.map((c) => ({
      ...c,
      total: Math.round(c.items.reduce((s, i) => s + (i.value || 0), 0)),
    }));
    const expenses = cats.reduce((s, c) => s + c.total, 0);
    return { income, cats, expenses, remaining: income - expenses };
  }, [data]);

  const loadFromSupabase = useCallback(async () => {
    if (!userId) return;
    const { data: row } = await supabase
      .from("budget_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (row) {
      const fd = row.finance_data as unknown as FinanceData;
      if (fd && fd.income && fd.categories) {
        setData(fd);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fd));
      }
      setDarkMode(row.dark_mode);
      document.documentElement.classList.toggle("dark", row.dark_mode);
    }
  }, [userId]);

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

  const updateItem = useCallback((ci: number, ii: number, field: "name" | "value", val: string | number) => {
    setData((d) => {
      const categories = [...d.categories];
      const items = [...categories[ci].items];
      items[ii] = { ...items[ii], [field]: field === "value" ? +val || 0 : val };
      categories[ci] = { ...categories[ci], items };
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
      } catch (err) {
        toast.error("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
  }, []);

  const setCurrencyAndSave = useCallback((c: string) => {
    setCurrency(c);
    localStorage.setItem(CURRENCY_KEY, c);
  }, []);

  const save = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(CURRENCY_KEY, currency);

      const { error } = await supabase
        .from("budget_settings")
        .upsert({
          id: userId,
          user_id: userId,
          finance_data: data as any,
          dark_mode: document.documentElement.classList.contains("dark"),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success("Saved!");
    } catch (e: any) {
      console.error("Save error:", e);
      toast.error("Error saving: " + (e.message || "Unknown"));
    } finally {
      setLoading(false);
    }
  }, [data, userId]);

  return {
    data, stats, darkMode, setDarkMode, currency, setCurrency: setCurrencyAndSave, currencies: defaultCurrencies, loading,
    updateIncome, addIncome, removeIncome,
    updateCategory, addCategory, removeCategory,
    updateItem, addItem, removeItem,
    save, saveToJson, importFromJson, loadFromSupabase,
  };
}
