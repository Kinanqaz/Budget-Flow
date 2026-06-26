export interface IncomeItem {
  id: string;
  name: string;
  value: number;
}

export interface ExpenseItem {
  id: string;
  name: string;
  value: number;
  startDate?: string;
  endDate?: string;
  infos?: string;
  cancellationDate?: string;
  billingPeriod?: 'Monthly' | 'Annual';
  noticePeriod?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  items: ExpenseItem[];
}

export interface FinanceData {
  income: IncomeItem[];
  categories: Category[];
}

export interface Stats {
  income: number;
  expenses: number;
  remaining: number;
  cats: (Category & { total: number })[];
}
