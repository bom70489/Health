export type Role = "patient" | "doctor";
export type AppointmentStatus = "scheduled" | "cancelled" | "completed";
export type MealInstruction =
  "before" | "after" | "with" | "none" | "per_doctor";

export const MEAL_LABELS: Record<MealInstruction, string> = {
  before: "ก่อนอาหาร",
  after: "หลังอาหาร",
  with: "พร้อมอาหาร",
  none: "ไม่เกี่ยวกับอาหาร",
  per_doctor: "ตามคำสั่งแพทย์",
};

export type Profile = {
  id: string;
  role: Role;
  displayName: string;
  patientNumber?: string | null;
  age?: number | null;
  phone?: string | null;
  hospitalName?: string | null;
  department?: string | null;
  emergencyContact?: string | null;
  allergyNote?: string | null;
};

export type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  title: string;
  scheduledAt: string;
  hospitalName: string;
  department: string;
  locationDetail?: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  preparationNote?: string;
  status: AppointmentStatus;
  remindersEnabled: boolean;
  version: number;
  acknowledgedVersion?: number | null;
  acknowledgedAt?: string | null;
  updatedAt: string;
};

export type MedicationPlan = {
  id: string;
  patientId: string;
  doctorId: string;
  medicineName: string;
  strengthValue?: string;
  strengthUnit?: string;
  amountPerDose: string;
  amountUnit: string;
  mealInstruction: MealInstruction;
  instructions?: string;
  note?: string;
  startDate: string;
  endDate?: string | null;
  timeSlots: string[];
  /** JS weekday mapping: Sunday=0 through Saturday=6. Null/empty means every day. */
  weekdays?: number[] | null;
  timeZone: "Asia/Bangkok";
  isActive: boolean;
  remindersEnabled: boolean;
  version: number;
  updatedAt: string;
};

export type DoseConfirmation = {
  occurrenceKey: string;
  medicationPlanId: string;
  medicationPlanVersion: number;
  patientId: string;
  scheduledAt: string;
  confirmedAt: string;
  correctedAt?: string | null;
};

export type ChatMessage = {
  id: string;
  patientId: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

export type HealthData = {
  profiles: Profile[];
  appointments: Appointment[];
  medications: MedicationPlan[];
  confirmations: DoseConfirmation[];
  messages: ChatMessage[];
};

export type AppointmentInput = Omit<
  Appointment,
  | "id"
  | "doctorId"
  | "version"
  | "updatedAt"
  | "acknowledgedVersion"
  | "acknowledgedAt"
>;
export type MedicationInput = Omit<
  MedicationPlan,
  "id" | "doctorId" | "version" | "updatedAt"
>;

export type HealthTask = {
  key: string;
  kind: "medication" | "appointment";
  scheduledAt: string;
  status: "pending" | "confirmed";
  appointment?: Appointment;
  medication?: MedicationPlan;
  confirmedAt?: string;
};

export const EMPTY_HEALTH_DATA: HealthData = {
  profiles: [],
  appointments: [],
  medications: [],
  confirmations: [],
  messages: [],
};
