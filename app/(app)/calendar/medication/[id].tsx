import React, { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useApp } from "../../../../src/providers/AppProvider";
import {
  Badge,
  Card,
  Empty,
  ErrorText,
  Page,
  Txt,
  colors,
  styles,
} from "../../../../src/components/ui";
import { TaskRow } from "../../../../src/components/TaskRow";
import { Confirmation } from "../../../../src/components/Confirmation";
import { HealthTask, MEAL_LABELS } from "../../../../src/domain/types";
import {
  bangkokDate,
  bangkokTime,
  thaiDate,
} from "../../../../src/domain/dateTime";
import { buildTasks } from "../../../../src/domain/tasks";

export default function MedicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { data, user, now, mutate, busy } = useApp(),
    [action, setAction] = useState<{
      task: HealthTask;
      correct: boolean;
    } | null>(null),
    [error, setError] = useState<string | null>(null);
  const m = data.medications.find(
    (m) => m.id === id && m.patientId === user?.id,
  );
  if (!m)
    return (
      <Page title="คำสั่งการใช้ยา" back>
        <Empty text="ไม่พบรายการยา หรือคุณไม่มีสิทธิ์เข้าถึง" />
      </Page>
    );
  const doses = buildTasks(
    data,
    user!.id,
    bangkokDate(now),
    bangkokDate(now),
  ).filter((t) => t.medication?.id === m.id);
  const logs = data.confirmations
    .filter((c) => c.medicationPlanId === m.id)
    .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt));
  async function confirm() {
    if (!action) return;
    try {
      await mutate((r) =>
        action.correct
          ? r.correctDose(action.task.key)
          : r.confirmDose(m!.id, m!.version, action.task.scheduledAt),
      );
      setAction(null);
    } catch (e) {
      setAction(null);
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  }
  return (
    <Page title="คำสั่งการใช้ยา" back>
      <ErrorText text={error} />
      <Card>
        <Badge text="ตารางยานี้กำหนดโดยแพทย์" />
        <Txt style={{ fontSize: 23, fontWeight: "800" }}>{m.medicineName}</Txt>
        <Badge
          text={m.isActive ? "รายการยาที่ใช้อยู่" : "แพทย์หยุดใช้รายการนี้แล้ว"}
          tone={m.isActive ? "blue" : "amber"}
        />
        {m.strengthValue && (
          <Txt>
            ความแรง: {m.strengthValue} {m.strengthUnit}
          </Txt>
        )}
        <Txt style={{ fontSize: 19, fontWeight: "700" }}>
          ต่อครั้ง: {m.amountPerDose} {m.amountUnit}
        </Txt>
        <Txt>{MEAL_LABELS[m.mealInstruction]}</Txt>
        <Txt>เวลาที่กำหนด: {m.timeSlots.join(" • ")} น.</Txt>
        <Txt>
          ความถี่:{" "}
          {m.weekdays?.length
            ? m.weekdays
                .map(
                  (d) =>
                    [
                      "อาทิตย์",
                      "จันทร์",
                      "อังคาร",
                      "พุธ",
                      "พฤหัสบดี",
                      "ศุกร์",
                      "เสาร์",
                    ][d],
                )
                .join(" • ")
            : "ทุกวัน"}
        </Txt>
        <Txt>เริ่ม: {thaiDate(m.startDate)}</Txt>
        <Txt>สิ้นสุด: {m.endDate ? thaiDate(m.endDate) : "ยังไม่กำหนด"}</Txt>
        <Txt>
          แพทย์:{" "}
          {data.profiles.find((p) => p.id === m.doctorId)?.displayName ??
            "แพทย์ผู้ดูแล"}
        </Txt>
      </Card>
      <Card>
        <Txt style={styles.section}>วิธีใช้จากแพทย์</Txt>
        <Txt selectable>
          {m.instructions || "แพทย์ยังไม่ได้ระบุคำแนะนำเพิ่มเติม"}
        </Txt>
        {m.note && <Txt selectable>{m.note}</Txt>}
        <Txt style={{ fontSize: 13, color: colors.muted }}>
          ผู้ป่วยบันทึกการรับประทานได้ หากต้องการแก้ไขวิธีใช้หรือเวลา
          กรุณาติดต่อแพทย์
        </Txt>
      </Card>
      <Txt style={styles.section}>รายการยาวันนี้</Txt>
      {doses.length ? (
        doses.map((t) => (
          <TaskRow
            key={t.key}
            task={t}
            now={now}
            busy={busy}
            onConfirm={(task) => setAction({ task, correct: false })}
            onCorrect={(task) => setAction({ task, correct: true })}
          />
        ))
      ) : (
        <Empty text="ไม่มีตารางยานี้ในวันนี้" />
      )}
      <Txt style={styles.section}>ประวัติการยืนยัน</Txt>
      {logs.length ? (
        logs.slice(0, 20).map((c) => (
          <Card key={`${c.occurrenceKey}:${c.confirmedAt}`}>
            <Badge
              text={
                c.correctedAt
                  ? "แก้ไขการยืนยันแล้ว"
                  : "รับประทานแล้ว • บันทึกด้วยตนเอง"
              }
              tone={c.correctedAt ? "amber" : "green"}
            />
            <Txt>
              {thaiDate(c.scheduledAt)} • {bangkokTime(c.scheduledAt)} น.
            </Txt>
            <Txt style={{ fontSize: 13, color: colors.muted }}>
              ตารางฉบับที่ {c.medicationPlanVersion} • ยืนยัน{" "}
              {bangkokTime(c.confirmedAt)} น.
            </Txt>
          </Card>
        ))
      ) : (
        <Empty text="ยังไม่มีการยืนยัน" />
      )}
      <Txt style={{ fontSize: 12, color: colors.muted }}>
        ฉบับที่ {m.version} • แก้ไขล่าสุด {thaiDate(m.updatedAt)}
      </Txt>
      {action && (
        <Confirmation
          title={action.correct ? "แก้ไขการยืนยัน" : "รับประทานแล้วใช่ไหม?"}
          description={`${m.medicineName} เวลา ${bangkokTime(action.task.scheduledAt)} น. ${action.correct ? "บันทึกเดิมจะยังอยู่ในประวัติ" : ""}`}
          busy={busy}
          onConfirm={() => void confirm()}
          onCancel={() => setAction(null)}
        />
      )}
    </Page>
  );
}
