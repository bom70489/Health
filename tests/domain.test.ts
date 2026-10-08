import { describe, expect, it } from "vitest";
import {
  addDays,
  bangkokDate,
  bangkokTime,
  localToInstant,
  thaiDate,
} from "../src/domain/dateTime";
import {
  allCalendarTasks,
  buildTasks,
  nextTask,
  occurrenceKey,
  overdueDoses,
} from "../src/domain/tasks";
import type {
  AppointmentInput,
  HealthData,
  MedicationInput,
} from "../src/domain/types";
import {
  validateAppointment,
  validateMedication,
} from "../src/domain/validation";
import { createDemoSeed } from "../src/data/demoSeed";

const NOW = new Date("2026-10-08T02:00:00Z"); // 09:00 Bangkok, independent of machine timezone.
const DAY = "2026-10-08";
const dataset = (): HealthData => createDemoSeed(NOW);

describe("Bangkok date and recurrence", () => {
  it("crosses the Bangkok day boundary independently of UTC and device locale", () => {
    expect(bangkokDate("2026-10-07T16:59:59Z")).toBe("2026-10-07");
    expect(bangkokDate("2026-10-07T17:00:00Z")).toBe(DAY);
    expect(bangkokTime("2026-10-07T17:00:00Z")).toBe("00:00");
    expect(localToInstant(DAY, "00:00")).toBe("2026-10-07T17:00:00.000Z");
  });

  it("rejects calendar-normalized invalid dates and times", () => {
    expect(() => localToInstant("2026-02-31", "08:00")).toThrow();
    expect(() => localToInstant(DAY, "24:00")).toThrow();
    expect(() => localToInstant(DAY, "08:60")).toThrow();
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(thaiDate(DAY)).toContain("2569");
  });

  it("generates only configured weekdays and inclusive date boundaries", () => {
    const data = dataset();
    const plan = data.medications[0];
    plan.startDate = DAY;
    plan.endDate = "2026-10-09";
    plan.weekdays = [4]; // Thursday 8 October only.
    const tasks = buildTasks(
      data,
      "patient-a",
      "2026-10-07",
      "2026-10-10",
    ).filter((t) => t.kind === "medication");
    expect(tasks).toHaveLength(2);
    expect(tasks.every((t) => bangkokDate(t.scheduledAt) === DAY)).toBe(true);
  });
});

describe("next actionable tasks and honest self-report status", () => {
  it("includes a far appointment without expanding medication recurrence decades ahead", () => {
    const data = dataset();
    data.appointments[0].scheduledAt = localToInstant("2100-01-01", "14:00");
    data.medications[0].endDate = null;
    const tasks = allCalendarTasks(data, "patient-a", DAY);
    expect(tasks.some((task) => task.appointment?.id === "appointment-a")).toBe(
      true,
    );
    expect(tasks.filter((task) => task.kind === "medication")).toHaveLength(70); // 3 past + 32 current/future days.
    expect(
      tasks.every(
        (task) =>
          (task.appointment?.patientId ?? task.medication?.patientId) ===
          "patient-a",
      ),
    ).toBe(true);
  });

  it("preserves more than ten years of overdue history by chunking instead of crashing", () => {
    const data = dataset();
    data.medications[0].startDate = "2010-01-01";
    data.medications[0].endDate = "2026-10-08";
    data.medications[0].timeSlots = ["08:00"];
    const tasks = allCalendarTasks(data, "patient-a", DAY).filter(
      (task) => task.kind === "medication",
    );
    expect(tasks[0].scheduledAt).toBe(localToInstant("2010-01-01", "08:00"));
    expect(tasks.at(-1)?.scheduledAt).toBe(localToInstant(DAY, "08:00"));
    expect(tasks.length).toBeGreaterThan(3660);
    expect(overdueDoses(tasks, NOW).length).toBe(tasks.length - 1); // Yesterday's explicit confirmed fixture.
  });

  it("finds the first weekday slot in a far future plan with only a one-week lookahead", () => {
    const data = dataset();
    data.appointments = [];
    data.medications[0].startDate = "2100-01-01";
    data.medications[0].endDate = null;
    data.medications[0].weekdays = [1];
    const tasks = allCalendarTasks(data, "patient-a", DAY);
    expect(tasks).toHaveLength(2);
    expect(bangkokDate(nextTask(tasks, NOW)!.scheduledAt)).toBe("2100-01-04");
  });

  it("one of two same-day slots is confirmed without confirming the other", () => {
    const data = dataset();
    const scheduledAt = localToInstant(DAY, "08:00");
    data.confirmations.push({
      occurrenceKey: occurrenceKey("medication-a", 1, scheduledAt),
      medicationPlanId: "medication-a",
      medicationPlanVersion: 1,
      patientId: "patient-a",
      scheduledAt,
      confirmedAt: NOW.toISOString(),
    });
    const tasks = buildTasks(data, "patient-a", DAY, DAY);
    expect(tasks.map((t) => t.status)).toEqual(["confirmed", "pending"]);
    expect(nextTask(tasks, NOW)?.scheduledAt).toBe(
      localToInstant(DAY, "20:00"),
    );
  });

  it("keeps an overdue unconfirmed dose visible and pending while advancing the main card", () => {
    const tasks = buildTasks(dataset(), "patient-a", DAY, DAY);
    expect(overdueDoses(tasks, NOW)).toHaveLength(1);
    expect(overdueDoses(tasks, NOW)[0].status).toBe("pending");
    expect(nextTask(tasks, NOW)?.scheduledAt).toBe(
      localToInstant(DAY, "20:00"),
    );
    expect(tasks).toHaveLength(2);
  });

  it("selects a future appointment after an earlier confirmed dose and before evening medicine", () => {
    const data = dataset();
    data.appointments[0].scheduledAt = localToInstant(DAY, "14:00");
    const scheduledAt = localToInstant(DAY, "08:00");
    data.confirmations.push({
      occurrenceKey: occurrenceKey("medication-a", 1, scheduledAt),
      medicationPlanId: "medication-a",
      medicationPlanVersion: 1,
      patientId: "patient-a",
      scheduledAt,
      confirmedAt: NOW.toISOString(),
    });
    expect(nextTask(buildTasks(data, "patient-a", DAY, DAY), NOW)?.kind).toBe(
      "appointment",
    );
  });

  it("never interprets appointment acknowledgment as attendance", () => {
    const data = dataset();
    data.appointments[0].acknowledgedVersion = 1;
    const tomorrow = addDays(DAY, 1);
    const appointmentTask = buildTasks(
      data,
      "patient-a",
      tomorrow,
      tomorrow,
    ).find((t) => t.kind === "appointment");
    expect(appointmentTask?.status).toBe("pending");
    const after = new Date(
      Date.parse(data.appointments[0].scheduledAt) + 60000,
    );
    expect(nextTask([appointmentTask!], after)).toBeUndefined();
    expect(data.appointments[0].status).toBe("scheduled");
  });

  it("omits cancelled appointments and inactive medication from future tasks without deleting records", () => {
    const data = dataset();
    data.appointments[0].status = "cancelled";
    data.medications[0].isActive = false;
    expect(buildTasks(data, "patient-a", DAY, addDays(DAY, 7))).toEqual([]);
    expect(data.appointments).toHaveLength(3);
    expect(data.medications).toHaveLength(3);
  });

  it("does not carry an old version confirmation into a revised order with the same time", () => {
    const data = dataset();
    const old = data.confirmations[0];
    data.medications[0].version = 2;
    const tasks = buildTasks(
      data,
      "patient-a",
      bangkokDate(old.scheduledAt),
      bangkokDate(old.scheduledAt),
    );
    expect(tasks.every((t) => t.status === "pending")).toBe(true);
    expect(tasks[0].key).toContain(":2:");
    expect(data.confirmations).toContain(old);
  });

  it("correction metadata makes a dose pending again and retains the confirmation", () => {
    const data = dataset();
    const confirmation = data.confirmations[0];
    confirmation.correctedAt = NOW.toISOString();
    const date = bangkokDate(confirmation.scheduledAt);
    expect(buildTasks(data, "patient-a", date, date)[0].status).toBe("pending");
    expect(data.confirmations).toHaveLength(1);
  });

  it("returns an empty result for no tasks and invalid ranges", () => {
    expect(nextTask([], NOW)).toBeUndefined();
    expect(overdueDoses([], NOW)).toEqual([]);
    expect(buildTasks(dataset(), "patient-a", "not-a-date", DAY)).toEqual([]);
    expect(buildTasks(dataset(), "patient-a", "2026-11-01", DAY)).toEqual([]);
  });

  it("is patient scoped even if supplied the full doctor dataset", () => {
    const tasks = buildTasks(dataset(), "patient-b", DAY, addDays(DAY, 4));
    expect(
      tasks.every(
        (t) =>
          (t.appointment?.patientId ?? t.medication?.patientId) === "patient-b",
      ),
    ).toBe(true);
    expect(tasks.some((t) => t.medication?.id === "medication-a")).toBe(false);
  });
});

describe("form domain validation", () => {
  const medication = (): MedicationInput => {
    const { id, doctorId, version, updatedAt, ...input } =
      dataset().medications[0];
    return input;
  };
  const appointment = (): AppointmentInput => {
    const {
      id,
      doctorId,
      version,
      updatedAt,
      acknowledgedAt,
      acknowledgedVersion,
      ...input
    } = dataset().appointments[0];
    return input;
  };

  it("accepts a positive fractional quantity and paired strength fields", () => {
    expect(
      validateMedication({
        ...medication(),
        amountPerDose: "0.5",
        strengthValue: "5",
        strengthUnit: "mg",
      }),
    ).toBeNull();
    expect(validateAppointment(appointment())).toBeNull();
  });

  it("rejects zero/negative/non-numeric dose, missing units and incomplete strength", () => {
    for (const amountPerDose of ["0", "-1", "NaN", "1e3", "ยา"]) {
      expect(
        validateMedication({ ...medication(), amountPerDose }),
      ).not.toBeNull();
    }
    expect(
      validateMedication({ ...medication(), amountUnit: "" }),
    ).not.toBeNull();
    expect(
      validateMedication({ ...medication(), strengthValue: "5" }),
    ).not.toBeNull();
  });

  it("rejects duplicate slots, bad date ranges, malformed calendar dates and weekdays", () => {
    expect(
      validateMedication({ ...medication(), timeSlots: ["08:00", "08:00"] }),
    ).not.toBeNull();
    expect(
      validateMedication({ ...medication(), timeSlots: ["8:00"] }),
    ).not.toBeNull();
    expect(
      validateMedication({ ...medication(), startDate: "2026-02-31" }),
    ).not.toBeNull();
    expect(
      validateMedication({ ...medication(), endDate: "2026-01-01" }),
    ).not.toBeNull();
    expect(
      validateMedication({ ...medication(), weekdays: [7] }),
    ).not.toBeNull();
    expect(
      validateAppointment({
        ...appointment(),
        scheduledAt: "2026-02-31T08:00:00Z",
      }),
    ).not.toBeNull();
    expect(
      validateAppointment({
        ...appointment(),
        scheduledAt: "2026-10-08T08:00:00",
      }),
    ).not.toBeNull();
  });
});
