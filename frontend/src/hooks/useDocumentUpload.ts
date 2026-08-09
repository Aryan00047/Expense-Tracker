import { useState } from "react";
import {
  DocumentUploadError,
  detectSource,
  uploadDocument,
} from "../services/expenseService";
import type { DocumentUploadResult, StatementSource } from "../models/ExpenseModel";

/**
 * The whole upload lifecycle in one place.
 *
 * This state — chosen file, drag highlight, PDF password, in-flight flag,
 * error banner — used to exist twice, once in the statement card and once in
 * the bill card, differing only in Tailwind classes.
 */
export function useDocumentUpload(onResult: (result: DocumentUploadResult) => void) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [saveToAccount, setSaveToAccount] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const source: StatementSource | null = file ? detectSource(file) : null;

  const acceptFile = (next: File | null) => {
    setErrorMessage(null);
    setNeedsPassword(false);
    setPassword("");

    if (next && !detectSource(next)) {
      setFile(null);
      setErrorMessage("Only .csv and .pdf files are supported.");
      return;
    }

    setFile(next);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      setErrorMessage("Choose a statement or bill first.");
      return;
    }

    setUploading(true);
    setErrorMessage(null);

    try {
      const result = await uploadDocument(file, {
        replaceExisting,
        saveToAccount,
        password,
      });

      setNeedsPassword(false);
      onResult(result);
    } catch (error) {
      if (error instanceof DocumentUploadError) {
        setErrorMessage(error.message);
        setNeedsPassword(error.requiresPassword);
      } else {
        setErrorMessage("Upload failed. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  const onSaveToAccountChange = (checked: boolean) => {
    setSaveToAccount(checked);
    // Replacing only means anything when something is being written.
    if (!checked) setReplaceExisting(true);
  };

  return {
    file,
    source,
    password,
    setPassword,
    needsPassword,
    replaceExisting,
    setReplaceExisting,
    saveToAccount,
    onSaveToAccountChange,
    uploading,
    errorMessage,
    acceptFile,
    submit,
  };
}
