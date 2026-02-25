import type { TargetRole } from "./types";

type MockReplyParams = {
  rawText: string;
  targetRole: TargetRole;
  contextText: string;
  prompt: string;
};

const REPLY_LIBRARY: Record<TargetRole, string> = {
  boss: "我理解这个事项的紧急性，我会先把关键风险和可行路径整理成一页结论，今天下班前给您确认，确认后我立刻推进落地。",
  client:
    "感谢您及时反馈，这个点我们已经同步关注，我这边会先给您一版可执行方案和对应时间表，今天内发您确认，确保进度和质量都可控。",
  greenTea:
    "我明白你的想法，也谢谢你愿意直说；这件事我会按流程认真处理，结果出来第一时间同步你，我们把重点放在把事情做好。",
  pigTeammate:
    "这个问题我已经收到，我们先把分工和截止时间对齐一下：我先补齐核心部分，你今天把依赖项给到我，晚些我们一起过一遍并直接提交。",
};

function shorten(input: string, max = 30): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max)}...`;
}

export function buildMockReply({
  rawText,
  targetRole,
  contextText,
  prompt,
}: MockReplyParams): string {
  // Keep prompt in the flow so swapping mock -> real API is one-line.
  void prompt;

  const quotedContext = shorten(contextText);
  const emotionCore = shorten(rawText, 24);
  const base = REPLY_LIBRARY[targetRole];

  if (quotedContext && emotionCore) {
    return `关于你提到的“${quotedContext}”，我理解你真正担心的是“${emotionCore}”。${base}`;
  }

  if (quotedContext) {
    return `关于你提到的“${quotedContext}”，${base}`;
  }

  if (emotionCore) {
    return `我理解你现在最在意的是“${emotionCore}”。${base}`;
  }

  return base;
}

