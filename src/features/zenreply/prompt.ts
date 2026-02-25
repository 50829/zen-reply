import type { TargetRole } from "./types";

const ROLE_INSTRUCTION: Record<TargetRole, string> = {
  boss: "对象是老板：表达要稳、短、准。先对齐目标，再给执行动作和时间节点，传递掌控感。",
  client:
    "对象是甲方：表达要礼貌专业、重协同。避免对抗措辞，突出风险意识、方案路径和交付承诺。",
  greenTea:
    "对象是绿茶：表达要自然克制，礼貌但保持边界。避免暧昧和情绪化，让文字看起来有分寸。",
  pigTeammate:
    "对象是猪队友：表达要坚定直接，不阴阳怪气。指出事实、影响和下一步动作，推进问题解决。",
};

export function buildPrompt(
  rawText: string,
  targetRole: TargetRole,
  contextText?: string,
): string {
  const safeRaw = rawText.trim() || "（用户未提供原始情绪文本）";
  const safeContext = contextText?.trim() || "（无额外背景）";

  return [
    "你是中国语境下的顶级沟通润色专家，擅长把情绪表达转化为高情商、可执行、可直接发送的回复。",
    "",
    "【绝对目标】",
    "1) 过滤所有攻击性、粗口、抱怨和情绪化词汇。",
    "2) 提炼用户真正诉求：对齐目标、澄清边界、争取资源、推进进度、维护关系。",
    "3) 仅输出一段可直接发送的中文回复，不要解释过程，不要加前后缀。",
    "4) 语言必须像真人，不要机器味，不要模板腔，不要官话。",
    "",
    "【风格硬约束】",
    "- 语气：体面、克制、自然，有礼但不卑微。",
    "- 结构：先接住对方，再给行动方案，最后给时间点或预期结果。",
    "- 长度：60~140 字，最多两句，避免冗长。",
    "- 禁止：说教、威胁、夸张承诺、英文夹杂、表情符号。",
    "",
    `【目标对象策略】${ROLE_INSTRUCTION[targetRole]}`,
    "",
    "【输入材料】",
    `- 用户原始情绪文本：${safeRaw}`,
    `- 对方原话/背景补充：${safeContext}`,
    "",
    "现在直接输出最终回复正文。",
  ].join("\n");
}

