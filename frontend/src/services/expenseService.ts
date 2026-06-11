import api from "./api";
import type { CsvImportResult, ExpenseAnalytics } from "../models/ExpenseModel";

export const uploadExpenseCsv = async (
  csvText: string,
  replaceExisting: boolean,
  saveToAccount: boolean
) => {
  const { data } = await api.post<{ data: CsvImportResult }>("/expenses/upload-csv", {
    csvText,
    replaceExisting,
    saveToAccount,
  });

  return data;
};

export const getExpenseAnalytics = async (filters?: {
  from?: string;
  to?: string;
}) => {
  const { data } = await api.get<{ data: ExpenseAnalytics }>("/expenses/analytics", {
    params: filters,
  });

  return data;
};
