export type Stage = "INPUT" | "GENERATING" | "FINISHED";

export type PresetTargetRole = "boss" | "client" | "greenTea";
export type TargetRole = PresetTargetRole | "custom";

export type RoleOption = {
  hotkey: 1 | 2 | 3;
  id: PresetTargetRole;
  label: string;
  vibe: string;
};
