import { load, type Store } from "@tauri-apps/plugin-store";

export type AppSettings = {
  api_key: string;
  api_base: string;
  model_name: string;
};

export const DEFAULT_API_BASE = "https://api.siliconflow.cn/v1";
export const DEFAULT_MODEL_NAME = "Pro/MiniMaxAI/MiniMax-M2.5";

export const DEFAULT_SETTINGS: AppSettings = {
  api_key: "",
  api_base: DEFAULT_API_BASE,
  model_name: DEFAULT_MODEL_NAME,
};

const SETTINGS_STORE_PATH = "zenreply-settings.json";
let storePromise: Promise<Store> | null = null;

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return value;
}

function normalizeValue(value: string | undefined, fallback: string): string {
  const trimmed = (value ?? "").trim();
  return trimmed || fallback;
}

export function normalizeSettings(input: Partial<AppSettings>): AppSettings {
  return {
    api_key: (input.api_key ?? "").trim(),
    api_base: normalizeValue(input.api_base, DEFAULT_API_BASE),
    model_name: normalizeValue(input.model_name, DEFAULT_MODEL_NAME),
  };
}

export function hasApiKey(settings: AppSettings): boolean {
  return settings.api_key.trim().length > 0;
}

async function getSettingsStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load(SETTINGS_STORE_PATH, {
      defaults: DEFAULT_SETTINGS,
      autoSave: false,
    });
  }
  return storePromise;
}

async function persistSettings(store: Store, settings: AppSettings): Promise<void> {
  await Promise.all([
    store.set("api_key", settings.api_key),
    store.set("api_base", settings.api_base),
    store.set("model_name", settings.model_name),
  ]);
  await store.save();
}

export async function readSettings(): Promise<AppSettings> {
  const store = await getSettingsStore();
  const [rawApiKey, rawApiBase, rawModelName] = await Promise.all([
    store.get("api_key"),
    store.get("api_base"),
    store.get("model_name"),
  ]);

  const normalized = normalizeSettings({
    api_key: toOptionalString(rawApiKey),
    api_base: toOptionalString(rawApiBase),
    model_name: toOptionalString(rawModelName),
  });

  await persistSettings(store, normalized);
  return normalized;
}

export async function saveSettings(nextSettings: AppSettings): Promise<AppSettings> {
  const store = await getSettingsStore();
  const normalized = normalizeSettings(nextSettings);
  await persistSettings(store, normalized);
  return normalized;
}
