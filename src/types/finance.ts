export interface IncomeItem {
  id: string;
  name: string;
  value: number;
}

export interface ExpenseItem {
  id: string;
  name: string;
  value: number;
  icon?: string;
  startDate?: string;
  endDate?: string;
  infos?: string;
  cancellationDate?: string;
  billingPeriod?: 'Monthly' | 'Annual';
  noticePeriod?: string;
}

export type CategoryType = "expense" | "investment";

export interface Category {
  id: string;
  name: string;
  color: string;
  /** Categories saved before investment support are treated as expenses. */
  type?: CategoryType;
  items: ExpenseItem[];
}

export interface FinanceData {
  income: IncomeItem[];
  categories: Category[];
  remainingColor?: string;
  incomeColor?: string;
}

export interface Stats {
  income: number;
  expenses: number;
  investments: number;
  remaining: number;
  cats: (Category & { total: number })[];
  expenseCats: (Category & { total: number })[];
  investmentCats: (Category & { total: number })[];
}
