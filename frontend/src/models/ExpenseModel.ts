export interface CsvImportResult {
  importedCount: number;
  skippedRows: number;
  importBatchId: string;
  detectedHeaders: string[];
  savedToAccount: boolean;
  analytics: ExpenseAnalytics;
}

export interface CategorySpend {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlySpend {
  month: string;
  amount: number;
}

export interface MerchantSpend {
  merchant: string;
  amount: number;
}

export interface RecentTransaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  merchant: string;
}

export interface ExpenseAnalytics {
  totalSpend: number;
  transactionCount: number;
  averageSpend: number;
  topCategories: CategorySpend[];
  monthlyTrend: MonthlySpend[];
  topMerchants: MerchantSpend[];
  recentTransactions: RecentTransaction[];
}
