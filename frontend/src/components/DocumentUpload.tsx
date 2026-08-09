import { useState } from "react";
import Dropzone from "./upload/Dropzone";
import { useDocumentUpload } from "../hooks/useDocumentUpload";
import type { DocumentUploadResult } from "../models/ExpenseModel";

interface DocumentUploadProps {
  onResult: (result: DocumentUploadResult) => void;
}

const ACCEPTED = ".csv,.pdf,text/csv,application/pdf";

/** What the server made of the upload, said back to the user in one line. */
function summarise(result: DocumentUploadResult): string {
  const scope = result.savedToAccount
    ? "and saved it to your account"
    : "without storing anything";

  if (result.kind === "bill") {
    return `Read a bill from ${result.vendor} ${scope}.`;
  }

  const { importedCount, skippedRows, source, pageCount } = result;
  const from = source === "pdf" ? `${pageCount ?? 0} PDF page(s)` : "your CSV";

  return `Read ${importedCount} expense${importedCount === 1 ? "" : "s"} from ${from}, skipped ${skippedRows} non-expense row${
    skippedRows === 1 ? "" : "s"
  }, ${scope}.`;
}

/**
 * One upload box for everything.
 *
 * There used to be two — "Import a statement" and "Analyse a bill" — which
 * asked the user to classify their own PDF before the app had read a byte of
 * it, and apologised with a "take me to the other tool" link when they got it
 * wrong. The server classifies now, so the question is never asked.
 */
const DocumentUpload = ({ onResult }: DocumentUploadProps) => {
  const [summary, setSummary] = useState<string | null>(null);

  const upload = useDocumentUpload((result) => {
    setSummary(summarise(result));
    onResult(result);
  });

  return (
    <form
      onSubmit={upload.submit}
      className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-100">Upload a document</h2>
        <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
          CSV or PDF
        </span>
      </div>

      <div className="mt-3">
        <Dropzone
          tone="dark"
          file={upload.file}
          title="Drop a file or tap to browse"
          hint="Bank statements, wallet exports, bills and invoices"
          accept={ACCEPTED}
          onFile={(next) => {
            setSummary(null);
            upload.acceptFile(next);
          }}
        />
      </div>

      {upload.source === "pdf" || upload.needsPassword ? (
        <label className="mt-3 block">
          <span className="text-xs text-slate-400">
            PDF password {upload.needsPassword ? "(required)" : "(optional)"}
          </span>
          <input
            type="password"
            value={upload.password}
            onChange={(event) => upload.setPassword(event.target.value)}
            placeholder="Leave blank if not protected"
            autoComplete="off"
            className="mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
          />
        </label>
      ) : null}

      <label className="mt-4 flex items-start gap-3 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={upload.saveToAccount}
          onChange={(event) => upload.onSaveToAccountChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/30"
        />
        <span className="min-w-0">
          Save what you read to my account
          <span className="mt-1 block text-xs text-slate-400">
            Leave off to analyze privately — nothing is written to the database.
          </span>
        </span>
      </label>

      <label className="mt-3 flex items-center gap-3 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={upload.replaceExisting}
          onChange={(event) => upload.setReplaceExisting(event.target.checked)}
          disabled={!upload.saveToAccount}
          className="h-4 w-4 shrink-0 rounded border-white/30 disabled:opacity-40"
        />
        <span className={upload.saveToAccount ? "" : "text-slate-500"}>
          Replace previously imported transactions
        </span>
      </label>

      <button
        type="submit"
        disabled={upload.uploading || !upload.file}
        className="mt-5 w-full rounded-full px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 enabled:bg-emerald-300 enabled:text-slate-950 enabled:hover:bg-emerald-200"
      >
        {upload.uploading ? "Reading document..." : "Analyze document"}
      </button>

      <p className="mt-3 text-xs leading-5 text-slate-400">
        Statements are read row by row, bills line by line — whichever the file
        turns out to be. Scanned or image-only PDFs are not supported.
      </p>

      <div aria-live="polite" className="mt-auto">
        {summary ? (
          <p className="mt-3 rounded-xl bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
            {summary}
          </p>
        ) : null}
        {upload.errorMessage ? (
          <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {upload.errorMessage}
          </p>
        ) : null}
      </div>
    </form>
  );
};

export default DocumentUpload;
