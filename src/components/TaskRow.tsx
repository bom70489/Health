import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { HealthTask, MEAL_LABELS } from "../domain/types";
import { bangkokTime, thaiDate } from "../domain/dateTime";
import { Badge, Button, Card, Txt, colors } from "./ui";

export function TaskRow({
  task,
  now,
  onConfirm,
  onCorrect,
  busy = false,
  showDate = false,
}: {
  task: HealthTask;
  now: Date;
  onConfirm?: (task: HealthTask) => void;
  onCorrect?: (task: HealthTask) => void;
  busy?: boolean;
  showDate?: boolean;
}) {
  const med = task.medication,
    appt = task.appointment,
    overdue =
      task.kind === "medication" &&
      task.status === "pending" &&
      new Date(task.scheduledAt) < now;
  return (
    <Card
      style={{
        backgroundColor:
          task.status === "confirmed"
            ? "#F4FCF7"
            : overdue
              ? "#FFFAF3"
              : "white",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor:
              task.kind === "medication" ? colors.soft : "#E4F3FF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={
              task.kind === "medication"
                ? "medical-outline"
                : "calendar-outline"
            }
            color={colors.primary}
            size={22}
          />
        </View>
        <Txt style={{ fontSize: 22, fontWeight: "800" }}>
          {bangkokTime(task.scheduledAt)} น.
        </Txt>
      </View>
      {showDate && (
        <Txt style={{ color: colors.muted, fontSize: 14 }}>
          {thaiDate(task.scheduledAt)}
        </Txt>
      )}
      <Txt style={{ fontSize: 18, fontWeight: "700" }}>
        {med?.medicineName ?? appt?.title}
      </Txt>
      {med ? (
        <>
          <Txt>
            {med.amountPerDose} {med.amountUnit} •{" "}
            {MEAL_LABELS[med.mealInstruction]}
          </Txt>
          {med.instructions && (
            <Txt style={{ color: colors.muted, fontSize: 14 }}>
              {med.instructions}
            </Txt>
          )}
          <Badge
            text={
              task.status === "confirmed"
                ? "รับประทานแล้ว"
                : overdue
                  ? "เลยเวลา — ยังไม่ได้ยืนยัน"
                  : "ยังไม่ได้รับประทาน"
            }
            tone={
              task.status === "confirmed" ? "green" : overdue ? "amber" : "blue"
            }
          />
          {task.confirmedAt && (
            <Txt style={{ fontSize: 13, color: colors.muted }}>
              ยืนยันเมื่อ {bangkokTime(task.confirmedAt)} น. • บันทึกด้วยตนเอง
            </Txt>
          )}
          {onConfirm && task.status === "pending" && (
            <Button
              label="รับประทานแล้ว ✓"
              disabled={
                busy ||
                new Date(task.scheduledAt).getTime() >
                  now.getTime() + 15 * 60000
              }
              onPress={() => onConfirm(task)}
            />
          )}
          {onCorrect && task.status === "confirmed" && (
            <Button
              label="แก้ไขการยืนยัน"
              variant="secondary"
              disabled={busy}
              onPress={() => onCorrect(task)}
            />
          )}
          <Button
            label="ดูคำสั่งแพทย์"
            variant="secondary"
            onPress={() => router.push(`/calendar/medication/${med.id}` as any)}
          />
        </>
      ) : (
        <>
          <Txt style={{ color: colors.muted }}>
            {appt?.department} • {appt?.hospitalName}
          </Txt>
          <Badge
            text={
              new Date(task.scheduledAt) < now
                ? "ผ่านเวลานัดแล้ว"
                : appt?.acknowledgedVersion === appt?.version
                  ? "รับทราบรายละเอียดแล้ว"
                  : "ยังไม่ได้รับทราบนัด"
            }
            tone={
              appt?.acknowledgedVersion === appt?.version ? "green" : "blue"
            }
          />
          <Button
            label="ดูรายละเอียด"
            variant="secondary"
            onPress={() =>
              router.push(`/calendar/appointment/${appt!.id}` as any)
            }
          />
        </>
      )}
    </Card>
  );
}
