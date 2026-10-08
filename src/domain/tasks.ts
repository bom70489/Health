import {
  addDays,
  bangkokDate,
  isValidDate,
  localToInstant,
  weekday,
} from "./dateTime";
import type { HealthData, HealthTask, MedicationPlan } from "./types";

export type { HealthTask } from "./types";

export function occurrenceKey(
  planId: string,
  version: number,
  scheduledAt: string,
): string {
  return `${planId}:${version}:${new Date(scheduledAt).toISOString()}`;
}

export function isPlanScheduledOn(plan: MedicationPlan, date: string): boolean {
  return (
    plan.isActive &&
    date >= plan.startDate &&
    (!plan.endDate || date <= plan.endDate) &&
    (!plan.weekdays?.length || plan.weekdays.includes(weekday(date)))
  );
}

export function buildTasks(
  data: HealthData,
  patientId: string,
  startDate: string,
  endDate: string,
): HealthTask[] {
  if (!isValidDate(startDate) || !isValidDate(endDate) || endDate < startDate)
    return [];
  // Bound malformed caller ranges; normal calendar/reminder ranges are at most a few months.
  const days =
    (Date.parse(`${endDate}T00:00:00Z`) -
      Date.parse(`${startDate}T00:00:00Z`)) /
    86400000;
  if (days > 3660) throw new Error("ช่วงวันที่ยาวเกินไป");
  const confirmations = new Map(
    data.confirmations
      .filter((c) => c.patientId === patientId && !c.correctedAt)
      .map((c) => [c.occurrenceKey, c]),
  );
  const tasks: HealthTask[] = data.appointments
    .filter(
      (a) =>
        a.patientId === patientId &&
        a.status === "scheduled" &&
        bangkokDate(a.scheduledAt) >= startDate &&
        bangkokDate(a.scheduledAt) <= endDate,
    )
    .map((appointment) => ({
      key: `appointment:${appointment.id}:${appointment.version}`,
      kind: "appointment",
      scheduledAt: appointment.scheduledAt,
      // Acknowledging details is never attendance or task completion.
      status: "pending",
      appointment,
    }));
  for (const medication of data.medications.filter(
    (m) => m.patientId === patientId && m.isActive,
  )) {
    const first =
      medication.startDate > startDate ? medication.startDate : startDate;
    const last =
      medication.endDate && medication.endDate < endDate
        ? medication.endDate
        : endDate;
    for (let date = first; date <= last; date = addDays(date, 1)) {
      if (!isPlanScheduledOn(medication, date)) continue;
      for (const time of new Set(medication.timeSlots)) {
        const scheduledAt = localToInstant(date, time);
        const key = occurrenceKey(
          medication.id,
          medication.version,
          scheduledAt,
        );
        const confirmation = confirmations.get(key);
        tasks.push({
          key,
          kind: "medication",
          scheduledAt,
          medication,
          status: confirmation ? "confirmed" : "pending",
          confirmedAt: confirmation?.confirmedAt,
        });
      }
    }
  }
  return tasks.sort(
    (a, b) =>
      Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt) ||
      a.key.localeCompare(b.key),
  );
}

export function nextTask(
  tasks: HealthTask[],
  now: Date,
): HealthTask | undefined {
  return tasks
    .filter(
      (task) =>
        task.status === "pending" &&
        Date.parse(task.scheduledAt) >= now.getTime(),
    )
    .sort(
      (a, b) =>
        Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt) ||
        a.key.localeCompare(b.key),
    )[0];
}

export function overdueDoses(tasks: HealthTask[], now: Date): HealthTask[] {
  return tasks
    .filter(
      (task) =>
        task.kind === "medication" &&
        task.status === "pending" &&
        Date.parse(task.scheduledAt) < now.getTime(),
    )
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
}

/** Calendar aggregate: distant appointments never widen daily medication recurrence. */
export function allCalendarTasks(
  data: HealthData,
  patientId: string,
  today: string,
): HealthTask[] {
  if (!isValidDate(today)) return [];
  const tasks: HealthTask[] = data.appointments
    .filter(
      (appointment) =>
        appointment.patientId === patientId &&
        appointment.status === "scheduled",
    )
    .map((appointment) => ({
      key: `appointment:${appointment.id}:${appointment.version}`,
      kind: "appointment",
      scheduledAt: appointment.scheduledAt,
      status: "pending",
      appointment,
    }));
  const usualEnd = addDays(today, 31);
  for (const medication of data.medications.filter(
    (plan) => plan.patientId === patientId && plan.isActive,
  )) {
    // Retain every past occurrence. A far future plan needs only its first week to find a next slot.
    const horizon =
      medication.startDate > usualEnd
        ? addDays(medication.startDate, 7)
        : usualEnd;
    const last =
      medication.endDate && medication.endDate < horizon
        ? medication.endDate
        : horizon;
    const scoped: HealthData = {
      ...data,
      appointments: [],
      medications: [medication],
    };
    for (let first = medication.startDate; first <= last;) {
      // buildTasks has an intentional 3660-day range guard. Chunk long history without truncation.
      const candidate = addDays(first, 3659);
      const end = candidate < last ? candidate : last;
      for (const task of buildTasks(scoped, patientId, first, end))
        tasks.push(task);
      first = addDays(end, 1);
    }
  }
  return tasks.sort(
    (a, b) =>
      Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt) ||
      a.key.localeCompare(b.key),
  );
}
