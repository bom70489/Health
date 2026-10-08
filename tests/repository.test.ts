import { beforeEach, describe, expect, it } from "vitest";
import { DemoRepository, DEMO_STORAGE_KEY } from "../src/data/DemoRepository";
import type { DemoStorage } from "../src/data/repository";
import { localToInstant } from "../src/domain/dateTime";
import { buildTasks, occurrenceKey } from "../src/domain/tasks";
import type { AppointmentInput, MedicationInput } from "../src/domain/types";
import { answerQuestion } from "../src/services/assistantLogic";

const NOW = new Date("2026-10-08T02:00:00Z");
const DAY = "2026-10-08";
const appointment: AppointmentInput = {
  patientId: "patient-a",
  title: "นัดใหม่จากแพทย์",
  scheduledAt: localToInstant(DAY, "14:00"),
  hospitalName: "โรงพยาบาลใหม่สาธิต",
  department: "แผนกใหม่",
  preparationNote: "นำบัตรนัดใหม่มา",
  status: "scheduled",
  remindersEnabled: true,
};
const medication: MedicationInput = {
  patientId: "patient-a",
  medicineName: "ยาใหม่ที่แพทย์บันทึก (สาธิต)",
  amountPerDose: "2",
  amountUnit: "เม็ด",
  mealInstruction: "before",
  instructions: "คำสั่งจำลองใหม่",
  startDate: DAY,
  timeSlots: ["08:00", "19:00"],
  timeZone: "Asia/Bangkok",
  isActive: true,
  remindersEnabled: true,
};

class MemoryStorage implements DemoStorage {
  values = new Map<string, string>();
  failWrites = false;
  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }
  async setItem(key: string, value: string): Promise<void> {
    if (this.failWrites) throw new Error("disk full");
    this.values.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }
}

describe("shared persistent demo repository permissions and mutations", () => {
  let storage: MemoryStorage;
  let repository: DemoRepository;
  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new DemoRepository(storage, () => NOW);
  });

  it("starts signed out and does not expose protected records", async () => {
    expect(await repository.getSession()).toBeNull();
    await expect(repository.loadData()).rejects.toThrow("เข้าสู่ระบบ");
    await expect(repository.signIn("fake@example.com", "fake")).rejects.toThrow(
      "โหมดสาธิต",
    );
    await expect(repository.signInDemo("made-up-doctor")).rejects.toThrow();
  });

  it("scopes patient records including profiles, chat and confirmations", async () => {
    await repository.signInDemo("patient-a");
    await repository.addMessage({
      id: "a-chat",
      patientId: "patient-a",
      role: "user",
      text: "ตารางของฉัน",
      createdAt: NOW.toISOString(),
    });
    await repository.signInDemo("patient-b");
    const data = await repository.loadData();
    expect(data.profiles.map((p) => p.id)).toEqual([
      "doctor-demo",
      "patient-b",
    ]);
    expect(data.appointments.every((a) => a.patientId === "patient-b")).toBe(
      true,
    );
    expect(data.medications.every((m) => m.patientId === "patient-b")).toBe(
      true,
    );
    expect(data.messages).toEqual([]);
    expect(data.confirmations).toEqual([]);
  });

  it("rejects patient and unassigned-doctor clinical writes even when bypassing UI", async () => {
    await repository.signInDemo("patient-a");
    await expect(repository.saveAppointment(appointment)).rejects.toThrow(
      "เฉพาะแพทย์",
    );
    await expect(repository.saveMedication(medication)).rejects.toThrow(
      "เฉพาะแพทย์",
    );
    await expect(repository.cancelAppointment("appointment-a")).rejects.toThrow(
      "เฉพาะแพทย์",
    );
    await expect(
      repository.deactivateMedication("medication-a"),
    ).rejects.toThrow("เฉพาะแพทย์");
    await repository.signInDemo("doctor-demo");
    await expect(
      repository.saveAppointment({
        ...appointment,
        patientId: "unassigned-patient",
      }),
    ).rejects.toThrow("เฉพาะแพทย์");
  });

  it("makes doctor-created appointment and medicine visible to the patient and assistant", async () => {
    await repository.signInDemo("doctor-demo");
    await repository.saveAppointment(appointment);
    await repository.saveMedication(medication);
    await repository.signInDemo("patient-a");
    const data = await repository.loadData();
    expect(data.appointments.some((a) => a.title === appointment.title)).toBe(
      true,
    );
    expect(
      answerQuestion("นัดครั้งหน้าเมื่อไร", data, "patient-a", NOW),
    ).toContain("โรงพยาบาลใหม่สาธิต");
    expect(
      answerQuestion("วันนี้กินยาอะไรบ้าง", data, "patient-a", NOW),
    ).toContain(medication.medicineName);
    expect(
      buildTasks(data, "patient-a", DAY, DAY).filter(
        (t) => t.medication?.medicineName === medication.medicineName,
      ),
    ).toHaveLength(2);
  });

  it("survives a new repository instance and session switch without wiping shared edits", async () => {
    await repository.signInDemo("doctor-demo");
    await repository.saveAppointment(appointment);
    await repository.signInDemo("patient-a");
    const reopened = new DemoRepository(
      storage,
      () => new Date("2026-11-01T00:00:00Z"),
    );
    expect((await reopened.getSession())?.id).toBe("patient-a");
    expect(
      (await reopened.loadData()).appointments.some(
        (a) => a.title === appointment.title,
      ),
    ).toBe(true);
    await reopened.signOut();
    expect(await reopened.getSession()).toBeNull();
    await expect(reopened.loadData()).rejects.toThrow();
  });

  it("serializes simultaneous writes without losing records", async () => {
    await repository.signInDemo("doctor-demo");
    await Promise.all([
      repository.saveAppointment({ ...appointment, title: "พร้อมกัน A" }),
      repository.saveAppointment({ ...appointment, title: "พร้อมกัน B" }),
    ]);
    expect(
      (await repository.loadData()).appointments.filter((a) =>
        a.title.startsWith("พร้อมกัน"),
      ),
    ).toHaveLength(2);
  });

  it("does not report a successful in-memory mutation when storage rejects the write", async () => {
    await repository.signInDemo("doctor-demo");
    storage.failWrites = true;
    await expect(repository.saveAppointment(appointment)).rejects.toThrow(
      "disk full",
    );
    storage.failWrites = false;
    expect(
      (await repository.loadData()).appointments.some(
        (a) => a.title === appointment.title,
      ),
    ).toBe(false);
  });

  it("invalidates acknowledgment after doctor changes time and rejects obsolete acknowledgment", async () => {
    await repository.signInDemo("patient-a");
    await repository.acknowledgeAppointment("appointment-a", 1);
    expect(
      (await repository.loadData()).appointments[0].acknowledgedVersion,
    ).toBe(1);
    await repository.signInDemo("doctor-demo");
    await repository.saveAppointment(appointment, "appointment-a");
    await repository.signInDemo("patient-a");
    const revised = (await repository.loadData()).appointments.find(
      (a) => a.id === "appointment-a",
    )!;
    expect(revised.version).toBe(2);
    expect(revised.acknowledgedAt).toBeNull();
    await expect(
      repository.acknowledgeAppointment(revised.id, 1),
    ).rejects.toThrow("เปลี่ยนแปลง");
    await repository.acknowledgeAppointment(revised.id, 2);
    expect(
      answerQuestion(
        "นัดครั้งหน้าเมื่อไร",
        await repository.loadData(),
        "patient-a",
        NOW,
      ),
    ).toContain("14:00");
  });

  it("allows one dose confirmation, idempotent retries, correction and reconfirmation with audit metadata", async () => {
    await repository.signInDemo("patient-a");
    const scheduledAt = localToInstant(DAY, "08:00");
    await Promise.all([
      repository.confirmDose("medication-a", 1, scheduledAt),
      repository.confirmDose("medication-a", 1, scheduledAt),
    ]);
    let data = await repository.loadData();
    const key = occurrenceKey("medication-a", 1, scheduledAt);
    expect(
      data.confirmations.filter((c) => c.occurrenceKey === key),
    ).toHaveLength(1);
    expect(
      buildTasks(data, "patient-a", DAY, DAY).map((t) => t.status),
    ).toEqual(["confirmed", "pending"]);
    await repository.correctDose(key);
    data = await repository.loadData();
    expect(
      data.confirmations.find((c) => c.occurrenceKey === key)?.correctedAt,
    ).toBe(NOW.toISOString());
    expect(buildTasks(data, "patient-a", DAY, DAY)[0].status).toBe("pending");
    await repository.confirmDose("medication-a", 1, scheduledAt);
    expect(
      buildTasks(await repository.loadData(), "patient-a", DAY, DAY)[0].status,
    ).toBe("confirmed");
    const persisted = JSON.parse(storage.values.get(DEMO_STORAGE_KEY)!);
    expect(persisted.confirmationHistory).toHaveLength(2);
  });

  it("rejects forged times, current-version mismatch and confirmation more than 15 minutes early", async () => {
    await repository.signInDemo("patient-a");
    await expect(
      repository.confirmDose("medication-a", 1, localToInstant(DAY, "08:15")),
    ).rejects.toThrow("ไม่อยู่ในตาราง");
    await expect(
      repository.confirmDose("medication-a", 1, "2026-10-08T01:00:01Z"),
    ).rejects.toThrow("ไม่อยู่ในตาราง");
    await expect(
      repository.confirmDose("medication-a", 2, localToInstant(DAY, "08:00")),
    ).rejects.toThrow("เปลี่ยนแปลง");
    await expect(
      repository.confirmDose("medication-a", 1, localToInstant(DAY, "20:00")),
    ).rejects.toThrow("ยังไม่ถึง");
  });

  it("rejects other-patient confirmations, corrections, acknowledgments and chats", async () => {
    await repository.signInDemo("patient-b");
    await expect(
      repository.confirmDose("medication-a", 1, localToInstant(DAY, "08:00")),
    ).rejects.toThrow("เฉพาะข้อมูล");
    const previous = occurrenceKey(
      "medication-a",
      1,
      localToInstant("2026-10-07", "08:00"),
    );
    await expect(repository.correctDose(previous)).rejects.toThrow(
      "เฉพาะข้อมูล",
    );
    await expect(
      repository.acknowledgeAppointment("appointment-a", 1),
    ).rejects.toThrow("เฉพาะข้อมูล");
    await expect(
      repository.addMessage({
        id: "forged",
        patientId: "patient-a",
        role: "user",
        text: "อื่น",
        createdAt: NOW.toISOString(),
      }),
    ).rejects.toThrow("เฉพาะข้อมูล");
  });

  it("preserves old confirmations and order history when a doctor revises/deactivates or cancels", async () => {
    await repository.signInDemo("patient-a");
    await repository.confirmDose(
      "medication-a",
      1,
      localToInstant(DAY, "08:00"),
    );
    await repository.signInDemo("doctor-demo");
    await repository.saveMedication(medication, "medication-a");
    let data = await repository.loadData();
    expect(
      data.confirmations.filter((c) => c.medicationPlanId === "medication-a"),
    ).toHaveLength(2);
    expect(buildTasks(data, "patient-a", DAY, DAY)[0].status).toBe("pending");
    await repository.deactivateMedication("medication-a");
    await repository.cancelAppointment("appointment-a");
    data = await repository.loadData();
    expect(
      data.medications.find((m) => m.id === "medication-a")?.isActive,
    ).toBe(false);
    expect(
      data.appointments.find((a) => a.id === "appointment-a")?.status,
    ).toBe("cancelled");
    expect(
      data.confirmations.filter((c) => c.medicationPlanId === "medication-a"),
    ).toHaveLength(2);
    const persisted = JSON.parse(storage.values.get(DEMO_STORAGE_KEY)!);
    expect(persisted.medicationHistory).toHaveLength(2);
    expect(persisted.appointmentHistory).toHaveLength(1);
  });

  it("returns detached reads so callers cannot bypass repository writes", async () => {
    await repository.signInDemo("patient-a");
    const data = await repository.loadData();
    data.medications[0].medicineName = "forged";
    data.profiles[1].role = "doctor";
    expect((await repository.loadData()).medications[0].medicineName).not.toBe(
      "forged",
    );
    expect((await repository.getSession())?.role).toBe("patient");
  });

  it("reset is explicit, restores seed and preserves the active demo account", async () => {
    await repository.signInDemo("doctor-demo");
    await repository.saveAppointment(appointment);
    await repository.resetDemo();
    expect((await repository.getSession())?.id).toBe("doctor-demo");
    expect(
      (await repository.loadData()).appointments.some(
        (a) => a.title === appointment.title,
      ),
    ).toBe(false);
  });
});
