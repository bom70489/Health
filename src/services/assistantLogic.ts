import {
  addDays,
  bangkokDate,
  bangkokTime,
  isValidDate,
  thaiDate,
} from "../domain/dateTime";
import { buildTasks } from "../domain/tasks";
import { MEAL_LABELS, type HealthData, type HealthTask } from "../domain/types";

const NO_REFERENCE =
  "กรรยังไม่มีข้อมูลยานี้ที่ตรวจสอบได้ กรุณาสอบถามแพทย์หรือเภสัชกร";
const AUTHORITY =
  "กรรช่วยอธิบายข้อมูลที่แพทย์บันทึกไว้ แต่ไม่สามารถเปลี่ยนคำสั่งแพทย์ได้ครับ";

function requestedDate(question: string, now: Date): string {
  const specified = question.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (specified && isValidDate(specified)) return specified;
  const today = bangkokDate(now);
  return question.includes("พรุ่งนี้")
    ? addDays(today, 1)
    : question.includes("เมื่อวาน")
      ? addDays(today, -1)
      : today;
}

function requestedTime(question: string): string | null {
  const exact = question.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  if (exact) return `${exact[1].padStart(2, "0")}:${exact[2]}`;
  const hour = question.match(/(?:เวลา\s*)?(\d{1,2})\s*โมง/);
  if (hour && Number(hour[1]) < 24) return `${hour[1].padStart(2, "0")}:00`;
  return null;
}

function doseLine(task: HealthTask, now: Date): string {
  const plan = task.medication!;
  const status =
    task.status === "confirmed"
      ? `รับประทานแล้ว (ยืนยัน ${thaiDate(task.confirmedAt!)} ${bangkokTime(task.confirmedAt!)} น.)`
      : Date.parse(task.scheduledAt) < now.getTime()
        ? "เลยเวลา — ยังไม่ได้ยืนยัน"
        : "ยังไม่ได้ยืนยัน";
  return `• ${bangkokTime(task.scheduledAt)} น. ${plan.medicineName} ${plan.amountPerDose} ${plan.amountUnit}\n  ${MEAL_LABELS[plan.mealInstruction]} • ${status}${plan.instructions ? `\n  คำสั่งแพทย์: ${plan.instructions}` : ""}`;
}

/** Deterministic read-only retrieval; no credentials, model, medicine knowledge or write capabilities. */
export function answerQuestion(
  question: string,
  data: HealthData,
  patientId: string,
  now: Date,
): string {
  const text = question.trim().toLowerCase();
  if (!text) return "พิมพ์คำถามเกี่ยวกับตารางยาหรือนัดหมายของคุณได้เลยครับ";
  const patient = data.profiles.find(
    (p) => p.id === patientId && p.role === "patient",
  );
  if (!patient)
    return "กรรไม่พบข้อมูลผู้ป่วยที่ได้รับอนุญาต กรุณาเข้าสู่บัญชีผู้ป่วยของคุณ";

  // Guardrails run before schedule intents so a prompt cannot disguise a mutation as retrieval.
  if (
    /หายใจไม่ออก|หายใจลำบาก|เจ็บหน้าอก|หมดสติ|หน้าเบี้ยว|แขนขาอ่อนแรงฉับพลัน|เลือดออกมาก|ฉุกเฉิน|emergency/.test(
      text,
    )
  ) {
    // Thai EMS1669: National Institute for Emergency Medicine, niems.go.th.
    return "อาการที่บอกอาจต้องได้รับความช่วยเหลือทันที หากอยู่ในประเทศไทยให้โทร 1669 หรือไปห้องฉุกเฉิน หากอยู่ต่างประเทศให้ติดต่อบริการฉุกเฉินในพื้นที่ ให้คนใกล้ตัวช่วยติดต่อครับ กรรไม่สามารถวินิจฉัยหรือรักษาผ่านแชตได้";
  }
  if (
    /ignore.*instruction|ignore.*system|system prompt|prompt injection|ผู้ป่วยคนอื่น|ผู้ป่วยรายอื่น|ข้อมูลคนอื่น|patient-[ab]|doctor-demo|ข้อมูลทั้งหมด|แสดงทุกคน|ข้ามสิทธิ|เปลี่ยน.*role/.test(
      text,
    )
  ) {
    return "กรรแสดงได้เฉพาะตารางของบัญชีผู้ป่วยที่เข้าสู่ระบบ และไม่เปิดเผยข้อมูลของผู้อื่นหรือเปลี่ยนสิทธิการใช้งานครับ";
  }
  if (
    /เลื่อน|ย้ายเวลา|เปลี่ยน(?:.*)(?:ยา|เวลา|นัด|ขนาด)|หยุดยา|หยุดกิน|งดยา|ข้ามยา|เพิ่ม(?:ยา|ขนาด|จำนวน|เป็น)|ลด(?:ยา|ขนาด|จำนวน)|ปรับ(?:ยา|ขนาด|เวลา)|สั่งยา|ยกเลิกนัด|reschedule|stop.*med|change.*dose|prescrib/.test(
      text,
    )
  ) {
    return `${AUTHORITY}\nการเลื่อนนัดต้องติดต่อคลินิกหรือแพทย์ผู้ดูแล ส่วนการเปลี่ยนเวลา ขนาดยา หรือหยุดยา ต้องปรึกษาแพทย์หรือเภสัชกรก่อนครับ`;
  }
  if (/ลืม(?:.*)ยา|พลาด(?:.*)ยา|กินช้า|กินไม่ทัน|missed.*dose/.test(text)) {
    return "กรณีลืมรับประทานยา กรุณาติดต่อแพทย์หรือเภสัชกรเพื่อรับคำแนะนำที่เหมาะสม ไม่ควรเพิ่มขนาดยาเองครับ กรรแสดงสถานะจากการยืนยันของคุณ แต่ไม่กำหนดเวลาชดเชยให้";
  }
  if (
    /ผลข้างเคียง|สรรพคุณ|ยานี้.*(?:รักษา|ช่วย)|แพ้ยา|อาการแพ้|ปฏิกิริยา|side effect/.test(
      text,
    )
  )
    return NO_REFERENCE;
  if (
    /วินิจฉัย|เป็นโรคอะไร|ควรกินยาอะไร|ป่วยเป็นอะไร|รักษายังไง|ปวด|ผื่น|เวียนหัว|คลื่นไส้/.test(
      text,
    )
  ) {
    return "กรรไม่สามารถวินิจฉัยอาการหรือเลือกการรักษาให้ได้ กรุณาติดต่อแพทย์หรือเภสัชกร โดยเฉพาะเมื่ออาการรุนแรงหรือไม่ดีขึ้นครับ";
  }

  const appointments = data.appointments
    .filter(
      (a) =>
        a.patientId === patientId &&
        a.status === "scheduled" &&
        Date.parse(a.scheduledAt) >= now.getTime(),
    )
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  if (/เตรียม|ก่อน(?:.*)(?:พบหมอ|นัด)|นำอะไร/.test(text)) {
    const appointment = appointments[0];
    if (!appointment) return "ยังไม่มีนัดหมายในอนาคตที่แพทย์บันทึกไว้ครับ";
    return `คำแนะนำจากแพทย์สำหรับนัด ${thaiDate(appointment.scheduledAt)} ${bangkokTime(appointment.scheduledAt)} น.\n${appointment.preparationNote?.trim() || "แพทย์ยังไม่ได้ระบุคำแนะนำเพิ่มเติม"}`;
  }
  if (/นัด|พบหมอ|พบแพทย์|appointment/.test(text)) {
    const appointment = appointments[0];
    if (!appointment) return "ยังไม่มีนัดหมายในอนาคตที่แพทย์บันทึกไว้ครับ";
    return `นัดครั้งต่อไปของคุณ\n${thaiDate(appointment.scheduledAt)} เวลา ${bangkokTime(appointment.scheduledAt)} น.\n${appointment.title}\n${appointment.hospitalName} • ${appointment.department}${appointment.locationDetail ? `\n${appointment.locationDetail}` : ""}\nคำแนะนำจากแพทย์: ${appointment.preparationNote?.trim() || "แพทย์ยังไม่ได้ระบุคำแนะนำเพิ่มเติม"}`;
  }
  if (/ยา|กิน|รับประทาน|medicine|medication/.test(text)) {
    const date = requestedDate(text, now);
    const time = requestedTime(text);
    let tasks = buildTasks(data, patientId, date, date).filter(
      (task) => task.kind === "medication",
    );
    if (time)
      tasks = tasks.filter((task) => bangkokTime(task.scheduledAt) === time);
    const matchingPlans = data.medications.filter(
      (plan) =>
        plan.patientId === patientId &&
        text.includes(plan.medicineName.toLowerCase()),
    );
    if (matchingPlans.length)
      tasks = tasks.filter((task) =>
        matchingPlans.some((plan) => plan.id === task.medication?.id),
      );
    if (!tasks.length)
      return `ไม่พบรายการยาที่แพทย์กำหนดสำหรับ ${thaiDate(date)}${time ? ` เวลา ${time} น.` : ""} ครับ\nหากข้อมูลไม่ครบ กรุณาติดต่อคลินิกหรือเภสัชกร`;
    return `ตารางยาจากแพทย์ • ${thaiDate(date)}\n${tasks.map((task) => doseLine(task, now)).join("\n\n")}\n\nสถานะรับประทานแล้วมาจากการยืนยันของคุณเองครับ`;
  }
  return `${AUTHORITY}\nลองถาม “วันนี้ต้องกินยาอะไรบ้าง?” “ยาเวลา 8 โมงกินหรือยัง?” หรือ “นัดหมอครั้งต่อไปเมื่อไร?” ได้ครับ`;
}
