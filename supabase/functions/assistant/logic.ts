export type AppointmentRow = {
  id: string;
  scheduled_at: string;
  status: string;
  title: string;
  hospital_name: string;
  department: string;
  preparation_note: string | null;
};
export type MedicationRow = {
  id: string;
  version: number;
  medicine_name: string;
  strength_value?: string | null;
  strength_unit?: string | null;
  amount_per_dose: string;
  amount_unit: string;
  meal_instruction: string;
  instructions: string | null;
  start_date: string;
  end_date: string | null;
  weekdays: number[] | null;
  time_slots: string[];
  is_active: boolean;
};
export type ConfirmationRow = {
  medication_plan_id: string;
  medication_plan_version: number;
  scheduled_at: string;
  corrected_at: string | null;
};
const meal: Record<string, string> = {
  before: "ก่อนอาหาร",
  after: "หลังอาหาร",
  with: "พร้อมอาหาร",
  none: "ไม่เกี่ยวกับอาหาร",
  per_doctor: "ตามคำสั่งแพทย์",
};
export function bangkokDay(now: Date): string {
  return new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}
export function scheduledInstant(day: string, time: string): string {
  return new Date(`${day}T${time}:00+07:00`).toISOString();
}
export function scheduledOn(plan: MedicationRow, day: string): boolean {
  return (
    plan.is_active &&
    plan.start_date <= day &&
    (!plan.end_date || day <= plan.end_date) &&
    (!plan.weekdays?.length ||
      plan.weekdays.includes(new Date(`${day}T12:00:00+07:00`).getUTCDay()))
  );
}
const dateLabel = (instant: string) =>
  new Date(instant).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

/** Narrow, read-only Thai answers. No language model and no medical reference claims. */
export function answerFromRecords(
  question: string,
  appointments: AppointmentRow[],
  medications: MedicationRow[],
  confirmations: ConfirmationRow[],
  now = new Date(),
): string {
  const q = question.trim().toLowerCase();
  if (/หายใจไม่ออก|หมดสติ|เจ็บหน้าอก|ฉุกเฉิน|ชัก/.test(q))
    return "หากมีอาการฉุกเฉิน ให้โทร 1669 เมื่ออยู่ในประเทศไทย หรือติดต่อบริการฉุกเฉินในพื้นที่หากอยู่ต่างประเทศ หรือไปห้องฉุกเฉินทันที กรรไม่สามารถวินิจฉัยหรือรักษาอาการผ่านแชตได้ครับ";
  if (
    /เลื่อน|ย้าย|เปลี่ยน.*(ยา|ขนาด|เวลา|นัด)|หยุด.*ยา|งด.*ยา|เพิ่มยา|ลดยา|ปรับยา|ยกเลิกนัด|ข้ามยา|สั่งยา|แนะนำยา|วินิจฉัย/.test(
      q,
    )
  )
    return "กรรไม่สามารถเปลี่ยนเวลา ขนาดยา หยุดยา หรือแก้ไขนัดที่แพทย์บันทึกได้ครับ กรุณาติดต่อแพทย์หรือเภสัชกรเพื่อรับคำแนะนำและให้ผู้ดูแลแก้ไขรายการ";
  if (/ลืม.*ยา|ยา.*ลืม|พลาด.*ยา|ยา.*พลาด|เกินเวลา/.test(q))
    return "รายการที่ยังไม่ยืนยันจะคงอยู่ในตาราง กรณีลืมรับประทานยา กรุณาติดต่อแพทย์หรือเภสัชกร ไม่ควรเพิ่มขนาดยาเอง กรรไม่สามารถแนะนำวิธีชดเชยยาได้ครับ";
  if (/ผลข้างเคียง|แพ้ยา|ยานี้คือ|สรรพคุณ|ยา.*ใช้ทำอะไร/.test(q))
    return "กรรยังไม่มีข้อมูลยานี้ที่ตรวจสอบได้ กรุณาสอบถามแพทย์หรือเภสัชกรครับ";
  const upcoming = appointments
    .filter(
      (a) =>
        a.status === "scheduled" &&
        new Date(a.scheduled_at).getTime() >= now.getTime(),
    )
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at));
  if (/เตรียม|ก่อน.*(นัด|พบหมอ)/.test(q))
    return upcoming[0]
      ? `คำแนะนำก่อนนัดจากแพทย์: ${upcoming[0].preparation_note?.trim() || "แพทย์ยังไม่ได้ระบุคำแนะนำเพิ่มเติม"}`
      : "ยังไม่มีนัดหมายที่จะมาถึงในข้อมูลของคุณครับ";
  if (/นัด|พบหมอ|พบแพทย์/.test(q)) {
    const a = upcoming[0];
    return a
      ? `นัดครั้งถัดไป: ${dateLabel(a.scheduled_at)} น.\n${a.title}\n${a.hospital_name} • ${a.department}\nคำแนะนำจากแพทย์: ${a.preparation_note?.trim() || "แพทย์ยังไม่ได้ระบุคำแนะนำเพิ่มเติม"}\nการรับทราบนัดเป็นคนละสถานะกับการเข้าพบแพทย์ครับ`
      : "ยังไม่มีนัดหมายที่จะมาถึงในข้อมูลของคุณครับ";
  }
  if (/ยา|รับประทาน|กิน.*ยัง/.test(q)) {
    const day = bangkokDay(
      new Date(now.getTime() + (/พรุ่งนี้/.test(q) ? 86400000 : 0)),
    );
    const hourMatch = q.match(/(?:เวลา\s*)?(\d{1,2})(?::(\d{2})|\s*โมง)/);
    const wantedTime = hourMatch
      ? `${hourMatch[1].padStart(2, "0")}:${hourMatch[2] || "00"}`
      : null;
    const lines = medications
      .filter((p) => scheduledOn(p, day))
      .flatMap((p) =>
        p.time_slots
          .filter((t) => !wantedTime || t === wantedTime)
          .map((t) => {
            const taken = confirmations.some(
              (c) =>
                c.medication_plan_id === p.id &&
                c.medication_plan_version === p.version &&
                !c.corrected_at &&
                Date.parse(c.scheduled_at) ===
                  Date.parse(scheduledInstant(day, t)),
            );
            const strength = p.strength_value
              ? ` (${p.strength_value} ${p.strength_unit || ""})`
              : "";
            return `${t} น. ${p.medicine_name}${strength} ${p.amount_per_dose} ${p.amount_unit} • ${meal[p.meal_instruction]}\n${p.instructions ? `คำสั่งแพทย์: ${p.instructions}\n` : ""}สถานะ: ${taken ? "ผู้ป่วยยืนยันว่ารับประทานแล้ว" : "ยังไม่ได้ยืนยันการรับประทาน"}`;
          }),
      );
    return lines.length
      ? `ตารางยาที่แพทย์บันทึกสำหรับ ${day}:\n\n${lines.join("\n\n")}\n\nกรรแสดงข้อมูลจากคำสั่งแพทย์ ไม่สามารถเปลี่ยนวิธีรับประทานยาได้ครับ`
      : "ไม่พบรายการยาตามวันหรือเวลาที่ถามในตารางที่แพทย์บันทึกครับ";
  }
  return "กรรช่วยอ่านตารางที่แพทย์บันทึกให้คุณได้ครับ ลองถาม “วันนี้ต้องกินยาอะไรบ้าง” “นัดหมอครั้งต่อไปเมื่อไร” หรือ “ต้องเตรียมอะไรไปพบหมอ” กรรไม่สามารถเปลี่ยนคำสั่งการรักษาได้";
}
