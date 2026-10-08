import { describe, expect, it } from "vitest";
import {
  answerFromRecords,
  scheduledOn,
  type AppointmentRow,
  type MedicationRow,
} from "../supabase/functions/assistant/logic";

const now = new Date("2026-10-08T05:00:00Z"); // noon Bangkok
const plan: MedicationRow = {
  id: "plan-a",
  version: 2,
  medicine_name: "ยาสาธิต A",
  amount_per_dose: "1",
  amount_unit: "หน่วยสาธิต",
  meal_instruction: "after",
  instructions: "คำสั่งแพทย์สาธิต",
  start_date: "2026-10-01",
  end_date: null,
  weekdays: null,
  time_slots: ["08:00", "20:00"],
  is_active: true,
};
const appointment: AppointmentRow = {
  id: "a",
  scheduled_at: "2026-10-09T07:00:00Z",
  status: "scheduled",
  title: "นัดสาธิต",
  hospital_name: "โรงพยาบาลสมมติ",
  department: "แผนกสาธิต",
  preparation_note: null,
};
describe("server deterministic assistant", () => {
  it("uses current schedule and confirmation version without inventing completion", () => {
    const result = answerFromRecords(
      "วันนี้ต้องกินยาอะไรบ้าง",
      [],
      [plan],
      [
        {
          medication_plan_id: plan.id,
          medication_plan_version: 2,
          scheduled_at: "2026-10-08T01:00:00Z",
          corrected_at: null,
        },
      ],
      now,
    );
    expect(result).toContain("08:00");
    expect(result).toContain("20:00");
    expect(result).toContain("ผู้ป่วยยืนยันว่ารับประทานแล้ว");
    expect(result).toContain("ยังไม่ได้ยืนยัน");
    expect(result).toContain("คำสั่งแพทย์สาธิต");
    const stale = answerFromRecords(
      "ยาเวลา 8 โมงกินหรือยัง",
      [],
      [plan],
      [
        {
          medication_plan_id: plan.id,
          medication_plan_version: 1,
          scheduled_at: "2026-10-08T01:00:00Z",
          corrected_at: null,
        },
      ],
      now,
    );
    expect(stale).not.toContain("รับประทานแล้ว");
    expect(stale).not.toContain("20:00");
  });
  it("reflects clinician edits/cancellations and handles absent preparation notes", () => {
    expect(
      answerFromRecords("ต้องเตรียมอะไรไปพบหมอ", [appointment], [], [], now),
    ).toContain("แพทย์ยังไม่ได้ระบุคำแนะนำเพิ่มเติม");
    expect(
      answerFromRecords(
        "นัดหมอครั้งต่อไปเมื่อไร",
        [{ ...appointment, hospital_name: "โรงพยาบาลใหม่" }],
        [],
        [],
        now,
      ),
    ).toContain("โรงพยาบาลใหม่");
    expect(
      answerFromRecords(
        "นัดครั้งหน้า",
        [{ ...appointment, status: "cancelled" }],
        [],
        [],
        now,
      ),
    ).toContain("ยังไม่มีนัดหมาย");
  });
  it("uses Bangkok day/weekdays and excludes inactive plans", () => {
    const midnight = new Date("2026-10-07T17:05:00Z");
    expect(
      answerFromRecords(
        "ยาวันนี้",
        [],
        [{ ...plan, start_date: "2026-10-08" }],
        [],
        midnight,
      ),
    ).toContain("2026-10-08");
    expect(scheduledOn({ ...plan, weekdays: [4] }, "2026-10-08")).toBe(true);
    expect(scheduledOn({ ...plan, weekdays: [5] }, "2026-10-08")).toBe(false);
    expect(
      answerFromRecords(
        "ยาวันนี้",
        [],
        [{ ...plan, is_active: false }],
        [],
        now,
      ),
    ).toContain("ไม่พบรายการยา");
  });
  it("refuses unsafe changes and unsupported medication facts with no mutations", () => {
    const snapshot = JSON.stringify(plan);
    expect(answerFromRecords("หยุดยาได้ไหม", [], [plan], [], now)).toContain(
      "ไม่สามารถเปลี่ยน",
    );
    expect(
      answerFromRecords("เลื่อนนัดให้หน่อย", [appointment], [], [], now),
    ).toContain("ติดต่อแพทย์");
    expect(
      answerFromRecords("ยานี้มีผลข้างเคียงอะไร", [], [plan], [], now),
    ).toContain("ยังไม่มีข้อมูลยานี้ที่ตรวจสอบได้");
    expect(answerFromRecords("ลืมรับประทานยา", [], [plan], [], now)).toContain(
      "ไม่ควรเพิ่มขนาดยาเอง",
    );
    expect(answerFromRecords("หายใจไม่ออก", [], [plan], [], now)).toContain(
      "1669",
    );
    expect(JSON.stringify(plan)).toBe(snapshot);
  });
});
