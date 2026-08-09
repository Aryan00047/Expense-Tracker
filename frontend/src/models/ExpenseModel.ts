export type StatementSource = "csv" | "pdf";

/**
 * What the server decided the uploaded document actually was.
 *
 * The client does not choose this and no longer asks the user to: it uploads a
 * file and reads `kind` off the response.
 */
export type DocumentKind = "statement" | "bill";

export interface StatementImportResult {
  kind: "statement";
  importedCount: number;
  creditCount: number;
  skippedRows: number;
  importBatchId: string;
  detectedHeaders: string[];
  /** Things the parser is unsure about, surfaced instead of silently guessed. */
  warnings: string[];
  savedToAccount: boolean;
  source: StatementSource;
  analytics: ExpenseAnalytics;
  /** PDF imports only. */
  pageCount?: number;
  detectedColumns?: string[];
  candidateLineCount?: number;
  dateOrder?: "dmy" | "mdy";
}

export interface BillLineItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  amount: number;
}

/** One bill or invoice, as opposed to a statement full of transactions. */
export interface BillAnalysis {
  kind: "bill";
  source: StatementSource;
  vendor: string;
  /** yyyy-mm-dd, or null when the document carries no readable date. */
  billDate: string | null;
  invoiceNumber: string | null;
  subtotal: number | null;
  taxTotal: number | null;
  discount: number | null;
  total: number | null;
  lineItems: BillLineItem[];
  category: string;
  warnings: string[];
  pageCount: number;
  savedToAccount: boolean;
  savedEntryId: string | null;
}

/** Discriminated on `kind` — the UI switches on it instead of on which box was used. */
export type DocumentUploadResult = StatementImportResult | BillAnalysis;

export interface CategorySpend {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlySpend {
  month: string;
  amount: number;
  income: number;
}

export interface CategoryTrendMonth {
  month: string;
  segments: Record<string, number>;
}

export interface DailySpend {
  date: string;
  amount: number;
}

export type MoneyFlow = "spend" | "transfer" | "investment" | "debt" | "income";

export interface FlowBreakdown {
  flow: Exclude<MoneyFlow, "income">;
  label: string;
  amount: number;
  percentage: number;
}

export interface MerchantSpend {
  merchant: string;
  amount: number;
}

export interface RecentTransaction {
  id: string;
  date: string;
  amount: number;
  direction: "debit" | "credit";
  flow: MoneyFlow;
  category: string;
  description: string;
  merchant: string;
}

export type InsightTone = "positive" | "warning" | "critical" | "neutral";

export interface InsightItem {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
  value?: number;
  changePercent?: number;
  priority: number;
}

export interface RecurringPayment {
  merchant: string;
  category: string;
  averageAmount: number;
  occurrences: number;
  monthsSeen: number;
  lastSeen: string;
  estimatedMonthlyCost: number;
}

export interface OutlierTransaction {
  date: string;
  merchant: string;
  category: string;
  amount: number;
  timesAverage: number;
}

export interface DuplicateCharge {
  merchant: string;
  amount: number;
  dates: string[];
}

export interface WeekdaySpend {
  day: string;
  amount: number;
  count: number;
}

export interface MonthComparison {
  latestMonth: string;
  previousMonth: string;
  latestAmount: number;
  previousAmount: number;
  percent: number;
  partial: boolean;
  throughDay: number;
}

export interface SmartInsights {
  headline: string;
  items: InsightItem[];
  recurring: RecurringPayment[];
  outliers: OutlierTransaction[];
  duplicates: DuplicateCharge[];
  weekdayPattern: WeekdaySpend[];
  dailyAverage: number;
  activeDays: number;
  medianTransaction: number;
  largestTransaction: number;
  projectedMonthlySpend: number;
  monthOverMonthPercent: number | null;
  comparison: MonthComparison | null;
  recurringMonthlyTotal: number;
  coreSpend: number;
  totalOutflow: number;
}

export interface ExpenseAnalytics {
  totalSpend: number;
  totalIncome: number;
  netCashFlow: number;
  transactionCount: number;
  averageSpend: number;
  topCategories: CategorySpend[];
  monthlyTrend: MonthlySpend[];
  categoryTrend: CategoryTrendMonth[];
  stackedCategories: string[];
  dailyTrend: DailySpend[];
  flowBreakdown: FlowBreakdown[];
  topMerchants: MerchantSpend[];
  recentTransactions: RecentTransaction[];
  insights: SmartInsights;
}
