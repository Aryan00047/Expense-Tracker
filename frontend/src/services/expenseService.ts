import { AxiosError } from "axios";
import api from "./api";
import type {
  DocumentUploadResult,
  ExpenseAnalytics,
  StatementSource,
} from "../models/ExpenseModel";

export interface DocumentUploadOptions {
  replaceExisting: boolean;
  saveToAccount: boolean;
  password?: string;
}

export class DocumentUploadError extends Error {
  requiresPassword: boolean;

  constructor(message: string, requiresPassword = false) {
    super(message);
    this.name = "DocumentUploadError";
    this.requiresPassword = requiresPassword;
  }
}

function toUploadError(error: unknown, fallback: string): DocumentUploadError {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | { message?: string; requiresPassword?: boolean }
      | undefined;

    return new DocumentUploadError(
      data?.message || error.message || fallback,
      Boolean(data?.requiresPassword)
    );
  }

  if (error instanceof Error) {
    return new DocumentUploadError(error.message);
  }

  return new DocumentUploadError(fallback);
}

/** Which transport the file needs — not which kind of document it holds. */
export const detectSource = (file: File): StatementSource | null => {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return "csv";
  if (name.endsWith(".pdf")) return "pdf";
  if (file.type === "text/csv") return "csv";
  if (file.type === "application/pdf") return "pdf";
  return null;
};

/** Reads a File into base64 without the `data:...;base64,` prefix. */
const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });

/**
 * Uploads any supported financial document.
 *
 * There is deliberately no `uploadStatement` / `uploadBill` split: the client
 * cannot tell a bank statement from an invoice without parsing it, and the
 * server can. It posts the file and reads `kind` off the answer.
 */
export const uploadDocument = async (
  file: File,
  { replaceExisting, saveToAccount, password }: DocumentUploadOptions
): Promise<DocumentUploadResult> => {
  try {
    const source = detectSource(file);
    if (!source) {
      throw new DocumentUploadError("Only .csv and .pdf files are supported.");
    }

    const payload =
      source === "csv"
        ? { csvText: await file.text() }
        : { pdfBase64: await fileToBase64(file), password: password || undefined };

    const { data } = await api.post<{ data: DocumentUploadResult }>(
      "/expenses/documents",
      { ...payload, replaceExisting, saveToAccount }
    );

    return data.data;
  } catch (error) {
    if (error instanceof DocumentUploadError) throw error;
    throw toUploadError(error, "Upload failed.");
  }
};

/** Deletes every transaction this account has stored, and returns the empty analytics. */
export const clearExpenseData = async () => {
  const { data } = await api.delete<{
    message: string;
    data: { deletedCount: number; analytics: ExpenseAnalytics };
  }>("/expenses");

  return data;
};

export const getExpenseAnalytics = async (filters?: {
  from?: string;
  to?: string;
}) => {
  const { data } = await api.get<{ data: ExpenseAnalytics }>(
    "/expenses/analytics",
    { params: filters }
  );

  return data;
};
