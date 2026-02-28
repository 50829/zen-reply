import type { RoleOption } from "../features/zenreply/types";

export const DEFAULT_API_BASE = "https://api.siliconflow.cn/v1";
export const DEFAULT_MODEL_NAME = "Pro/MiniMaxAI/MiniMax-M2.5";

export const ROLE_OPTIONS: RoleOption[] = [
  { hotkey: 1, id: "boss", label: "老板", vibe: "稳重负责，给结论和时间点" },
  { hotkey: 2, id: "client", label: "甲方", vibe: "尊重对方，强调协同与结果" },
  { hotkey: 3, id: "greenTea", label: "绿茶", vibe: "边界清晰，温柔但不暧昧" },
];

export const CUSTOM_ROLE_HOTKEY = 4;
export const CUSTOM_ROLE_DEFAULT_LABEL = "➕自定义";
