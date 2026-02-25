export type Stage = "IDLE" | "INPUT" | "GENERATING" | "FINISHED";

export type TargetRole = "boss" | "client" | "greenTea" | "pigTeammate";

export type RoleOption = {
  hotkey: 1 | 2 | 3 | 4;
  id: TargetRole;
  label: string;
  vibe: string;
};

export const ROLE_OPTIONS: RoleOption[] = [
  { hotkey: 1, id: "boss", label: "老板", vibe: "稳重负责，给结论和时间点" },
  { hotkey: 2, id: "client", label: "甲方", vibe: "尊重对方，强调协同与结果" },
  { hotkey: 3, id: "greenTea", label: "绿茶", vibe: "边界清晰，温柔但不暧昧" },
  { hotkey: 4, id: "pigTeammate", label: "猪队友", vibe: "不撕破脸，直接拉齐动作" },
];

