import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../../../src/providers/AppProvider";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorText,
  Page,
  Txt,
  colors,
  styles,
} from "../../../src/components/ui";
import { TaskRow } from "../../../src/components/TaskRow";
import { Confirmation } from "../../../src/components/Confirmation";
import { HealthTask } from "../../../src/domain/types";
import {
  addDays,
  bangkokDate,
  bangkokTime,
  thaiDate,
} from "../../../src/domain/dateTime";
import {
  allCalendarTasks,
  buildTasks,
  nextTask,
  overdueDoses,
} from "../../../src/domain/tasks";

export default function Calendar() {
  const { user, data, now, mutate, busy, refresh } = useApp();
  const today = bangkokDate(now),
    [selected, setSelected] = useState(today),
    [week, setWeek] = useState(today),
    [action, setAction] = useState<{
      task: HealthTask;
      correct: boolean;
    } | null>(null),
    [error, setError] = useState<string | null>(null),
    [historyLimit, setHistoryLimit] = useState(20);
  const tasks = useMemo(
    () => (user ? allCalendarTasks(data, user.id, today) : []),
    [data, user, today],
  );
  const upcoming = nextTask(tasks, now),
    overdue = overdueDoses(tasks, now),
    dayTasks = useMemo(
      () => (user ? buildTasks(data, user.id, selected, selected) : []),
      [data, user, selected],
    );
  const otherOverdue = overdue.filter(
    (t) => bangkokDate(t.scheduledAt) !== selected,
  );
  const nextAppointments = data.appointments
    .filter(
      (a) =>
        a.patientId === user?.id &&
        a.status === "scheduled" &&
        new Date(a.scheduledAt) >= now,
    )
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  async function confirm() {
    if (!action) return;
    setError(null);
    try {
      await mutate((r) =>
        action.correct
          ? r.correctDose(action.task.key)
          : r.confirmDose(
              action.task.medication!.id,
              action.task.medication!.version,
              action.task.scheduledAt,
            ),
      );
      setAction(null);
    } catch (e) {
      setAction(null);
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  }
  if (user?.role === "doctor")
    return (
      <Page title="ปฏิทินสุขภาพ" subtitle="นัดหมายของผู้ป่วยที่คุณดูแล">
        <Card>
          <Txt>จัดการตารางผู้ป่วยผ่านบัญชีแพทย์</Txt>
          <Button
            label="จัดการนัดหมาย"
            onPress={() => router.push("/account/doctor/appointments" as any)}
          />
          <Button
            label="จัดการยาและคำสั่งรักษา"
            variant="secondary"
            onPress={() => router.push("/account/doctor/medications" as any)}
          />
        </Card>
        <Txt style={styles.section}>นัดหมายที่บันทึกไว้</Txt>
        {data.appointments
          .filter((a) => a.status === "scheduled")
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
          .map((a) => (
            <Card key={a.id}>
              <Txt style={{ fontWeight: "700" }}>
                {data.profiles.find((p) => p.id === a.patientId)?.displayName}
              </Txt>
              <Txt>{a.title}</Txt>
              <Txt>
                {thaiDate(a.scheduledAt)} • {bangkokTime(a.scheduledAt)} น.
              </Txt>
              <Button
                label="ดูผู้ป่วย"
                variant="secondary"
                onPress={() =>
                  router.push(
                    `/account/doctor/patient?id=${a.patientId}` as any,
                  )
                }
              />
            </Card>
          ))}
      </Page>
    );
  const minutes = upcoming
    ? Math.max(
        0,
        Math.round(
          (new Date(upcoming.scheduledAt).getTime() - now.getTime()) / 60000,
        ),
      )
    : 0;
  return (
    <Page title="ปฏิทินสุขภาพ" subtitle={`สวัสดี ${user?.displayName ?? ""}`}>
      <ErrorText text={error} />
      <Card style={s.next}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Txt style={styles.section}>สิ่งที่ต้องทำถัดไป</Txt>
          <Badge text="เวลาปัจจุบัน" />
        </View>
        {upcoming ? (
          <>
            <Txt style={s.time}>{bangkokTime(upcoming.scheduledAt)} น.</Txt>
            <Txt style={{ fontSize: 14, color: colors.muted }}>
              {thaiDate(upcoming.scheduledAt)} •{" "}
              {minutes === 0
                ? "ถึงเวลาแล้ว"
                : minutes < 60
                  ? `อีก ${minutes} นาที`
                  : `อีก ${Math.floor(minutes / 60)} ชั่วโมง ${minutes % 60} นาที`}
            </Txt>
            <Txt style={{ fontSize: 21, fontWeight: "700" }}>
              {upcoming.medication?.medicineName ?? upcoming.appointment?.title}
            </Txt>
            <Txt>
              {upcoming.medication
                ? `${upcoming.medication.amountPerDose} ${upcoming.medication.amountUnit}`
                : `${upcoming.appointment?.department} • ${upcoming.appointment?.hospitalName}`}
            </Txt>
            {upcoming.kind === "medication" ? (
              <>
                <Button
                  label="ยืนยันการรับประทาน"
                  disabled={busy || minutes > 15}
                  onPress={() => setAction({ task: upcoming, correct: false })}
                />
                {minutes > 15 && (
                  <Txt style={{ fontSize: 13, color: colors.muted }}>
                    ยืนยันได้เมื่อใกล้เวลาที่แพทย์กำหนด
                  </Txt>
                )}
                <Button
                  label="ดูคำสั่งแพทย์"
                  variant="secondary"
                  onPress={() =>
                    router.push(
                      `/calendar/medication/${upcoming.medication!.id}` as any,
                    )
                  }
                />
              </>
            ) : (
              <Button
                label="ดูรายละเอียด / รับทราบนัด"
                onPress={() =>
                  router.push(
                    `/calendar/appointment/${upcoming.appointment!.id}` as any,
                  )
                }
              />
            )}
          </>
        ) : (
          <>
            <Txt style={{ fontSize: 20, fontWeight: "700" }}>
              ยังไม่มีรายการถัดไป
            </Txt>
            <Txt>คุณสามารถดูรายการที่ผ่านมาและคำสั่งแพทย์ด้านล่าง</Txt>
          </>
        )}
      </Card>
      {overdue.length > 0 && (
        <Card
          style={{ backgroundColor: colors.amberSoft, borderColor: "#F0D4AE" }}
        >
          <Badge
            text={`${overdue.length} รายการเลยเวลา — ยังไม่ได้ยืนยัน`}
            tone="amber"
          />
          <Txt style={{ fontSize: 14, color: colors.amber }}>
            รายการยังคงอยู่ กรุณาสอบถามแพทย์หรือเภสัชกรเรื่องยาที่พลาด
            ไม่ควรเพิ่มขนาดยาเอง
          </Txt>
        </Card>
      )}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <Button
          label="‹ 7 วัน"
          variant="secondary"
          onPress={() => setWeek(addDays(week, -7))}
        />
        <Button
          label="วันนี้"
          variant="secondary"
          onPress={() => {
            setWeek(today);
            setSelected(today);
          }}
        />
        <Button
          label="7 วัน ›"
          variant="secondary"
          onPress={() => setWeek(addDays(week, 7))}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 5 }}
      >
        {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map((day) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={thaiDate(day)}
            accessibilityState={{ selected: selected === day }}
            key={day}
            onPress={() => setSelected(day)}
            style={[
              s.day,
              selected === day && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
          >
            <Txt
              style={{
                fontSize: 12,
                color: selected === day ? "white" : colors.muted,
              }}
            >
              {new Date(`${day}T12:00:00+07:00`).toLocaleDateString("th-TH", {
                weekday: "short",
                timeZone: "Asia/Bangkok",
              })}
            </Txt>
            <Txt
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: selected === day ? "white" : colors.text,
              }}
            >
              {Number(day.slice(-2))}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      <Txt style={styles.section}>
        {selected === today ? "รายการวันนี้" : thaiDate(selected)}
      </Txt>
      {dayTasks.length ? (
        dayTasks.map((t) => (
          <TaskRow
            key={t.key}
            task={t}
            now={now}
            busy={busy}
            onConfirm={(t) => setAction({ task: t, correct: false })}
            onCorrect={(t) => setAction({ task: t, correct: true })}
          />
        ))
      ) : (
        <Empty text="ไม่มีตารางยาและนัดหมายในวันนี้" />
      )}
      {otherOverdue.length > 0 && (
        <>
          <Txt style={styles.section}>
            รายการค้างจากวันอื่น ({otherOverdue.length})
          </Txt>
          {otherOverdue.slice(0, historyLimit).map((t) => (
            <TaskRow
              key={t.key}
              task={t}
              now={now}
              showDate
              busy={busy}
              onConfirm={(t) => setAction({ task: t, correct: false })}
            />
          ))}
          {otherOverdue.length > historyLimit && (
            <Button
              label={`ดูรายการค้างเพิ่มเติม (เหลือ ${otherOverdue.length - historyLimit})`}
              variant="secondary"
              onPress={() => setHistoryLimit((n) => n + 20)}
            />
          )}
        </>
      )}
      <Txt style={styles.section}>นัดหมายครั้งถัดไป</Txt>
      {nextAppointments.length ? (
        nextAppointments.map((a) => (
          <Card key={a.id}>
            <Txt style={{ fontWeight: "700" }}>{a.title}</Txt>
            <Txt>
              {thaiDate(a.scheduledAt)} • {bangkokTime(a.scheduledAt)} น.
            </Txt>
            <Txt style={{ color: colors.muted }}>
              {a.department} • {a.hospitalName}
            </Txt>
            <Button
              label="ดูรายละเอียด"
              variant="secondary"
              onPress={() =>
                router.push(`/calendar/appointment/${a.id}` as any)
              }
            />
          </Card>
        ))
      ) : (
        <Empty text="ไม่มีนัดหมายที่กำลังจะมาถึง" />
      )}
      <Txt style={styles.section}>ประวัตินัดและรายการที่หยุด</Txt>
      {data.appointments
        .filter(
          (a) =>
            a.patientId === user?.id &&
            (a.status !== "scheduled" || new Date(a.scheduledAt) < now),
        )
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
        .map((a) => (
          <Card key={`history-${a.id}`}>
            <Badge
              text={
                a.status === "cancelled"
                  ? "ยกเลิกนัด"
                  : a.status === "completed"
                    ? "แพทย์ระบุว่านัดเสร็จสิ้น"
                    : "ผ่านเวลานัด • ไม่มีข้อมูลการเข้าร่วม"
              }
              tone={a.status === "cancelled" ? "red" : "amber"}
            />
            <Txt style={{ fontWeight: "700" }}>{a.title}</Txt>
            <Txt>
              {thaiDate(a.scheduledAt)} • {bangkokTime(a.scheduledAt)} น.
            </Txt>
            <Button
              label="ดูรายละเอียด"
              variant="secondary"
              onPress={() =>
                router.push(`/calendar/appointment/${a.id}` as any)
              }
            />
          </Card>
        ))}
      {data.medications
        .filter((m) => m.patientId === user?.id && !m.isActive)
        .map((m) => (
          <Card key={`history-${m.id}`}>
            <Badge text="แพทย์หยุดใช้รายการนี้แล้ว" tone="amber" />
            <Txt>{m.medicineName}</Txt>
            <Button
              label="ดูคำสั่งและประวัติ"
              variant="secondary"
              onPress={() => router.push(`/calendar/medication/${m.id}` as any)}
            />
          </Card>
        ))}
      <Button
        label="รีเฟรชข้อมูล"
        variant="secondary"
        onPress={() => void refresh()}
      />
      {action && (
        <Confirmation
          title={action.correct ? "แก้ไขการยืนยัน" : "รับประทานแล้วใช่ไหม?"}
          description={
            action.correct
              ? "การยืนยันครั้งเดิมจะถูกระบุว่าแก้ไข และรายการจะกลับมารอยืนยัน"
              : `${action.task.medication?.medicineName} • ${thaiDate(action.task.scheduledAt)} เวลา ${bangkokTime(action.task.scheduledAt)} น. การยืนยันเป็นการบันทึกด้วยตนเอง`
          }
          busy={busy}
          onConfirm={() => void confirm()}
          onCancel={() => setAction(null)}
        />
      )}
    </Page>
  );
}
const s = StyleSheet.create({
  next: { backgroundColor: "#DCEEFF", borderColor: "#C1DEFC", gap: 12 },
  time: {
    fontSize: 36,
    lineHeight: 46,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  day: {
    minWidth: 42,
    minHeight: 76,
    padding: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
});
