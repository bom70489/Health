import { addDays, bangkokDate } from "../domain/dateTime";
import { buildTasks } from "../domain/tasks";
import type { HealthData, Profile } from "../domain/types";

export type PlannedReminder = {
  key: string;
  userId: string;
  route: string;
  triggerAt: string;
  kind: "medication" | "appointment";
};

/** Plan only real upcoming triggers, never completed doses or doctor-disabled reminders. */
export function planReminders(
  data: HealthData,
  user: Profile | null,
  now: Date,
  limit = 60,
): PlannedReminder[] {
  if (!user || user.role !== "patient") return [];
  const today = bangkokDate(now);
  const windowEnd = now.getTime() + 7 * 86400000;
  // Include one extra appointment day because its reminder fires one day earlier.
  return buildTasks(data, user.id, today, addDays(today, 8))
    .filter(
      (task) =>
        task.status === "pending" &&
        (task.medication?.remindersEnabled ??
          task.appointment?.remindersEnabled),
    )
    .map((task) => ({
      key: task.key,
      userId: user.id,
      kind: task.kind,
      triggerAt: new Date(
        Date.parse(task.scheduledAt) -
          (task.kind === "appointment" ? 86400000 : 0),
      ).toISOString(),
      route:
        task.kind === "appointment"
          ? `/calendar/appointment/${task.appointment!.id}`
          : `/calendar/medication/${task.medication!.id}`,
    }))
    .filter(
      (reminder) =>
        Date.parse(reminder.triggerAt) > now.getTime() &&
        Date.parse(reminder.triggerAt) <= windowEnd,
    )
    .sort(
      (a, b) =>
        Date.parse(a.triggerAt) - Date.parse(b.triggerAt) ||
        a.key.localeCompare(b.key),
    )
    .slice(0, limit);
}

export function reminderFingerprint(
  userId: string | null,
  reminders: PlannedReminder[],
): string {
  return JSON.stringify([
    userId,
    reminders.map(({ key, route, triggerAt }) => [key, route, triggerAt]),
  ]);
}

export function isSimulatedReminderClock(
  now: Date,
  realNow = Date.now(),
): boolean {
  return (
    !Number.isFinite(now.getTime()) || Math.abs(now.getTime() - realNow) > 60000
  );
}
