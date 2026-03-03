import type { RoleOption, StyleOption } from "../features/zenreply/types";

export const DEFAULT_API_BASE = "https://api.siliconflow.cn/v1";
export const DEFAULT_MODEL_NAME = "Pro/MiniMaxAI/MiniMax-M2.5";

export const ROLE_OPTIONS: RoleOption[] = [
  { hotkey: 1, id: "boss", label: "老板", vibe: "稳重负责，给结论和时间点" },
  { hotkey: 2, id: "client", label: "甲方", vibe: "尊重对方，强调协同与结果" },
  { hotkey: 3, id: "lover", label: "恋爱对象", vibe: "情感细腻，有温度但保持自我" },
];

export const CUSTOM_ROLE_HOTKEY = 4;
export const CUSTOM_ROLE_DEFAULT_LABEL = "4. ➕自定义";

export const STYLE_OPTIONS: StyleOption[] = [
  { hotkey: 1, id: "formal",   label: "正式",  vibe: "书面正式，适合商务/学术场景" },
  { hotkey: 2, id: "casual",   label: "轻松",  vibe: "口语自然，适合日常交流" },
  { hotkey: 3, id: "email",    label: "邮件",  vibe: "邮件语气，专业而不失温度" },
  { hotkey: 4, id: "concise",  label: "简洁",  vibe: "直接精炼，去除冗余表达" },
];
