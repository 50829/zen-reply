import type { TargetRole } from "./types";

type BuildPromptParams = {
  rawText: string;
  targetRole: TargetRole;
  contextText?: string;
  customRoleInput?: string;
};

const PRESET_ROLE_LABEL: Record<Exclude<TargetRole, "custom">, string> = {
  boss: "老板",
  client: "甲方",
  greenTea: "绿茶",
};

const PRESET_ROLE_STRATEGY: Record<Exclude<TargetRole, "custom">, string> = {
  boss: "对方偏上位：保持恭敬但有底线，先承接，再给方案和时间点（太极拳风格）。",
  client: "对方偏业务合作方：保持体面与专业，强调协同、风险和交付承诺（软钉子风格）。",
  greenTea: "对方偏关系敏感场景：高情商但边界清晰，避免暧昧和失控情绪。",
};

const AUTHORITY_RE = /(老板|领导|主管|总监|经理|甲方|客户|导师|老师|hr|面试官)/i;
const INTIMATE_RE = /(对象|恋人|伴侣|男友|女友|老公|老婆|暧昧|前任|crush)/i;

function inferCustomStrategy(customRole: string): string {
  const normalized = customRole.trim();
  if (!normalized) {
    return "默认按平级关系处理：保持体面、礼貌、克制，避免对抗性语言。";
  }

  if (AUTHORITY_RE.test(normalized)) {
    return "推断为偏上位关系：恭敬但有边界，先接情绪再给执行动作与时间点（太极拳）。";
  }

  if (INTIMATE_RE.test(normalized)) {
    return "推断为亲密关系：高情商表达，兼顾情绪价值与边界感，避免控制感与说教。";
  }

  return "推断为平级/复杂对象：体面但有防御性，先确认事实，再给可执行方案（软钉子）。";
}

function buildRoleText(targetRole: TargetRole, customRoleInput: string): string {
  if (targetRole === "custom") {
    const safeCustomRole = customRoleInput.trim() || "未命名对象";
    return `你的身份是我的外脑嘴替，现在我要回复一个特殊对象，Ta 的身份/设定是：【${safeCustomRole}】。`;
  }

  return `你的身份是我的外脑嘴替，现在我要回复我的【${PRESET_ROLE_LABEL[targetRole]}】。`;
}

function buildRoleStrategy(targetRole: TargetRole, customRoleInput: string): string {
  if (targetRole === "custom") {
    return inferCustomStrategy(customRoleInput);
  }

  return PRESET_ROLE_STRATEGY[targetRole];
}

export function buildPrompt({
  rawText,
  targetRole,
  contextText,
  customRoleInput,
}: BuildPromptParams): string {
  const safeRaw = rawText.trim() || "（无原始草稿）";
  const safeContext = contextText?.trim() || "（无补充背景）";
  const safeCustomRole = customRoleInput?.trim() || "";

  const roleText = buildRoleText(targetRole, safeCustomRole);
  const roleStrategy = buildRoleStrategy(targetRole, safeCustomRole);

  return [
    roleText,
    "请你深刻理解这个身份特征与中国社会的权力/人情结构。",
    roleStrategy,
    "",
    "用户的真实情绪/草稿是：",
    `“${safeRaw}”`,
    "对方刚才说的话（可选背景）是：",
    `“${safeContext}”`,
    "",
    "任务要求：",
    "1) 清理所有情绪化、攻击性、粗口表达，只保留核心诉求。",
    "2) 生成可直接发送的中文回复正文，语气自然，无 AI 感。",
    "3) 先承接，再给动作，再给时间点/预期，不空喊口号。",
    "4) 长度 60~140 字，最多两句。",
    "5) 禁止输出解释、前言、标题、编号、引号包裹、额外换行。",
    "",
    "直接输出最终回复正文。",
  ].join("\n");
}

