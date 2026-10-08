import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoSeed, DEMO_USERS } from "../src/data/demoSeed";

// These adapter tests use simulated APIs. They do not claim notification delivery on a device.
const mocks = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  native: new Map<
    string,
    { identifier: string; content: { data: Record<string, unknown> } }
  >(),
  granted: true,
  mode: "demo",
  nextId: 0,
  schedule: vi.fn(),
  cancel: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn(),
  request: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => mocks.storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mocks.storage.set(key, value);
    },
    removeItem: async (key: string) => {
      mocks.storage.delete(key);
    },
  },
}));
vi.mock("expo-constants", () => ({
  default: {
    executionEnvironment: "standalone",
    easConfig: { projectId: "test-project" },
  },
  ExecutionEnvironment: { StoreClient: "storeClient" },
}));
vi.mock("../src/lib/config", () => ({
  get mode() {
    return mocks.mode;
  },
}));
vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: "patient-a" } } },
        error: null,
      }),
    },
  },
}));
vi.mock("../src/data/SupabaseRepository", () => ({
  registerDeviceToken: mocks.register,
  unregisterDeviceTokens: mocks.unregister,
}));
vi.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationVisibility: { PRIVATE: 0 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DATE: "date" },
  setNotificationChannelAsync: async () => undefined,
  setNotificationHandler: () => undefined,
  getPermissionsAsync: async () => ({ granted: mocks.granted }),
  requestPermissionsAsync: mocks.request,
  getAllScheduledNotificationsAsync: async () => [...mocks.native.values()],
  scheduleNotificationAsync: mocks.schedule,
  cancelScheduledNotificationAsync: mocks.cancel,
  getExpoPushTokenAsync: async () => ({ data: "ExponentPushToken[test]" }),
}));

const NOW = new Date("2026-10-08T02:00:00Z");
const PATIENT = DEMO_USERS.find((user) => user.id === "patient-a")!;

describe("notification service scheduling and honest status", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubEnv("EXPO_PUBLIC_ENABLE_REMOTE_PUSH", "false");
    mocks.storage.clear();
    mocks.native.clear();
    mocks.granted = true;
    mocks.mode = "demo";
    mocks.nextId = 0;
    mocks.register.mockResolvedValue(undefined);
    mocks.unregister.mockResolvedValue(undefined);
    mocks.request.mockImplementation(async () => ({ granted: mocks.granted }));
    mocks.schedule.mockImplementation(
      async (request: { content: { data: Record<string, unknown> } }) => {
        const id = `notification-${++mocks.nextId}`;
        mocks.native.set(id, { identifier: id, content: request.content });
        return id;
      },
    );
    mocks.cancel.mockImplementation(async (id: string) => {
      mocks.native.delete(id);
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("retains native identifiers on a 30-second refresh and only reconciles changed versions", async () => {
    const service = await import("../src/services/notifications");
    const data = createDemoSeed(NOW);
    await service.syncReminders(data, PATIENT, NOW);
    const firstCount = mocks.schedule.mock.calls.length;
    const identifiers = [...mocks.native.keys()];
    vi.setSystemTime(new Date(NOW.getTime() + 30000));
    await service.syncReminders(data, PATIENT, new Date());
    expect(mocks.schedule).toHaveBeenCalledTimes(firstCount);
    expect([...mocks.native.keys()]).toEqual(identifiers);
    data.medications[0].version += 1;
    await service.syncReminders(data, PATIENT, new Date());
    expect(mocks.cancel.mock.calls.length).toBeGreaterThan(0);
    expect(
      [...mocks.native.values()].filter((item) =>
        String(item.content.data.key).includes("medication-a:1:"),
      ),
    ).toHaveLength(0);
    expect(service.getReminderStatus()).toContain("ตั้งการเตือนบนเครื่อง");
  });

  it("cancels account reminders and pauses native scheduling for the simulated demo clock", async () => {
    const service = await import("../src/services/notifications");
    const data = createDemoSeed(NOW);
    await service.syncReminders(data, PATIENT, NOW);
    expect(mocks.native.size).toBeGreaterThan(0);
    await service.syncReminders(
      data,
      PATIENT,
      new Date(NOW.getTime() + 2 * 3600000),
    );
    expect(mocks.native.size).toBe(0);
    expect(service.getReminderStatus()).toContain("กำลังใช้เวลาสาธิต");
    await service.syncReminders(data, PATIENT, NOW);
    await service.clearReminders();
    expect(mocks.native.size).toBe(0);
  });

  it("reports denied permission and a scheduling failure without claiming permission means delivery", async () => {
    const service = await import("../src/services/notifications");
    const data = createDemoSeed(NOW);
    mocks.granted = false;
    await service.syncReminders(data, PATIENT, NOW);
    expect(await service.requestReminders()).toContain("ยังไม่ได้อนุญาต");
    expect(mocks.schedule).not.toHaveBeenCalled();
    mocks.granted = true;
    mocks.schedule.mockRejectedValueOnce(new Error("native scheduling failed"));
    await service.syncReminders(data, PATIENT, NOW).catch(() => undefined);
    expect(service.getReminderStatus()).toContain("บางรายการไม่สำเร็จ");
  });

  it("chooses remote delivery on successful registration and unregisters only its installation", async () => {
    mocks.mode = "supabase";
    vi.stubEnv("EXPO_PUBLIC_ENABLE_REMOTE_PUSH", "true");
    const service = await import("../src/services/notifications");
    await service.syncReminders(createDemoSeed(NOW), PATIENT, NOW);
    expect(mocks.register).toHaveBeenCalledTimes(1);
    expect(mocks.schedule).not.toHaveBeenCalled();
    expect(service.getReminderStatus()).toContain(
      "พักการเตือนบนเครื่องเพื่อไม่ให้ซ้ำ",
    );
    await service.clearReminders();
    expect(mocks.unregister.mock.calls[0][1]).toMatch(/^gan-/);
  });

  it("falls back to local delivery with a visible remote registration error", async () => {
    mocks.mode = "supabase";
    vi.stubEnv("EXPO_PUBLIC_ENABLE_REMOTE_PUSH", "true");
    mocks.register.mockRejectedValueOnce(new Error("offline"));
    const service = await import("../src/services/notifications");
    await service.syncReminders(createDemoSeed(NOW), PATIENT, NOW);
    expect(mocks.native.size).toBeGreaterThan(0);
    expect(service.getReminderStatus()).toContain(
      "ลงทะเบียนการเตือนจากเซิร์ฟเวอร์ไม่สำเร็จ",
    );
    expect(service.getReminderStatus()).toContain("ตั้งการเตือนบนเครื่อง");
  });
});
