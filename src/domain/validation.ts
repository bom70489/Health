import { isValidDate, isValidTime } from "./dateTime";
import type { AppointmentInput, MedicationInput } from "./types";

const positiveNumber = (value: string): boolean =>
  /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value.trim()) &&
  Number.isFinite(Number(value)) &&
  Number(value) > 0;

export function validateAppointment(input: AppointmentInput): string | null {
  if (!input.patientId?.trim()) return "กรุณาเลือกผู้ป่วยที่อยู่ในความดูแล";
  if (!input.title?.trim()) return "กรุณาระบุประเภทหรือเหตุผลของนัดหมาย";
  if (
    !input.scheduledAt ||
    !/T/.test(input.scheduledAt) ||
    !/(Z|[+-]\d{2}:\d{2})$/.test(input.scheduledAt) ||
    !Number.isFinite(Date.parse(input.scheduledAt)) ||
    !isValidDate(input.scheduledAt.slice(0, 10))
  ) {
    return "กรุณาระบุวันที่และเวลานัดที่ถูกต้อง";
  }
  if (!input.hospitalName?.trim()) return "กรุณาระบุชื่อโรงพยาบาล";
  if (!input.department?.trim()) return "กรุณาระบุแผนก";
  if (!["scheduled", "cancelled", "completed"].includes(input.status))
    return "สถานะนัดหมายไม่ถูกต้อง";
  return null;
}

export function validateMedication(input: MedicationInput): string | null {
  if (!input.patientId?.trim()) return "กรุณาเลือกผู้ป่วยที่อยู่ในความดูแล";
  if (!input.medicineName?.trim()) return "กรุณาระบุชื่อยา";
  if (input.strengthValue?.trim() && !positiveNumber(input.strengthValue))
    return "ขนาดยาต้องเป็นตัวเลขมากกว่า 0";
  if (
    Boolean(input.strengthValue?.trim()) !== Boolean(input.strengthUnit?.trim())
  )
    return "กรุณาระบุขนาดยาและหน่วยให้ครบคู่กัน";
  if (!positiveNumber(input.amountPerDose ?? ""))
    return "จำนวนที่รับประทานต่อครั้งต้องเป็นตัวเลขมากกว่า 0";
  if (!input.amountUnit?.trim()) return "กรุณาระบุหน่วยจำนวนยา เช่น เม็ด";
  if (
    !["before", "after", "with", "none", "per_doctor"].includes(
      input.mealInstruction,
    )
  )
    return "กรุณาเลือกช่วงเวลาอาหาร";
  if (!isValidDate(input.startDate))
    return "กรุณาระบุวันที่เริ่มให้ถูกต้อง (ปี-เดือน-วัน)";
  if (input.endDate && !isValidDate(input.endDate))
    return "กรุณาระบุวันที่สิ้นสุดให้ถูกต้อง";
  if (input.endDate && input.endDate < input.startDate)
    return "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม";
  if (!input.timeSlots?.length) return "กรุณาระบุเวลาอย่างน้อย 1 เวลา";
  if (input.timeSlots.some((time) => !isValidTime(time)))
    return "เวลาเตือนต้องอยู่ในรูปแบบ 24 ชั่วโมง เช่น 08:00";
  if (new Set(input.timeSlots).size !== input.timeSlots.length)
    return "เวลาเตือนต้องไม่ซ้ำกัน";
  if (input.timeSlots.length > 24) return "กำหนดเวลาได้ไม่เกิน 24 เวลาต่อวัน";
  if (
    input.weekdays &&
    (input.weekdays.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 6,
    ) ||
      new Set(input.weekdays).size !== input.weekdays.length)
  )
    return "วันในสัปดาห์ไม่ถูกต้อง";
  if (input.timeZone !== "Asia/Bangkok")
    return "รองรับเขตเวลา Asia/Bangkok สำหรับต้นแบบนี้";
  return null;
}
