import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type { HealthData, Profile } from "../domain/types";
import { mode } from "../lib/config";
import { supabase } from "../lib/supabase";
import {
  registerDeviceToken,
  unregisterDeviceTokens,
} from "../data/SupabaseRepository";
import {
  isSimulatedReminderClock,
  planReminders,
  reminderFingerprint,
} from "./reminderPlan";

const KEY = "gan-local-reminders-v1";
const REMOTE_KEY = "gan-remote-reminder-owner-v1";
const DEVICE_KEY = "gan-reminder-device-v1";
type Notifications = typeof import("expo-notifications");
type ScheduledEntry = { id: string; key: string; triggerAt: string };
type StoredSchedule = {
  version: 2;
  userId: string | null;
  fingerprint: string;
  entries: ScheduledEntry[];
};
type Context = { data: HealthData; user: Profile | null; now: Date };
let context: Context | null = null;
let chain: Promise<unknown> = Promise.resolve();
let cachedSchedule: StoredSchedule | null = null;
let lastNativeCheck = 0;
let registeredUser: string | null = null;
let lastRemoteAttempt = 0;
let localStatus =
  Platform.OS === "web"
    ? "บนเว็บใช้รายการเตือนในแอป เปิดบน Android เพื่อเปิดการแจ้งเตือน"
    : "ยังไม่ได้ตรวจสอบสิทธิการแจ้งเตือน";
let remoteStatus = "";
let publishedStatus = localStatus;
const listeners = new Set<() => void>();

export function getReminderStatus(): string {
  return [localStatus, remoteStatus].filter(Boolean).join("\n");
}
export function subscribeReminderStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function status(local: string, remote = remoteStatus): void {
  localStatus = local;
  remoteStatus = remote;
  const latest = getReminderStatus();
  if (publishedStatus === latest) return;
  publishedStatus = latest;
  listeners.forEach((listener) => listener());
}
async function api(): Promise<Notifications | null> {
  return Platform.OS === "web" ? null : import("expo-notifications");
}
function enqueue<T>(action: () => Promise<T>): Promise<T> {
  const run = chain.catch(() => undefined).then(action);
  chain = run;
  return run;
}
async function configure(n: Notifications): Promise<void> {
  if (Platform.OS === "android") {
    await n.setNotificationChannelAsync("health", {
      name: "รายการสุขภาพ",
      importance: n.AndroidImportance.HIGH,
      lockscreenVisibility: n.AndroidNotificationVisibility.PRIVATE,
    });
  }
  n.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function readSchedule(): Promise<StoredSchedule> {
  if (cachedSchedule) return cachedSchedule;
  const raw = await AsyncStorage.getItem(KEY);
  const saved: unknown = raw ? JSON.parse(raw) : null;
  // Migrate the earlier ID-only format so obsolete reminders are cancelled safely.
  if (Array.isArray(saved)) {
    return (cachedSchedule = {
      version: 2,
      userId: null,
      fingerprint: "",
      entries: saved
        .filter((id): id is string => typeof id === "string")
        .map((id) => ({ id, key: "", triggerAt: "" })),
    });
  }
  if (
    saved &&
    typeof saved === "object" &&
    "version" in saved &&
    saved.version === 2 &&
    "entries" in saved &&
    Array.isArray(saved.entries)
  ) {
    return (cachedSchedule = saved as StoredSchedule);
  }
  return (cachedSchedule = {
    version: 2,
    userId: null,
    fingerprint: "",
    entries: [],
  });
}
async function persist(schedule: StoredSchedule): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(schedule));
  cachedSchedule = schedule;
}

async function clearLocal(n: Notifications): Promise<void> {
  const scheduled = await n.getAllScheduledNotificationsAsync();
  const stored = await readSchedule().catch(() => ({
    entries: [] as ScheduledEntry[],
  }));
  const ids = new Set(stored.entries.map((entry) => entry.id));
  // Recover native IDs even after storage corruption or a write interruption.
  for (const item of scheduled) {
    const data = item.content.data;
    if (
      data?.ganReminder === true ||
      (typeof data?.key === "string" && typeof data?.userId === "string")
    )
      ids.add(item.identifier);
  }
  for (const id of ids) await n.cancelScheduledNotificationAsync(id);
  await persist({ version: 2, userId: null, fingerprint: "", entries: [] });
  lastNativeCheck = Date.now();
}

async function clearRemote(): Promise<void> {
  if (!supabase || Platform.OS === "web") {
    registeredUser = null;
    return;
  }
  const ownerRaw = await AsyncStorage.getItem(REMOTE_KEY);
  const owner = ownerRaw ? (JSON.parse(ownerRaw) as { userId: string }) : null;
  if (!owner && !registeredUser) return;
  const current = await supabase.auth.getSession();
  if (current.error) throw current.error;
  if (current.data.session?.user.id === (owner?.userId ?? registeredUser)) {
    const deviceId = await AsyncStorage.getItem(DEVICE_KEY);
    if (deviceId) await unregisterDeviceTokens(supabase, deviceId);
    else throw new Error("Missing reminder installation ID");
  }
  // A different identity cannot unregister someone else's server associations.
  await AsyncStorage.removeItem(REMOTE_KEY);
  registeredUser = null;
  lastRemoteAttempt = 0;
}

/** Call before changing auth identity so remote associations can be removed with the old session. */
export function clearReminders(): Promise<void> {
  context = null;
  return enqueue(async () => {
    try {
      const n = await api();
      if (n) await clearLocal(n);
      await clearRemote();
      status(
        Platform.OS === "web"
          ? "บนเว็บใช้รายการเตือนในแอป"
          : "ล้างรายการเตือนของบัญชีเดิมแล้ว",
        "",
      );
    } catch (error) {
      status(
        "ล้างการเตือนเดิมไม่สำเร็จ กรุณาลองอีกครั้ง",
        "ยังไม่ยืนยันว่าการเตือนจากเซิร์ฟเวอร์ถูกยกเลิก",
      );
      throw error;
    }
  });
}

async function registerRemote(
  n: Notifications,
  user: Profile,
): Promise<boolean> {
  if (
    mode !== "supabase" ||
    process.env.EXPO_PUBLIC_ENABLE_REMOTE_PUSH !== "true"
  ) {
    await clearRemote();
    remoteStatus = "";
    return false;
  }
  if (
    !supabase ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    remoteStatus =
      "การเตือนจากเซิร์ฟเวอร์ต้องใช้ development build และตั้งค่า Supabase";
    return false;
  }
  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    remoteStatus =
      "ยังไม่ได้ตั้งค่า EAS project จึงลงทะเบียนการเตือนจากเซิร์ฟเวอร์ไม่ได้";
    return false;
  }
  if (registeredUser === user.id) return true;
  if (Date.now() - lastRemoteAttempt < 60000) return false;
  lastRemoteAttempt = Date.now();
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_KEY);
    if (!deviceId) {
      deviceId = `gan-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
      await AsyncStorage.setItem(DEVICE_KEY, deviceId);
    }
    const token = (await n.getExpoPushTokenAsync({ projectId })).data;
    const session = await supabase.auth.getSession();
    if (session.error) throw session.error;
    if (session.data.session?.user.id !== user.id)
      throw new Error("Account changed");
    await registerDeviceToken(supabase, token, deviceId);
    registeredUser = user.id;
    // Server registration already succeeded; do not also enable local delivery if persistence fails.
    try {
      await AsyncStorage.setItem(
        REMOTE_KEY,
        JSON.stringify({ userId: user.id }),
      );
    } catch {
      remoteStatus =
        "ลงทะเบียนการเตือนจากเซิร์ฟเวอร์แล้ว แต่บันทึกสถานะบนเครื่องไม่สำเร็จ";
      return true;
    }
    remoteStatus =
      "ลงทะเบียนการเตือนจากเซิร์ฟเวอร์แล้ว • ยังต้องทดสอบการส่งบนเครื่องจริง";
    return true;
  } catch {
    remoteStatus =
      "ลงทะเบียนการเตือนจากเซิร์ฟเวอร์ไม่สำเร็จ ตรวจสอบเครือข่ายและการตั้งค่า แล้วลองเปิดการแจ้งเตือนอีกครั้ง";
    return false;
  }
}

async function synchronize({ data, user, now }: Context): Promise<void> {
  const n = await api();
  if (!n) {
    status(
      "บนเว็บใช้รายการเตือนในแอป เปิดบน Android เพื่อเปิดการแจ้งเตือน",
      "",
    );
    return;
  }
  if (!user || user.role !== "patient") {
    await clearLocal(n);
    await clearRemote();
    status("เปิดรายการเตือนสำหรับบัญชีผู้ป่วยเท่านั้น", "");
    return;
  }
  if (isSimulatedReminderClock(now)) {
    await clearLocal(n);
    await clearRemote();
    status(
      "กำลังใช้เวลาสาธิต • แสดงรายการในแอปและพักการแจ้งเตือนบนเครื่อง",
      "",
    );
    return;
  }
  const permission = await n.getPermissionsAsync();
  if (
    !permission.granted &&
    permission.ios?.status !== n.IosAuthorizationStatus.PROVISIONAL
  ) {
    await clearLocal(n);
    await clearRemote();
    status("ยังไม่ได้อนุญาตการแจ้งเตือน คุณยังดูรายการเตือนในปฏิทินได้", "");
    return;
  }
  await configure(n);
  // One transport per installation: remote opt-in succeeds, or use local as fallback.
  if (await registerRemote(n, user)) {
    const local = await readSchedule().catch(() => null);
    if (
      !local ||
      local.entries.length ||
      Date.now() - lastNativeCheck > 5 * 60000
    )
      await clearLocal(n);
    status(
      "ใช้การเตือนจากเซิร์ฟเวอร์สำหรับบัญชีนี้ • พักการเตือนบนเครื่องเพื่อไม่ให้ซ้ำ",
      remoteStatus,
    );
    return;
  }
  const realNow = new Date();
  const plan = planReminders(data, user, realNow);
  const fingerprint = reminderFingerprint(user.id, plan);
  let stored: StoredSchedule;
  try {
    stored = await readSchedule();
  } catch {
    await clearLocal(n);
    stored = await readSchedule();
  }
  if (stored.userId !== user.id) {
    await clearLocal(n);
    await clearRemote();
    stored = await readSchedule();
  }
  // Reconcile native IDs on startup and periodically in case Android clears its schedule.
  const needsNativeCheck = Date.now() - lastNativeCheck > 5 * 60000;
  if (stored.fingerprint !== fingerprint || needsNativeCheck) {
    const scheduledIds = new Set(
      (await n.getAllScheduledNotificationsAsync()).map(
        (item) => item.identifier,
      ),
    );
    lastNativeCheck = Date.now();
    const planned = new Map(plan.map((reminder) => [reminder.key, reminder]));
    const entries: ScheduledEntry[] = [];
    for (const entry of stored.entries) {
      const expected = planned.get(entry.key);
      if (
        expected &&
        expected.triggerAt === entry.triggerAt &&
        scheduledIds.has(entry.id)
      )
        entries.push(entry);
      else await n.cancelScheduledNotificationAsync(entry.id);
    }
    const next: StoredSchedule = {
      version: 2,
      userId: user.id,
      fingerprint: "",
      entries,
    };
    await persist(next);
    const already = new Set(entries.map((entry) => entry.key));
    try {
      for (const reminder of plan) {
        if (
          already.has(reminder.key) ||
          Date.parse(reminder.triggerAt) <= Date.now()
        )
          continue;
        const id = await n.scheduleNotificationAsync({
          content: {
            title: "กรร • รายการสุขภาพ",
            body: "ถึงเวลาตรวจสอบรายการสุขภาพของคุณในแอปกรร",
            data: {
              url: reminder.route,
              userId: user.id,
              key: reminder.key,
              ganReminder: true,
            },
          },
          trigger: {
            type: n.SchedulableTriggerInputTypes.DATE,
            date: new Date(reminder.triggerAt),
            channelId: "health",
          },
        });
        next.entries.push({
          id,
          key: reminder.key,
          triggerAt: reminder.triggerAt,
        });
        try {
          await persist(next);
        } catch (error) {
          next.entries.pop();
          await n.cancelScheduledNotificationAsync(id);
          throw error;
        }
      }
      next.fingerprint = fingerprint;
      await persist(next);
      stored = next;
    } catch (error) {
      status(
        `ตั้งการเตือนได้ ${next.entries.length} รายการ แต่บางรายการไม่สำเร็จ กรุณาลองอีกครั้ง`,
      );
      throw error;
    }
  }
  status(
    stored.entries.length
      ? `ตั้งการเตือนบนเครื่อง ${stored.entries.length} รายการแล้ว • การแสดงจริงขึ้นกับสิทธิและการตั้งค่าเครื่อง`
      : "อนุญาตการแจ้งเตือนแล้ว • ไม่มีรายการเตือนใน 7 วันถัดไป",
    remoteStatus,
  );
}

export function syncReminders(
  data: HealthData,
  user: Profile | null,
  now: Date,
): Promise<void> {
  context = { data, user, now };
  const captured = context;
  return enqueue(async () => {
    try {
      await synchronize(captured);
    } catch (error) {
      if (!localStatus.includes("บางรายการไม่สำเร็จ"))
        status(
          "ไม่สามารถตั้งการเตือนบนเครื่องได้ กรุณาลองอีกครั้ง คุณยังดูตารางในแอปได้",
        );
      throw error;
    }
  });
}

/** Return actual permission/scheduling outcome; permission alone is never reported as delivery. */
export async function requestReminders(): Promise<string> {
  try {
    const n = await api();
    if (!n) {
      status(
        "บนเว็บใช้รายการเตือนในแอป เปิดบน Android เพื่อเปิดการแจ้งเตือน",
        "",
      );
      return getReminderStatus();
    }
    await configure(n);
    const permission = await n.requestPermissionsAsync();
    if (
      !permission.granted &&
      permission.ios?.status !== n.IosAuthorizationStatus.PROVISIONAL
    ) {
      await clearReminders();
      status(
        "ยังไม่ได้อนุญาต คุณยังดูรายการเตือนในปฏิทินได้ เปิดสิทธิได้ในตั้งค่าของเครื่อง",
        "",
      );
      return getReminderStatus();
    }
    lastRemoteAttempt = 0; // Explicit user retry also retries a failed remote registration.
    const current = context;
    if (current) await syncReminders(current.data, current.user, current.now);
    else
      status("อนุญาตแล้ว กรุณาเปิดปฏิทินผู้ป่วยเพื่อโหลดรายการเตือนล่าสุด", "");
  } catch {
    status(
      "เปิดหรือตั้งการแจ้งเตือนไม่สำเร็จ กรุณาตรวจสอบสิทธิของเครื่องและลองอีกครั้ง คุณยังดูตารางในแอปได้",
    );
  }
  return getReminderStatus();
}
