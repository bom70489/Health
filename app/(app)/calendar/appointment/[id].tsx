import React, { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useApp } from "../../../../src/providers/AppProvider";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorText,
  Page,
  Txt,
  colors,
} from "../../../../src/components/ui";
import { bangkokTime, thaiDate } from "../../../../src/domain/dateTime";
import { readAloud, stopSpeech } from "../../../../src/services/speech";

export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { data, user, mutate, busy } = useApp(),
    [error, setError] = useState<string | null>(null);
  const a = data.appointments.find(
    (a) => a.id === id && a.patientId === user?.id,
  );
  if (!a)
    return (
      <Page title="รายละเอียดนัดหมาย" back>
        <Empty text="ไม่พบนัดหมาย หรือคุณไม่มีสิทธิ์เข้าถึง" />
      </Page>
    );
  const doctor = data.profiles.find((p) => p.id === a.doctorId);
  async function ack() {
    try {
      await mutate((r) => r.acknowledgeAppointment(a!.id, a!.version));
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  }
  return (
    <Page title="รายละเอียดนัดหมาย" back>
      <ErrorText text={error} />
      <Card>
        <Badge
          text={
            a.status === "cancelled"
              ? "ยกเลิกนัด"
              : a.status === "completed"
                ? "แพทย์ระบุว่านัดเสร็จสิ้น"
                : "นัดหมายจากแพทย์"
          }
          tone={a.status === "cancelled" ? "red" : "blue"}
        />
        <Txt style={{ fontSize: 23, fontWeight: "800" }}>{a.title}</Txt>
        <Txt
          style={{ fontSize: 27, fontWeight: "700", color: colors.primaryDark }}
        >
          {bangkokTime(a.scheduledAt)} น.
        </Txt>
        <Txt>{thaiDate(a.scheduledAt)}</Txt>
        <Txt style={{ fontWeight: "700" }}>
          {a.hospitalName} • {a.department}
        </Txt>
        <Txt>แพทย์: {doctor?.displayName ?? "แพทย์ผู้ดูแล"}</Txt>
        {a.locationDetail && <Txt>สถานที่: {a.locationDetail}</Txt>}
        {a.hospitalAddress && <Txt>ที่อยู่: {a.hospitalAddress}</Txt>}
        {a.hospitalPhone && <Txt>ติดต่อ: {a.hospitalPhone}</Txt>}
      </Card>
      <Card>
        <Txt style={{ fontSize: 19, fontWeight: "700" }}>
          คำแนะนำก่อนนัดจากแพทย์
        </Txt>
        <Txt selectable>
          {a.preparationNote || "แพทย์ยังไม่ได้ระบุคำแนะนำเพิ่มเติม"}
        </Txt>
        <Button
          label="ฟังคำแนะนำ"
          variant="secondary"
          onPress={() =>
            void readAloud(
              a.preparationNote || "แพทย์ยังไม่ได้ระบุคำแนะนำเพิ่มเติม",
            ).then(setError)
          }
        />
        <Button
          label="หยุดเสียง"
          variant="secondary"
          onPress={() => void stopSpeech()}
        />
      </Card>
      {a.status === "scheduled" &&
        (a.acknowledgedVersion === a.version ? (
          <Badge text="รับทราบรายละเอียดฉบับล่าสุดแล้ว" tone="green" />
        ) : (
          <Button
            label="รับทราบนัด"
            loading={busy}
            onPress={() => void ack()}
          />
        ))}
      <Txt style={{ fontSize: 14, color: colors.muted }}>
        รับทราบรายละเอียดไม่ได้หมายความว่าเข้าร่วมนัดแล้ว
        หากต้องการเลื่อนหรือยกเลิก กรุณาติดต่อคลินิก
      </Txt>
      <Txt style={{ fontSize: 12, color: colors.muted }}>
        ฉบับที่ {a.version} • แก้ไขล่าสุด {thaiDate(a.updatedAt)}{" "}
        {bangkokTime(a.updatedAt)} น.
      </Txt>
    </Page>
  );
}
