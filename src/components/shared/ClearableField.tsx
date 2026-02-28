import { useId } from "react";
import { X } from "lucide-react";

type Accent = "cyan" | "violet";

type ClearableFieldProps = {
  /** Optional label shown above the field. */
  label?: string;
  /** HTML input type — ignored when `multiline` is true. */
  type?: "text" | "password";
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  /** Render a `<textarea>` instead of `<input>`. */
  multiline?: boolean;
  /** Accent colour for focus ring / clear-button hover. */
  accent?: Accent;
  /** Extra classes applied to the outer wrapper. */
  className?: string;
  /** Whether the field is read-only (hides the clear button). */
  readOnly?: boolean;
};

const FOCUS_RING: Record<Accent, string> = {
  cyan: "focus:border-cyan-300/50 focus:shadow-[0_0_0_3px_rgba(103,232,249,0.08)]",
  violet:
    "focus:border-violet-300/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)]",
};

const CLEAR_HOVER: Record<Accent, string> = {
  cyan: "hover:text-cyan-300",
  violet: "hover:text-zinc-300",
};

const LABEL_COLOR: Record<Accent, string> = {
  cyan: "text-zinc-400",
  violet: "text-zinc-400",
};

const SHARED_INPUT =
  "w-full rounded-xl border border-white/10 bg-white/3 px-3 pr-8 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 transition";

export function ClearableField({
  label,
  type = "text",
  value,
  placeholder,
  onChange,
  multiline = false,
  accent = "cyan",
  className = "",
  readOnly = false,
}: ClearableFieldProps) {
  const autoId = useId();
  const inputId = label
    ? `field-${label.replace(/\s+/g, "-").toLowerCase()}`
    : autoId;

  const focusCls = FOCUS_RING[accent];
  const showClear = !!value && !readOnly;

  return (
    <fieldset className={className}>
      {label ? (
        <label
          htmlFor={inputId}
          className={`mb-1.5 block text-xs font-medium ${LABEL_COLOR[accent]}`}
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        {multiline ? (
          <textarea
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`zen-scrollbar min-h-20 resize-y leading-6 ${SHARED_INPUT} ${focusCls}`}
          />
        ) : (
          <input
            id={inputId}
            type={type}
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`${SHARED_INPUT} ${focusCls}`}
          />
        )}

        {showClear ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onChange("")}
            className={`absolute right-2 ${multiline ? "top-3" : "top-1/2 -translate-y-1/2"} rounded-full p-0.5 text-zinc-500 transition ${CLEAR_HOVER[accent]}`}
            aria-label={label ? `清除${label}` : "清除"}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}
