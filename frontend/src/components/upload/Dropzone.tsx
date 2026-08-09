import { useRef, useState } from "react";

export type DropzoneTone = "light" | "dark";

const TONES: Record<DropzoneTone, { idle: string; active: string; title: string; hint: string }> = {
  dark: {
    idle: "border-emerald-300/40 bg-slate-900/40 hover:border-emerald-300/70",
    active: "border-emerald-300 bg-emerald-400/10",
    title: "text-slate-100",
    hint: "text-slate-400",
  },
  light: {
    idle: "border-slate-300 bg-slate-50 hover:border-emerald-400",
    active: "border-emerald-500 bg-emerald-50",
    title: "text-slate-900",
    hint: "text-slate-500",
  },
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface DropzoneProps {
  tone?: DropzoneTone;
  file: File | null;
  /** Shown when nothing is selected. */
  title: string;
  hint: string;
  accept: string;
  onFile: (file: File | null) => void;
}

/**
 * The file picker, with no opinion about what the file is for.
 *
 * Purely presentational so both the dark hero and any light card can use it —
 * the two upload cards it replaced differed only in these colours.
 */
const Dropzone = ({ tone = "light", file, title, hint, accept, onFile }: DropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const palette = TONES[tone];

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        onFile(event.dataTransfer.files?.[0] ?? null);
      }}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-2xl border border-dashed px-4 py-6 text-center transition ${
        dragActive ? palette.active : palette.idle
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        className="sr-only"
      />
      {file ? (
        <div className="min-w-0">
          <p className={`truncate text-sm font-medium ${palette.title}`}>{file.name}</p>
          <p className={`mt-1 text-xs ${palette.hint}`}>
            {formatBytes(file.size)} • tap to change
          </p>
        </div>
      ) : (
        <div>
          <p className={`text-sm font-medium ${palette.title}`}>{title}</p>
          <p className={`mt-1 text-xs ${palette.hint}`}>{hint}</p>
        </div>
      )}
    </div>
  );
};

export default Dropzone;
