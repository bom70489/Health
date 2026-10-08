import { describe, expect, it } from "vitest";
import { createDemoSeed, DEMO_USERS } from "../src/data/demoSeed";
import { localToInstant } from "../src/domain/dateTime";
import { occurrenceKey } from "../src/domain/tasks";
import {
  isSimulatedReminderClock,
  planReminders,
  reminderFingerprint,
} from "../src/services/reminderPlan";

const NOW = new Date("2026-10-08T02:00:00Z");
const PATIENT = DEMO_USERS.find((user) => user.id === "patient-a")!;

describe("real notification planning", () => {
  it("plans medicine at the prescribed time and appointment one day before with authorized routes", () => {
    const data = createDemoSeed(NOW);
    const plan = planReminders(data, PATIENT, NOW);
    const appointment = plan.find(
      (reminder) => reminder.kind === "appointment",
    )!;
    expect(appointment.triggerAt).toBe(localToInstant("2026-10-08", "14:00"));
    expect(appointment.route).toBe("/calendar/appointment/appointment-a");
    expect(
      plan.some(
        (reminder) =>
          reminder.triggerAt === localToInstant("2026-10-08", "08:00"),
      ),
    ).toBe(false);
    expect(
      plan.some(
        (reminder) =>
          reminder.triggerAt === localToInstant("2026-10-08", "20:00"),
      ),
    ).toBe(true);
  });

  it("omits cancelled/inactive/confirmed and clinician-disabled reminders", () => {
    const data = createDemoSeed(NOW);
    data.appointments[0].status = "cancelled";
    data.medications[0].remindersEnabled = false;
    expect(planReminders(data, PATIENT, NOW)).toEqual([]);
    data.medications[0].remindersEnabled = true;
    const scheduledAt = localToInstant("2026-10-08", "20:00");
    data.confirmations.push({
      occurrenceKey: occurrenceKey("medication-a", 1, scheduledAt),
      medicationPlanId: "medication-a",
      medicationPlanVersion: 1,
      patientId: "patient-a",
      scheduledAt,
      confirmedAt: NOW.toISOString(),
    });
    expect(
      planReminders(data, PATIENT, NOW).some(
        (reminder) => reminder.triggerAt === scheduledAt,
      ),
    ).toBe(false);
    data.medications[0].isActive = false;
    expect(planReminders(data, PATIENT, NOW)).toEqual([]);
  });

  it("does not schedule doctor, signed-out or another patient data", () => {
    const data = createDemoSeed(NOW);
    expect(planReminders(data, null, NOW)).toEqual([]);
    expect(planReminders(data, DEMO_USERS[0], NOW)).toEqual([]);
    expect(
      planReminders(data, PATIENT, NOW).every(
        (reminder) => reminder.userId === "patient-a",
      ),
    ).toBe(true);
  });

  it("keeps a stable fingerprint across ordinary refreshes but changes on plan version/account changes", () => {
    const data = createDemoSeed(NOW);
    const first = reminderFingerprint(
      PATIENT.id,
      planReminders(data, PATIENT, NOW),
    );
    const later = new Date(NOW.getTime() + 30000);
    expect(
      reminderFingerprint(PATIENT.id, planReminders(data, PATIENT, later)),
    ).toBe(first);
    data.medications[0].version += 1;
    expect(
      reminderFingerprint(PATIENT.id, planReminders(data, PATIENT, NOW)),
    ).not.toBe(first);
    expect(
      reminderFingerprint("patient-b", planReminders(data, PATIENT, NOW)),
    ).not.toBe(first);
  });

  it("detects simulated clocks and caps the number of native reminders", () => {
    expect(isSimulatedReminderClock(NOW, NOW.getTime())).toBe(false);
    expect(isSimulatedReminderClock(NOW, NOW.getTime() + 61000)).toBe(true);
    expect(isSimulatedReminderClock(new Date("invalid"), NOW.getTime())).toBe(
      true,
    );
    expect(planReminders(createDemoSeed(NOW), PATIENT, NOW, 2)).toHaveLength(2);
  });
});
