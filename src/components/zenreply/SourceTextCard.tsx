import { useZenReplyContext } from "../../contexts/ZenReplyContext";
import { ClearableField } from "../shared/ClearableField";

export function SourceTextCard() {
  const { stage, rawText, setRawText } = useZenReplyContext();

  return (
    <section className="rounded-2xl border border-white/10 bg-white/3 p-3">
      <p className="mb-2 text-xs text-zinc-400">原始文本</p>
      {stage === "INPUT" ? (
        <ClearableField
          value={rawText}
          onChange={setRawText}
          placeholder="请在聊天框选中文本后按 Alt+Space，或直接在此输入"
          multiline
          accent="cyan"
        />
      ) : (
        <p className="zen-scrollbar max-h-28 min-h-12 overflow-y-auto whitespace-pre-wrap pr-2 text-sm leading-6 text-zinc-100">
          {rawText || "请在聊天框选中文本后按 Alt+Space"}
        </p>
      )}
    </section>
  );
}
