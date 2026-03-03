export type Stage = "INPUT" | "GENERATING" | "FINISHED";

export type Mode = "reply" | "translate";

export type PresetTargetRole = "boss" | "client" | "greenTea";
export type TargetRole = PresetTargetRole | "custom";

export type RoleOption = {
  hotkey: 1 | 2 | 3;
  id: PresetTargetRole;
  label: string;
  vibe: string;
};

export type TranslateStyle = "formal" | "casual" | "email" | "concise";

export type StyleOption = {
  hotkey: 1 | 2 | 3 | 4;
  id: TranslateStyle;
  label: string;
  vibe: string;
};
