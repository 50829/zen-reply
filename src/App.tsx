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

const STREAM_SPEED_MS = 22;

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
  const [copiedHint, setCopiedHint] = useState("");
  const streamTimerRef = useRef<number | null>(null);
  const hintTimerRef = useRef<number | null>(null);

  const selectedTagLabel = useMemo(
    () => CONTEXT_TAGS.find((tag) => tag.id === selectedTag)?.label ?? "老板",
    [selectedTag],
  );

  const selectTag = useCallback((tagId: number) => {
    setSelectedTag(tagId);
    setIsGeneratePanelOpen(true);
    setGeneratedText("");
    setStage("INPUT");
  }, []);

  const buildMockReply = useCallback(() => {
    const contextPart = backgroundInput.trim()
      ? `补充背景：${backgroundInput.trim()}。`
      : "";
    const sourcePart = originalText.trim() ? `对方原话：${originalText.trim()}。` : "";

    return `【${selectedTagLabel}风格】${contextPart}${sourcePart}建议回复：收到你的信息了，这个点我已经理解。我会先把关键目标和约束整理成一个清晰方案，今天内给你可执行版本，我们对齐后马上推进。`;
  }, [backgroundInput, originalText, selectedTagLabel]);

  const startGenerate = useCallback(() => {
    if (stage === "GENERATING") {
      return;
    }

    if (streamTimerRef.current) {
      window.clearInterval(streamTimerRef.current);
    }

    setIsGeneratePanelOpen(true);
    setStage("GENERATING");
    setGeneratedText("");
    setCopiedHint("");

    const streamText = buildMockReply();
    let index = 0;

    streamTimerRef.current = window.setInterval(() => {
      index += 1;
      setGeneratedText(streamText.slice(0, index));
      if (index >= streamText.length) {
        if (streamTimerRef.current) {
          window.clearInterval(streamTimerRef.current);
        }
        setStage("FINISHED");
      }
    }, STREAM_SPEED_MS);
  }, [buildMockReply, stage]);

  const confirmAndCopy = useCallback(async () => {
    if (!generatedText.trim()) {
      return;
    }

    try {
      await invoke("copy_text_to_clipboard", { text: generatedText });
      setCopiedHint("已复制到剪贴板，可直接 Ctrl+V");
      if (hintTimerRef.current) {
        window.clearTimeout(hintTimerRef.current);
      }
      hintTimerRef.current = window.setTimeout(() => {
        setCopiedHint("");
      }, 1800);
      await invoke("hide_window");
    } catch {
      setCopiedHint("复制失败，请重试");
    }
  }, [generatedText]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let mounted = true;

    void listen<ClipboardPayload>(CLIPBOARD_EVENT, (event) => {
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
      }
      setOriginalText(event.payload.text?.trim() || "");
      setBackgroundInput("");
      setStage("INPUT");
      setGeneratedText("");
      setIsGeneratePanelOpen(false);
      setCopiedHint("");
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
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
      }
      if (hintTimerRef.current) {
        window.clearTimeout(hintTimerRef.current);
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

      if (event.key === "Enter" && stage === "FINISHED") {
        event.preventDefault();
        void confirmAndCopy();
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
    };
  }, [confirmAndCopy, isGeneratePanelOpen, selectTag, stage, startGenerate]);

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden p-4">
      <motion.main
        key={panelAnimateKey}
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[600px] rounded-[20px] border border-white/10 bg-black/85 p-5 text-zinc-100 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(255,255,255,0.05),0_20px_80px_rgba(0,0,0,0.78),0_0_32px_rgba(34,211,238,0.15)]"
      >
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">ZenReply</h1>
            <p className="mt-1 text-xs text-zinc-400">
              Alt+Space 自动复制选中文本并唤醒，Esc 隐藏，1-4 切换身份
            </p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-zinc-300">
            {stage}
          </span>
        </header>

        <section className="rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
          <p className="mb-2 text-xs text-zinc-400">原始文本</p>
          <p className="zen-scrollbar max-h-24 min-h-16 overflow-y-auto whitespace-pre-wrap pr-2 text-sm leading-6 text-zinc-100">
            {originalText || "（未捕获到选中文本，请先选中内容后按 Alt+Space）"}
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
            className="w-full rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-300/50"
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
              <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">生成区</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startGenerate}
                      disabled={stage === "GENERATING"}
                      className="rounded-md border border-cyan-300/45 bg-cyan-300/20 px-2.5 py-1 text-xs text-cyan-100 transition hover:bg-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {stage === "GENERATING" ? "生成中..." : "开始生成"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmAndCopy()}
                      disabled={stage !== "FINISHED"}
                      className="rounded-md border border-emerald-300/45 bg-emerald-300/15 px-2.5 py-1 text-xs text-emerald-100 transition hover:bg-emerald-300/25 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      确认
                    </button>
                  </div>
                </div>

                {stage === "INPUT" && (
                  <p className="mt-3 text-sm text-zinc-300">
                    当前身份「{selectedTagLabel}」。按 Enter 触发预设回复生成。
                  </p>
                )}

                {stage === "GENERATING" && (
                  <div className="mt-3">
                    <p className="zen-scrollbar max-h-28 overflow-y-auto whitespace-pre-wrap pr-2 text-sm leading-6 text-zinc-100">
                      {generatedText}
                    </p>
                    <p className="mt-2 text-xs text-zinc-400">正在流式生成...</p>
                  </div>
                )}

                {stage === "FINISHED" && (
                  <div className="mt-3">
                    <p className="zen-scrollbar max-h-32 overflow-y-auto whitespace-pre-wrap pr-2 text-sm leading-6 text-zinc-100">
                      {generatedText}
                    </p>
                    <p className="mt-2 text-xs text-zinc-400">
                      Enter 可再次生成，确认后写入剪贴板。
                    </p>
                  </div>
                )}

                {copiedHint && (
                  <p className="mt-2 text-xs text-emerald-200">{copiedHint}</p>
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
