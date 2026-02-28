import { useZenReplyContext } from "../../contexts/ZenReplyContext";

export function SourceTextCard() {
  const { stage, rawText, setRawText } = useZenReplyContext();

  return (
    <section className="rounded-2xl border border-white/10 bg-white/3 p-3">
      <p className="mb-2 text-xs text-zinc-400">原始文本</p>
      {stage === "INPUT" ? (
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.currentTarget.value)}
          placeholder="请在聊天框选中文本后按 Alt+Space，或直接在此输入"
          className="zen-scrollbar min-h-20 w-full resize-y rounded-xl border border-white/10 bg-white/2 px-2 py-2 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-300/50"
        />
      ) : (
        <p className="zen-scrollbar max-h-28 min-h-12 overflow-y-auto whitespace-pre-wrap pr-2 text-sm leading-6 text-zinc-100">
          {rawText || "请在聊天框选中文本后按 Alt+Space"}
        </p>
      )}
    </section>
  );
}
