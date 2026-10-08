import type {
  AppointmentInput,
  ChatMessage,
  HealthData,
  MedicationInput,
  Profile,
} from "../domain/types";

export interface Repository {
  getSession(): Promise<Profile | null>;
  signIn(email: string, password: string): Promise<Profile>;
  signInDemo(id: string): Promise<Profile>;
  signOut(): Promise<void>;
  loadData(): Promise<HealthData>;
  saveAppointment(input: AppointmentInput, id?: string): Promise<void>;
  cancelAppointment(id: string): Promise<void>;
  saveMedication(input: MedicationInput, id?: string): Promise<void>;
  deactivateMedication(id: string): Promise<void>;
  confirmDose(
    planId: string,
    version: number,
    scheduledAt: string,
  ): Promise<void>;
  correctDose(occurrenceKey: string): Promise<void>;
  acknowledgeAppointment(id: string, version: number): Promise<void>;
  addMessage(message: ChatMessage): Promise<void>;
  resetDemo(): Promise<void>;
}

export interface DemoStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
