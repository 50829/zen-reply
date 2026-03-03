import { useCallback } from "react";
import { STYLE_OPTIONS } from "../../shared/constants";
import { useZenReplyContext } from "../../contexts/ZenReplyContext";

type StyleComposerProps = {
  onGenerate: () => void;
};

export function StyleComposer({ onGenerate }: StyleComposerProps) {
  const {
    translateStyle,
    styleMeta,
    isStreaming,
    hasBlockingError,
    selectTranslateStyle,
  } = useZenReplyContext();

  const handleGenerate = useCallback(() => {
    onGenerate();
  }, [onGenerate]);

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/3 p-3">
      <p className="mb-2 text-xs text-zinc-400">英文风格</p>

      <div className="flex flex-wrap items-center gap-2">
        {STYLE_OPTIONS.map((style) => {
          const active = translateStyle === style.id;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => selectTranslateStyle(style.id)}
              className={`rounded-full border px-3 py-1.5 text-xs transition active:scale-[0.97] ${
                active
                  ? "border-violet-300/60 bg-violet-300/20 text-violet-100"
                  : "border-white/15 bg-white/5 text-zinc-200 hover:border-white/35"
              }`}
            >
              {style.hotkey}. {style.label}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-zinc-500">{styleMeta?.vibe}</p>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isStreaming || hasBlockingError}
        className="mt-3 w-full rounded-[14px] border border-violet-300/45 bg-violet-300/15 px-3 py-2 text-sm font-medium text-violet-100 transition hover:bg-violet-300/25 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
      >
        🌐 转换为英文
      </button>
    </div>
  );
}
