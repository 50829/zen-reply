import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion } from "framer-motion";

const CLIPBOARD_EVENT = "zenreply://clipboard-text";

type ClipboardPayload = {
  text: string;
};

type Stage = "INPUT" | "GENERATING" | "FINISHED";

const CONTEXT_TAGS = [
  { id: 1, label: "老板" },
  { id: 2, label: "甲方" },
  { id: 3, label: "❤️ 暧昧对象" },
  { id: 4, label: "猪队友" },
] as const;

function App() {
  const [originalText, setOriginalText] = useState(
    "选中一段文字后按 Alt+Space 触发",
  );
  const [selectedTag, setSelectedTag] = useState<number>(1);
  const [backgroundInput, setBackgroundInput] = useState("");
  const [stage, setStage] = useState<Stage>("INPUT");
  const [generatedText, setGeneratedText] = useState("");
  const [isGeneratePanelOpen, setIsGeneratePanelOpen] = useState(false);
  const [panelAnimateKey, setPanelAnimateKey] = useState(0);
  const timerRef = useRef<number | null>(null);

  const selectedTagLabel = useMemo(
    () => CONTEXT_TAGS.find((tag) => tag.id === selectedTag)?.label ?? "老板",
    [selectedTag],
  );

  const selectTag = useCallback((tagId: number) => {
    setSelectedTag(tagId);
    setIsGeneratePanelOpen(true);
    setStage((current) => (current === "GENERATING" ? current : "INPUT"));
  }, []);

  const startGenerate = useCallback(() => {
    if (stage === "GENERATING") {
      return;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setIsGeneratePanelOpen(true);
    setStage("GENERATING");
    setGeneratedText("");

    timerRef.current = window.setTimeout(() => {
      const optionalContext = backgroundInput.trim()
        ? `背景：${backgroundInput.trim()}。`
        : "";
      const sourceText = originalText.trim() ? `原句：${originalText.trim()}。` : "";

      setGeneratedText(
        `【${selectedTagLabel}风格】${optionalContext}${sourceText}建议回复：我理解你的顾虑，这件事我来推进到可执行状态，今天内同步你清晰方案与时间点。`,
      );
      setStage("FINISHED");
    }, 700);
  }, [backgroundInput, originalText, selectedTagLabel, stage]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let mounted = true;

    void listen<ClipboardPayload>(CLIPBOARD_EVENT, (event) => {
      setOriginalText(event.payload.text || "");
      setBackgroundInput("");
      setStage("INPUT");
      setGeneratedText("");
      setIsGeneratePanelOpen(false);
      setPanelAnimateKey((current) => current + 1);
    }).then((cleanup) => {
      if (!mounted) {
        cleanup();
        return;
      }
      unlisten = cleanup;
    });

    return () => {
      mounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void invoke("hide_window");
        return;
      }

      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if (!isTyping && event.key >= "1" && event.key <= "4") {
        selectTag(Number(event.key));
        return;
      }

      if (event.key === "Enter" && !event.shiftKey && isGeneratePanelOpen) {
        event.preventDefault();
        if (stage !== "GENERATING") {
          startGenerate();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [isGeneratePanelOpen, selectTag, stage, startGenerate]);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <motion.main
        key={panelAnimateKey}
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[600px] rounded-2xl border border-white/10 bg-black/70 p-5 text-zinc-100 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_26px_80px_rgba(0,0,0,0.55),0_0_36px_rgba(56,189,248,0.22)]"
      >
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">ZenReply</h1>
            <p className="mt-1 text-xs text-zinc-400">
              Alt+Space 唤醒，Esc 隐藏，数字 1-4 快速切换身份
            </p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-zinc-300">
            {stage}
          </span>
        </header>

        <section className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <p className="mb-2 text-xs text-zinc-400">原始文本</p>
          <p className="min-h-16 whitespace-pre-wrap text-sm leading-6 text-zinc-100">
            {originalText || "（剪贴板为空）"}
          </p>
        </section>

        <section className="mt-4">
          <p className="mb-2 text-xs text-zinc-400">沟通对象</p>
          <div className="flex flex-wrap gap-2">
            {CONTEXT_TAGS.map((tag) => {
              const active = selectedTag === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => selectTag(tag.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    active
                      ? "border-cyan-300/60 bg-cyan-300/20 text-cyan-100"
                      : "border-white/15 bg-white/5 text-zinc-200 hover:border-white/35"
                  }`}
                >
                  {tag.id}. {tag.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-4">
          <input
            value={backgroundInput}
            onChange={(event) => setBackgroundInput(event.currentTarget.value)}
            placeholder="对方说了什么？(可选)"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-300/50"
          />
        </section>

        <AnimatePresence initial={false}>
          {isGeneratePanelOpen && (
            <motion.section
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="mt-4 overflow-hidden"
            >
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">生成区</p>
                  <button
                    type="button"
                    onClick={startGenerate}
                    disabled={stage === "GENERATING"}
                    className="rounded-md border border-cyan-300/45 bg-cyan-300/20 px-2.5 py-1 text-xs text-cyan-100 transition hover:bg-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {stage === "GENERATING" ? "生成中..." : "开始生成"}
                  </button>
                </div>

                {stage === "INPUT" && (
                  <p className="mt-3 text-sm text-zinc-300">
                    当前身份「{selectedTagLabel}」。按 Enter 也可以触发生成。
                  </p>
                )}

                {stage === "GENERATING" && (
                  <p className="mt-3 text-sm text-zinc-200 animate-pulse">
                    正在优化语气与措辞...
                  </p>
                )}

                {stage === "FINISHED" && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-100">
                    {generatedText}
                  </p>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
}

export default App;
