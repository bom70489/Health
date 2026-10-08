import { bangkokDate, bangkokTime } from "../domain/dateTime";
import { isPlanScheduledOn, occurrenceKey } from "../domain/tasks";
import type {
  Appointment,
  AppointmentInput,
  ChatMessage,
  DoseConfirmation,
  HealthData,
  MedicationInput,
  MedicationPlan,
  Profile,
} from "../domain/types";
import { validateAppointment, validateMedication } from "../domain/validation";
import { createDemoSeed } from "./demoSeed";
import type { DemoStorage, Repository } from "./repository";

export const DEMO_STORAGE_KEY = "gan-demo-data-v1";
type DemoState = {
  schemaVersion: 1;
  data: HealthData;
  sessionId: string | null;
  doctorPatients: Record<string, string[]>;
  appointmentHistory: Appointment[];
  medicationHistory: MedicationPlan[];
  confirmationHistory: DoseConfirmation[];
};
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
let idCounter = 0;
const uniqueId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${++idCounter}-${Math.random().toString(36).slice(2, 8)}`;

/** Local fictional-data adapter. Role checks demonstrate product behavior, not device security. */
export class DemoRepository implements Repository {
  private state: DemoState | null = null;
  private initialization: Promise<DemoState> | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: DemoStorage,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  private fresh(): DemoState {
    return {
      schemaVersion: 1,
      data: createDemoSeed(this.clock()),
      sessionId: null,
      doctorPatients: { "doctor-demo": ["patient-a", "patient-b"] },
      appointmentHistory: [],
      medicationHistory: [],
      confirmationHistory: [],
    };
  }

  private initialize(): Promise<DemoState> {
    if (this.state) return Promise.resolve(this.state);
    if (!this.initialization) {
      this.initialization = (async () => {
        const saved = await this.storage.getItem(DEMO_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as DemoState;
          if (
            parsed.schemaVersion !== 1 ||
            !parsed.data ||
            !Array.isArray(parsed.data.profiles) ||
            !Array.isArray(parsed.data.appointments) ||
            !Array.isArray(parsed.data.medications) ||
            !Array.isArray(parsed.data.confirmations) ||
            !Array.isArray(parsed.data.messages) ||
            !parsed.doctorPatients
          )
            throw new Error(
              "ข้อมูลสาธิตที่บันทึกไว้ไม่ถูกต้อง กรุณารีเซ็ตข้อมูลสาธิต",
            );
          this.state = {
            ...parsed,
            appointmentHistory: parsed.appointmentHistory ?? [],
            medicationHistory: parsed.medicationHistory ?? [],
            confirmationHistory: parsed.confirmationHistory ?? [],
          };
        } else {
          const fresh = this.fresh();
          await this.storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(fresh));
          this.state = fresh;
        }
        return this.state;
      })().catch((error) => {
        this.initialization = null;
        throw error;
      });
    }
    return this.initialization;
  }

  private async read(): Promise<DemoState> {
    await this.queue;
    return this.initialize();
  }

  private transaction(change: (state: DemoState) => void): Promise<void> {
    const operation = this.queue.then(async () => {
      const draft = clone(await this.initialize());
      change(draft);
      // Do not show success or change in-memory data when persistent storage rejects a write.
      await this.storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(draft));
      this.state = draft;
      this.initialization = Promise.resolve(draft);
    });
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  private user(state: DemoState): Profile {
    const profile = state.data.profiles.find((p) => p.id === state.sessionId);
    if (!profile) throw new Error("กรุณาเข้าสู่ระบบก่อน");
    return profile;
  }

  private doctor(state: DemoState, patientId: string): Profile {
    const user = this.user(state);
    if (
      user.role !== "doctor" ||
      !state.doctorPatients[user.id]?.includes(patientId)
    ) {
      throw new Error(
        "เฉพาะแพทย์ที่ดูแลผู้ป่วยรายนี้เท่านั้นที่แก้ไขข้อมูลได้",
      );
    }
    return user;
  }

  private patient(state: DemoState, patientId: string): Profile {
    const user = this.user(state);
    if (user.role !== "patient" || user.id !== patientId)
      throw new Error("บันทึกได้เฉพาะข้อมูลของผู้ป่วยที่เข้าสู่ระบบ");
    return user;
  }

  async getSession(): Promise<Profile | null> {
    const state = await this.read();
    return clone(
      state.data.profiles.find((p) => p.id === state.sessionId) ?? null,
    );
  }

  async signIn(_email: string, _password: string): Promise<Profile> {
    throw new Error("โหมดสาธิตไม่มีบัญชีอีเมล กรุณาเลือกบัญชีสาธิต");
  }

  async signInDemo(id: string): Promise<Profile> {
    let result: Profile | undefined;
    await this.transaction((state) => {
      result = state.data.profiles.find((p) => p.id === id);
      if (!result) throw new Error("ไม่พบบัญชีสาธิตนี้");
      state.sessionId = id;
    });
    return clone(result!);
  }

  async signOut(): Promise<void> {
    await this.transaction((state) => {
      state.sessionId = null;
    });
  }

  async loadData(): Promise<HealthData> {
    const state = await this.read();
    const user = this.user(state);
    const patientIds =
      user.role === "doctor"
        ? (state.doctorPatients[user.id] ?? [])
        : [user.id];
    const ownRecords = (patientId: string): boolean =>
      patientIds.includes(patientId);
    const clinicianIds =
      user.role === "patient"
        ? Object.entries(state.doctorPatients)
            .filter(([, ids]) => ids.includes(user.id))
            .map(([id]) => id)
        : [user.id];
    return clone({
      profiles: state.data.profiles.filter(
        (p) => ownRecords(p.id) || clinicianIds.includes(p.id),
      ),
      appointments: state.data.appointments.filter((a) =>
        ownRecords(a.patientId),
      ),
      medications: state.data.medications.filter((m) =>
        ownRecords(m.patientId),
      ),
      confirmations: state.data.confirmations.filter((c) =>
        ownRecords(c.patientId),
      ),
      messages: state.data.messages.filter((m) => ownRecords(m.patientId)),
    });
  }

  async saveAppointment(input: AppointmentInput, id?: string): Promise<void> {
    const validation = validateAppointment(input);
    if (validation) throw new Error(validation);
    await this.transaction((state) => {
      const doctor = this.doctor(state, input.patientId);
      const existing = id
        ? state.data.appointments.find((a) => a.id === id)
        : undefined;
      if (id && !existing) throw new Error("ไม่พบนัดหมายนี้");
      if (existing) {
        this.doctor(state, existing.patientId);
        if (existing.patientId !== input.patientId)
          throw new Error("ไม่สามารถย้ายข้อมูลไปยังผู้ป่วยอื่น");
      }
      const record: Appointment = {
        ...clone(input),
        id: existing?.id ?? uniqueId("appointment"),
        doctorId: doctor.id,
        scheduledAt: new Date(input.scheduledAt).toISOString(),
        version: (existing?.version ?? 0) + 1,
        acknowledgedVersion: null,
        acknowledgedAt: null,
        updatedAt: this.clock().toISOString(),
      };
      if (existing) {
        state.appointmentHistory.push(clone(existing));
        state.data.appointments[state.data.appointments.indexOf(existing)] =
          record;
      } else state.data.appointments.push(record);
    });
  }

  async cancelAppointment(id: string): Promise<void> {
    await this.transaction((state) => {
      const record = state.data.appointments.find((a) => a.id === id);
      if (!record) throw new Error("ไม่พบนัดหมายนี้");
      this.doctor(state, record.patientId);
      if (record.status === "cancelled") return;
      state.appointmentHistory.push(clone(record));
      Object.assign(record, {
        status: "cancelled",
        version: record.version + 1,
        acknowledgedVersion: null,
        acknowledgedAt: null,
        updatedAt: this.clock().toISOString(),
      });
    });
  }

  async saveMedication(input: MedicationInput, id?: string): Promise<void> {
    const validation = validateMedication(input);
    if (validation) throw new Error(validation);
    await this.transaction((state) => {
      const doctor = this.doctor(state, input.patientId);
      const existing = id
        ? state.data.medications.find((m) => m.id === id)
        : undefined;
      if (id && !existing) throw new Error("ไม่พบรายการยานี้");
      if (existing) {
        this.doctor(state, existing.patientId);
        if (existing.patientId !== input.patientId)
          throw new Error("ไม่สามารถย้ายข้อมูลไปยังผู้ป่วยอื่น");
      }
      const record: MedicationPlan = {
        ...clone(input),
        id: existing?.id ?? uniqueId("medication"),
        doctorId: doctor.id,
        timeSlots: [...input.timeSlots].sort(),
        version: (existing?.version ?? 0) + 1,
        updatedAt: this.clock().toISOString(),
      };
      if (existing) {
        state.medicationHistory.push(clone(existing));
        state.data.medications[state.data.medications.indexOf(existing)] =
          record;
      } else state.data.medications.push(record);
    });
  }

  async deactivateMedication(id: string): Promise<void> {
    await this.transaction((state) => {
      const record = state.data.medications.find((m) => m.id === id);
      if (!record) throw new Error("ไม่พบรายการยานี้");
      this.doctor(state, record.patientId);
      if (!record.isActive) return;
      state.medicationHistory.push(clone(record));
      Object.assign(record, {
        isActive: false,
        version: record.version + 1,
        updatedAt: this.clock().toISOString(),
      });
    });
  }

  async confirmDose(
    planId: string,
    version: number,
    scheduledAt: string,
  ): Promise<void> {
    await this.transaction((state) => {
      const plan = state.data.medications.find((m) => m.id === planId);
      if (!plan) throw new Error("ไม่พบรายการยานี้");
      this.patient(state, plan.patientId);
      if (plan.version !== version || !plan.isActive)
        throw new Error("ตารางยามีการเปลี่ยนแปลง กรุณารีเฟรชข้อมูล");
      const instant = new Date(scheduledAt);
      if (
        !Number.isFinite(instant.getTime()) ||
        instant.getUTCSeconds() !== 0 ||
        instant.getUTCMilliseconds() !== 0 ||
        !isPlanScheduledOn(plan, bangkokDate(instant)) ||
        !plan.timeSlots.includes(bangkokTime(instant))
      ) {
        throw new Error("เวลานี้ไม่อยู่ในตารางยาที่แพทย์กำหนด");
      }
      if (instant.getTime() > this.clock().getTime() + 15 * 60000) {
        throw new Error(
          "ยังไม่ถึงช่วงเวลาของยารายการนี้ กรุณาตรวจสอบตารางที่แพทย์กำหนด",
        );
      }
      const canonical = instant.toISOString();
      const key = occurrenceKey(plan.id, version, canonical);
      const existing = state.data.confirmations.find(
        (c) => c.occurrenceKey === key,
      );
      if (existing && !existing.correctedAt) return; // Repeated taps are idempotent.
      const record: DoseConfirmation = {
        occurrenceKey: key,
        medicationPlanId: plan.id,
        medicationPlanVersion: version,
        patientId: plan.patientId,
        scheduledAt: canonical,
        confirmedAt: this.clock().toISOString(),
        correctedAt: null,
      };
      if (existing) {
        state.confirmationHistory.push(clone(existing));
        state.data.confirmations[state.data.confirmations.indexOf(existing)] =
          record;
      } else state.data.confirmations.push(record);
    });
  }

  async correctDose(key: string): Promise<void> {
    await this.transaction((state) => {
      const record = state.data.confirmations.find(
        (c) => c.occurrenceKey === key,
      );
      if (!record) throw new Error("ไม่พบการยืนยันนี้");
      this.patient(state, record.patientId);
      if (record.correctedAt) return;
      state.confirmationHistory.push(clone(record));
      record.correctedAt = this.clock().toISOString();
    });
  }

  async acknowledgeAppointment(id: string, version: number): Promise<void> {
    await this.transaction((state) => {
      const record = state.data.appointments.find((a) => a.id === id);
      if (!record) throw new Error("ไม่พบนัดหมายนี้");
      this.patient(state, record.patientId);
      if (record.status !== "scheduled" || record.version !== version)
        throw new Error("นัดหมายมีการเปลี่ยนแปลง กรุณารีเฟรชข้อมูล");
      record.acknowledgedVersion = version;
      record.acknowledgedAt = this.clock().toISOString();
    });
  }

  async addMessage(message: ChatMessage): Promise<void> {
    await this.transaction((state) => {
      this.patient(state, message.patientId);
      if (
        !message.id ||
        !message.text.trim() ||
        message.text.length > 6000 ||
        !["user", "assistant"].includes(message.role) ||
        !Number.isFinite(Date.parse(message.createdAt))
      ) {
        throw new Error("ข้อความไม่ถูกต้องหรือยาวเกินไป");
      }
      if (!state.data.messages.some((m) => m.id === message.id))
        state.data.messages.push(clone(message));
    });
  }

  async resetDemo(): Promise<void> {
    const operation = this.queue.then(async () => {
      // Explicit reset also recovers malformed persisted demo data.
      const sessionId = this.state?.sessionId ?? null;
      const fresh = this.fresh();
      fresh.sessionId = sessionId;
      await this.storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(fresh));
      this.state = fresh;
      this.initialization = Promise.resolve(fresh);
    });
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }
}
