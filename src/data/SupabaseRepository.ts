import type { SupabaseClient } from "@supabase/supabase-js";
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
import type { Repository } from "./repository";
import { validateAppointment, validateMedication } from "../domain/validation";

type Row = Record<string, unknown>;
const optional = (value: unknown) =>
  value == null ? undefined : String(value);
const iso = (value: unknown) => new Date(String(value)).toISOString();
function checked<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
function checkError(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(result.error.message);
}
export function mapProfile(r: Row): Profile {
  return {
    id: String(r.id),
    role: r.role as Profile["role"],
    displayName: String(r.display_name),
    patientNumber: optional(r.patient_number),
    age: r.age == null ? null : Number(r.age),
    phone: optional(r.phone),
    hospitalName: optional(r.hospital_name),
    department: optional(r.department),
    emergencyContact: optional(r.emergency_contact),
    allergyNote: optional(r.allergy_note),
  };
}
export function mapAppointment(r: Row): Appointment {
  return {
    id: String(r.id),
    patientId: String(r.patient_id),
    doctorId: String(r.doctor_id),
    title: String(r.title),
    scheduledAt: iso(r.scheduled_at),
    hospitalName: String(r.hospital_name),
    department: String(r.department),
    locationDetail: optional(r.location_detail),
    hospitalAddress: optional(r.hospital_address),
    hospitalPhone: optional(r.hospital_phone),
    preparationNote: optional(r.preparation_note),
    status: r.status as Appointment["status"],
    remindersEnabled: Boolean(r.reminders_enabled),
    version: Number(r.version),
    acknowledgedVersion:
      r.acknowledged_version == null ? null : Number(r.acknowledged_version),
    acknowledgedAt: r.acknowledged_at == null ? null : iso(r.acknowledged_at),
    updatedAt: iso(r.updated_at),
  };
}
export function mapMedication(r: Row): MedicationPlan {
  return {
    id: String(r.id),
    patientId: String(r.patient_id),
    doctorId: String(r.doctor_id),
    medicineName: String(r.medicine_name),
    strengthValue: optional(r.strength_value),
    strengthUnit: optional(r.strength_unit),
    amountPerDose: String(r.amount_per_dose),
    amountUnit: String(r.amount_unit),
    mealInstruction: r.meal_instruction as MedicationPlan["mealInstruction"],
    instructions: optional(r.instructions),
    note: optional(r.note),
    startDate: String(r.start_date),
    endDate: optional(r.end_date),
    timeSlots: r.time_slots as string[],
    weekdays: r.weekdays as number[] | null,
    timeZone: "Asia/Bangkok",
    isActive: Boolean(r.is_active),
    remindersEnabled: Boolean(r.reminders_enabled),
    version: Number(r.version),
    updatedAt: iso(r.updated_at),
  };
}
export function mapConfirmation(r: Row): DoseConfirmation {
  return {
    occurrenceKey: String(r.occurrence_key),
    medicationPlanId: String(r.medication_plan_id),
    medicationPlanVersion: Number(r.medication_plan_version),
    patientId: String(r.patient_id),
    scheduledAt: iso(r.scheduled_at),
    confirmedAt: iso(r.confirmed_at),
    correctedAt: r.corrected_at == null ? null : iso(r.corrected_at),
  };
}
export function mapMessage(r: Row): ChatMessage {
  return {
    id: String(r.id),
    patientId: String(r.patient_id),
    role: r.role as ChatMessage["role"],
    text: String(r.text),
    createdAt: iso(r.created_at),
  };
}
const uuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const random = Math.floor(Math.random() * 16);
    return (c === "x" ? random : (random & 3) | 8).toString(16);
  });

const currentDeviceIds = new WeakMap<SupabaseClient, string>();
export let logoutWarning: string | null = null;
export async function registerDeviceToken(
  client: SupabaseClient,
  expoPushToken: string,
  deviceId: string,
): Promise<void> {
  checked(
    await client.rpc("register_device_token", {
      p_token: expoPushToken,
      p_device_id: deviceId,
    }),
  );
  currentDeviceIds.set(client, deviceId);
}
export async function unregisterDeviceTokens(
  client: SupabaseClient,
  deviceId?: string,
): Promise<void> {
  checked(
    await client.rpc("unregister_device_tokens", {
      p_device_id: deviceId ?? null,
    }),
  );
}

/** All writes go through identity-checked narrow RPCs; RLS scopes every read. */
export class SupabaseRepository implements Repository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly getDeviceId?: () => Promise<string>,
  ) {}

  async getSession(): Promise<Profile | null> {
    const sessionResult = await this.client.auth.getSession();
    checkError(sessionResult);
    const { session } = sessionResult.data;
    if (!session) return null;
    const userResult = await this.client.auth.getUser();
    checkError(userResult);
    const { user } = userResult.data;
    const profile = checked(
      await this.client
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single(),
    );
    if (!profile || !["doctor", "patient"].includes(profile.role))
      throw new Error("บัญชีนี้ยังไม่ได้รับสิทธิ์จากผู้ดูแลระบบ");
    return mapProfile(profile);
  }
  async signIn(email: string, password: string): Promise<Profile> {
    checkError(
      await this.client.auth.signInWithPassword({
        email: email.trim(),
        password,
      }),
    );
    try {
      const profile = await this.getSession();
      if (!profile) throw new Error("ไม่พบข้อมูลบัญชี");
      return profile;
    } catch (error) {
      await this.client.auth.signOut();
      throw error;
    }
  }
  async signInDemo(_id: string): Promise<Profile> {
    throw new Error("ไม่สามารถสลับบัญชีสาธิตในโหมด Supabase");
  }
  async signOut(): Promise<void> {
    logoutWarning = null;
    try {
      // The notification service also unlinks its persisted installation ID.
      // Avoid disabling other phones when this process has no registered device.
      const deviceId = this.getDeviceId
        ? await this.getDeviceId()
        : currentDeviceIds.get(this.client);
      if (deviceId) await unregisterDeviceTokens(this.client, deviceId);
    } catch {
      logoutWarning =
        "ออกจากระบบบนเครื่องนี้แล้ว แต่ยกเลิกการเตือนระยะไกลไม่ได้ โปรดเชื่อมต่ออินเทอร์เน็ตและตรวจสอบการตั้งค่าการแจ้งเตือน";
    } finally {
      const result = await this.client.auth.signOut({ scope: "local" });
      if (result.error) {
        // Current auth-js clears local session even when its revocation request fails.
        const remaining = await this.client.auth.getSession();
        if (remaining.data.session)
          throw new Error("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
        logoutWarning =
          "ออกจากระบบบนเครื่องนี้แล้ว แต่ยังติดต่อเซิร์ฟเวอร์เพื่อยกเลิกเซสชันไม่ได้";
      }
    }
  }
  async loadData(): Promise<HealthData> {
    if (!(await this.getSession())) throw new Error("กรุณาเข้าสู่ระบบ");
    const [profiles, appointments, medications, confirmations, messages] =
      await Promise.all([
        this.client.from("profiles").select("*"),
        this.client.from("appointments").select("*").order("scheduled_at"),
        this.client.from("medication_plans").select("*").order("created_at"),
        this.client
          .from("dose_confirmations")
          .select("*")
          .order("scheduled_at"),
        this.client.from("chat_messages").select("*").order("created_at"),
      ]);
    return {
      profiles: (checked(profiles) ?? []).map(mapProfile),
      appointments: (checked(appointments) ?? []).map(mapAppointment),
      medications: (checked(medications) ?? []).map(mapMedication),
      confirmations: (checked(confirmations) ?? []).map(mapConfirmation),
      messages: (checked(messages) ?? []).map(mapMessage),
    };
  }
  async saveAppointment(input: AppointmentInput, id?: string): Promise<void> {
    const error = validateAppointment(input);
    if (error) throw new Error(error);
    checked(
      await this.client.rpc("save_appointment", {
        p_id: id ?? null,
        p_input: {
          patient_id: input.patientId,
          title: input.title,
          scheduled_at: input.scheduledAt,
          hospital_name: input.hospitalName,
          department: input.department,
          location_detail: input.locationDetail,
          hospital_address: input.hospitalAddress,
          hospital_phone: input.hospitalPhone,
          preparation_note: input.preparationNote,
          status: input.status,
          reminders_enabled: input.remindersEnabled,
        },
      }),
    );
  }
  async cancelAppointment(id: string): Promise<void> {
    checked(await this.client.rpc("cancel_appointment", { p_id: id }));
  }
  async saveMedication(input: MedicationInput, id?: string): Promise<void> {
    const error = validateMedication(input);
    if (error) throw new Error(error);
    checked(
      await this.client.rpc("save_medication", {
        p_id: id ?? null,
        p_input: {
          patient_id: input.patientId,
          medicine_name: input.medicineName,
          strength_value: input.strengthValue,
          strength_unit: input.strengthUnit,
          amount_per_dose: input.amountPerDose,
          amount_unit: input.amountUnit,
          meal_instruction: input.mealInstruction,
          instructions: input.instructions,
          note: input.note,
          start_date: input.startDate,
          end_date: input.endDate ?? null,
          time_slots: input.timeSlots,
          weekdays: input.weekdays?.length ? input.weekdays : null,
          time_zone: input.timeZone,
          is_active: input.isActive,
          reminders_enabled: input.remindersEnabled,
        },
      }),
    );
  }
  async deactivateMedication(id: string): Promise<void> {
    checked(await this.client.rpc("deactivate_medication", { p_id: id }));
  }
  async confirmDose(
    planId: string,
    version: number,
    scheduledAt: string,
  ): Promise<void> {
    checked(
      await this.client.rpc("confirm_dose", {
        p_plan_id: planId,
        p_version: version,
        p_scheduled_at: scheduledAt,
      }),
    );
  }
  async correctDose(occurrenceKey: string): Promise<void> {
    checked(
      await this.client.rpc("correct_dose", {
        p_occurrence_key: occurrenceKey,
      }),
    );
  }
  async acknowledgeAppointment(id: string, version: number): Promise<void> {
    checked(
      await this.client.rpc("acknowledge_appointment", {
        p_id: id,
        p_version: version,
      }),
    );
  }
  async addMessage(message: ChatMessage): Promise<void> {
    // Assistant provenance is server-owned: the authenticated Edge Function saves its answer.
    if (message.role === "assistant") return;
    const id =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        message.id,
      )
        ? message.id
        : uuid();
    checked(
      await this.client.rpc("append_chat_message", {
        p_id: id,
        p_text: message.text,
      }),
    );
  }
  async resetDemo(): Promise<void> {
    throw new Error("รีเซ็ตข้อมูลได้เฉพาะโหมดสาธิต");
  }
}
