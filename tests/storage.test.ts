import { beforeEach, describe, expect, it, vi } from "vitest";

const syncState: Record<string, unknown> = {};
const localState: Record<string, unknown> = {};

vi.mock("wxt/browser", () => {
  return {
    browser: {
      storage: {
        sync: {
          get: vi.fn(async (key: string) => ({ [key]: syncState[key] })),
          set: vi.fn(async (value: Record<string, unknown>) =>
            Object.assign(syncState, value),
          ),
        },
        local: {
          get: vi.fn(async (key: string) => ({ [key]: localState[key] })),
          set: vi.fn(async (value: Record<string, unknown>) =>
            Object.assign(localState, value),
          ),
        },
      },
    },
  };
});

describe("storage helpers", () => {
  beforeEach(() => {
    for (const key of Object.keys(syncState)) delete syncState[key];
    for (const key of Object.keys(localState)) delete localState[key];
  });

  it("hydrates default settings when storage is empty", async () => {
    const { getSettings } = await import("@/shared/storage");
    const settings = await getSettings();
    expect(settings.version).toBe(2);
    expect(settings.lastLang).toBe(true);
  });

  it("persists partial updates into the settings object", async () => {
    const { updateSettings } = await import("@/shared/storage");
    const settings = await updateSettings({
      dict1: "en",
      dict2: "it",
      translContext: true,
    });
    expect(settings.dict1).toBe("en");
    expect(settings.translContext).toBe(true);
  });
});
