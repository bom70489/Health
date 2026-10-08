import { addDays, bangkokDate, localToInstant } from "../domain/dateTime";
import { occurrenceKey } from "../domain/tasks";
import type {
  Appointment,
  DoseConfirmation,
  HealthData,
  MedicationPlan,
  Profile,
} from "../domain/types";

/** Fictional profiles only. These selectors are simulated login, never real authentication. */
export const DEMO_USERS: Profile[] = [
  {
    id: "doctor-demo",
    role: "doctor",
    displayName: "นพ. ธนกร ตัวอย่าง",
    hospitalName: "โรงพยาบาลสาธิต",
    department: "อายุรกรรม",
  },
  {
    id: "patient-a",
    role: "patient",
    displayName: "นางสมใจ ตัวอย่าง",
    patientNumber: "DEMO-001",
    age: 72,
    hospitalName: "โรงพยาบาลสาธิต",
    emergencyContact: "ญาติสาธิต • ไม่มีหมายเลขจริง",
    allergyNote: "ข้อมูลสาธิต: ยังไม่ได้บันทึกประวัติแพ้ยา",
  },
  {
    id: "patient-b",
    role: "patient",
    displayName: "นายวิชัย ตัวอย่าง",
    patientNumber: "DEMO-002",
    age: 68,
    hospitalName: "โรงพยาบาลสาธิต",
    allergyNote: "ข้อมูลสาธิต: กรุณาสอบถามแพทย์ก่อนใช้ยา",
  },
];

export function createDemoSeed(now = new Date()): HealthData {
  const today = bangkokDate(now);
  const updatedAt = now.toISOString();
  const appointments: Appointment[] = [
    {
      id: "appointment-a",
      patientId: "patient-a",
      doctorId: "doctor-demo",
      title: "ติดตามสุขภาพ (ข้อมูลสาธิต)",
      scheduledAt: localToInstant(addDays(today, 1), "14:00"),
      hospitalName: "โรงพยาบาลสาธิต",
      department: "อายุรกรรม",
      locationDetail: "อาคารตัวอย่าง ชั้น 2 ห้อง 201",
      hospitalAddress: "สถานที่จำลองสำหรับการสาธิต",
      preparationNote:
        "นำบัตรนัดและรายการยาที่ใช้อยู่มาด้วย (คำแนะนำตัวอย่างสำหรับการสาธิต)",
      status: "scheduled",
      version: 1,
      remindersEnabled: true,
      updatedAt,
    },
    {
      id: "appointment-b",
      patientId: "patient-b",
      doctorId: "doctor-demo",
      title: "ตรวจสุขภาพประจำปี (สาธิต)",
      scheduledAt: localToInstant(addDays(today, 3), "10:30"),
      hospitalName: "โรงพยาบาลสาธิต",
      department: "คลินิกตรวจสุขภาพ",
      locationDetail: "อาคารตัวอย่าง ชั้น 1",
      status: "scheduled",
      version: 1,
      remindersEnabled: true,
      updatedAt,
    },
    {
      id: "appointment-cancelled",
      patientId: "patient-a",
      doctorId: "doctor-demo",
      title: "นัดเก่าที่ถูกยกเลิก (สาธิต)",
      scheduledAt: localToInstant(addDays(today, -2), "09:00"),
      hospitalName: "โรงพยาบาลสาธิต",
      department: "อายุรกรรม",
      status: "cancelled",
      version: 2,
      remindersEnabled: false,
      updatedAt,
    },
  ];
  const medications: MedicationPlan[] = [
    {
      id: "medication-a",
      patientId: "patient-a",
      doctorId: "doctor-demo",
      medicineName: "ยาตัวอย่าง A (สาธิต)",
      amountPerDose: "1",
      amountUnit: "เม็ด",
      mealInstruction: "after",
      instructions:
        "คำสั่งจำลองสำหรับทดสอบแอป ห้ามใช้เป็นคำแนะนำในการรับประทานยาจริง",
      startDate: addDays(today, -3),
      endDate: addDays(today, 30),
      timeSlots: ["08:00", "20:00"],
      timeZone: "Asia/Bangkok",
      isActive: true,
      remindersEnabled: true,
      version: 1,
      updatedAt,
    },
    {
      id: "medication-b",
      patientId: "patient-b",
      doctorId: "doctor-demo",
      medicineName: "ยาตัวอย่าง B (สาธิต)",
      amountPerDose: "0.5",
      amountUnit: "เม็ด",
      mealInstruction: "per_doctor",
      instructions: "รายการสำหรับผู้ป่วยจำลอง B เท่านั้น ไม่ใช่ใบสั่งยาจริง",
      startDate: today,
      endDate: addDays(today, 14),
      timeSlots: ["10:00"],
      timeZone: "Asia/Bangkok",
      isActive: true,
      remindersEnabled: true,
      version: 1,
      updatedAt,
    },
    {
      id: "medication-inactive",
      patientId: "patient-a",
      doctorId: "doctor-demo",
      medicineName: "รายการยาที่หยุดแล้ว (สาธิต)",
      amountPerDose: "1",
      amountUnit: "เม็ด",
      mealInstruction: "none",
      startDate: addDays(today, -10),
      endDate: addDays(today, -4),
      timeSlots: ["12:00"],
      timeZone: "Asia/Bangkok",
      isActive: false,
      remindersEnabled: false,
      version: 2,
      updatedAt,
    },
  ];
  const scheduledAt = localToInstant(addDays(today, -1), "08:00");
  const confirmations: DoseConfirmation[] = [
    {
      occurrenceKey: occurrenceKey("medication-a", 1, scheduledAt),
      medicationPlanId: "medication-a",
      medicationPlanVersion: 1,
      patientId: "patient-a",
      scheduledAt,
      confirmedAt: new Date(Date.parse(scheduledAt) + 5 * 60000).toISOString(),
      correctedAt: null,
    },
  ];
  return {
    profiles: DEMO_USERS.map((profile) => ({ ...profile })),
    appointments,
    medications,
    confirmations,
    messages: [],
  };
}
