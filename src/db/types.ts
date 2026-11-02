export type CalculationMode = 'manual' | 'automatic';
export type CategoryKind = 'general' | 'travel';

export interface TravelDetails {
  from: string;
  to: string;
  passengers: number;
  mode: string;
  purpose: string;
}

export interface User {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD (local calendar date)
  categoryId: string;
  description: string;
  quantity: number;
  calculationMode: CalculationMode;
  unitPrice: number | null;
  totalAmount: number;
  travelDetails?: TravelDetails | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  kind?: CategoryKind;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
}

export interface Metadata {
  id: string;
  key: string;
  value: string;
}

export interface ExpenseInput {
  date: string;
  categoryId: string;
  description: string;
  quantity: number;
  calculationMode: CalculationMode;
  unitPrice: number | null;
  totalAmount: number;
  travelDetails?: TravelDetails | null;
}

export interface CategoryWithUsage extends Category {
  expenseCount: number;
  totalAmount: number;
}

export interface BackupPayload {
  app: 'MyVoucher';
  appVersion: string;
  databaseName: 'MyVoucherDB';
  databaseVersion: number;
  exportedAt: string;
  data: {
    users: User[];
    expenses: Expense[];
    categories: Category[];
    settings: Setting[];
    metadata: Metadata[];
  };
}

export interface BackupSummary {
  exportedAt: string;
  appVersion: string;
  databaseVersion: number;
  userCount: number;
  expenseCount: number;
  categoryCount: number;
}
