import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { Badge, Button, Card, Field, Txt, colors } from "@/src/components/ui";
import { useApp } from "@/src/providers/AppProvider";
import { Appointment, MedicationPlan, Profile } from "@/src/domain/types";
import { bangkokTime, thaiDate } from "@/src/domain/dateTime";

export const doctorStyles = StyleSheet.create({
  stack: { gap: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  body: { fontSize: 16, color: colors.text, lineHeight: 25 },
  muted: { fontSize: 15, color: colors.muted, lineHeight: 24 },
  section: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.soft },
});

export const mealLabels: Record<MedicationPlan["mealInstruction"], string> = {
  before: "ก่อนอาหาร",
  after: "หลังอาหาร",
  with: "พร้อมอาหาร",
  none: "ไม่เกี่ยวกับอาหาร",
  per_doctor: "ตามคำสั่งแพทย์",
};

export function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <Card>
      <View style={doctorStyles.stack}>
        <View style={doctorStyles.avatar}>
          <Txt
            style={{ fontSize: 26, fontWeight: "700", color: colors.primary }}
          >
            {profile.role === "doctor" ? "✚" : profile.displayName.slice(0, 1)}
          </Txt>
        </View>
        <Txt style={doctorStyles.title}>{profile.displayName}</Txt>
        <Badge text={profile.role === "doctor" ? "แพทย์" : "ผู้ป่วย"} />
        {profile.patientNumber ? (
          <Txt style={doctorStyles.muted}>
            HN {profile.patientNumber}
            {profile.age ? ` • อายุ ${profile.age} ปี` : ""}
          </Txt>
        ) : null}
        {profile.hospitalName ? (
          <Txt style={doctorStyles.muted}>{profile.hospitalName}</Txt>
        ) : null}
        {profile.department ? (
          <Txt style={doctorStyles.muted}>แผนก{profile.department}</Txt>
        ) : null}
      </View>
    </Card>
  );
}

export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={doctorStyles.stack}>
      <Txt style={doctorStyles.body}>{label}</Txt>
      <View style={doctorStyles.row}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === option.value }}
            onPress={() => onChange(option.value)}
            style={[
              doctorStyles.chip,
              value === option.value && doctorStyles.chipSelected,
            ]}
          >
            <Txt
              style={{
                color:
                  value === option.value ? colors.primaryDark : colors.text,
                fontSize: 16,
              }}
            >
              {option.label}
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 48,
        gap: 8,
      }}
    >
      <Txt style={[doctorStyles.body, { flex: 1 }]}>{label}</Txt>
      <Switch
        pointerEvents="none"
        accessible={false}
        value={value}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </Pressable>
  );
}

export function DateTimeField({
  label,
  value,
  onChange,
  mode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mode: "date" | "time";
}) {
  const [open, setOpen] = useState(false);
  if (Platform.OS === "web")
    return (
      <Field
        label={`${label} (${mode === "date" ? "ค.ศ. YYYY-MM-DD" : "HH:mm"})`}
        value={value}
        onChangeText={onChange}
        placeholder={mode === "date" ? "2026-10-20" : "08:00"}
      />
    );
  const parsed =
    mode === "date"
      ? new Date(`${value}T12:00:00`)
      : new Date(`2000-01-01T${value}:00`);
  const current = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const changed = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    if (event.type !== "dismissed" && picked) {
      const pad = (n: number) => String(n).padStart(2, "0");
      onChange(
        mode === "date"
          ? `${picked.getFullYear()}-${pad(picked.getMonth() + 1)}-${pad(picked.getDate())}`
          : `${pad(picked.getHours())}:${pad(picked.getMinutes())}`,
      );
    }
  };
  return (
    <View style={doctorStyles.stack}>
      <Txt style={doctorStyles.body}>{label}</Txt>
      <Button
        label={
          value
            ? mode === "date"
              ? thaiDate(value)
              : `${value} น.`
            : "เลือกวันที่"
        }
        variant="secondary"
        onPress={() => setOpen(true)}
      />
      {open ? (
        <View>
          <DateTimePicker
            value={current}
            mode={mode}
            is24Hour
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={changed}
          />
          {Platform.OS === "ios" ? (
            <Button label="เลือกเรียบร้อย" onPress={() => setOpen(false)} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#17314D88",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Card>
          <View style={doctorStyles.stack}>
            <Txt style={doctorStyles.title}>{title}</Txt>
            <Txt style={doctorStyles.body}>{message}</Txt>
            <Button
              label={confirmLabel}
              variant="danger"
              onPress={onConfirm}
              loading={busy}
              disabled={busy}
            />
            <Button
              label="กลับไปตรวจสอบ"
              variant="secondary"
              onPress={onCancel}
              disabled={busy}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

export function PatientSelector({
  value,
  onChange,
  locked,
}: {
  value: string;
  onChange: (id: string) => void;
  locked?: boolean;
}) {
  const { data } = useApp();
  const patients = data.profiles.filter(
    (profile) => profile.role === "patient",
  );
  if (locked) {
    const patient = patients.find((profile) => profile.id === value);
    return (
      <Card>
        <Txt style={doctorStyles.muted}>ผู้ป่วยที่เลือก</Txt>
        <Txt style={doctorStyles.title}>
          {patient?.displayName ?? "ไม่พบผู้ป่วยที่คุณได้รับมอบหมาย"}
        </Txt>
        <Txt style={doctorStyles.muted}>
          {patient?.patientNumber ? `HN ${patient.patientNumber}` : ""}
        </Txt>
      </Card>
    );
  }
  return (
    <Choice
      label="เลือกผู้ป่วยที่ได้รับมอบหมาย"
      value={value}
      options={patients.map((patient) => ({
        value: patient.id,
        label: `${patient.displayName} • ${patient.patientNumber ?? ""}`,
      }))}
      onChange={onChange}
    />
  );
}

export function AppointmentCard({
  appointment,
  showPatient,
}: {
  appointment: Appointment;
  showPatient?: boolean;
}) {
  const { data, now } = useApp();
  const patient = data.profiles.find(
    (profile) => profile.id === appointment.patientId,
  );
  const past = new Date(appointment.scheduledAt).getTime() < now.getTime();
  return (
    <Card>
      <View style={doctorStyles.stack}>
        {showPatient ? (
          <Txt style={doctorStyles.muted}>
            {patient?.displayName ?? "ผู้ป่วย"}
          </Txt>
        ) : null}
        <Txt style={doctorStyles.title}>{appointment.title}</Txt>
        <Txt style={doctorStyles.body}>
          {thaiDate(appointment.scheduledAt)} •{" "}
          {bangkokTime(appointment.scheduledAt)} น.
        </Txt>
        <Txt style={doctorStyles.muted}>
          {appointment.hospitalName} • {appointment.department}
        </Txt>
        <Badge
          text={
            appointment.status === "cancelled"
              ? "ยกเลิกนัดแล้ว"
              : appointment.status === "completed"
                ? "สิ้นสุดนัด"
                : past
                  ? "ผ่านเวลานัด"
                  : "นัดหมาย"
          }
          tone={
            appointment.status === "cancelled" ? "red" : past ? "amber" : "blue"
          }
        />
        {past && appointment.status === "scheduled" ? (
          <Txt style={doctorStyles.muted}>
            ผ่านเวลานัดไม่ได้หมายความว่าผู้ป่วยเข้าพบแพทย์แล้ว
          </Txt>
        ) : null}
        <Txt style={doctorStyles.muted}>
          ฉบับที่ {appointment.version}
          {appointment.status !== "cancelled"
            ? ` • ${appointment.acknowledgedVersion === appointment.version ? "ผู้ป่วยรับทราบรายละเอียดแล้ว" : "รอผู้ป่วยรับทราบ"}`
            : ""}
        </Txt>
        <Button
          label="ดูรายละเอียด / แก้ไข"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/account/doctor/appointment",
              params: { id: appointment.id, patientId: appointment.patientId },
            })
          }
        />
      </View>
    </Card>
  );
}

export function MedicationCard({
  medication,
  showPatient,
}: {
  medication: MedicationPlan;
  showPatient?: boolean;
}) {
  const { data } = useApp();
  const patient = data.profiles.find(
    (profile) => profile.id === medication.patientId,
  );
  return (
    <Card>
      <View style={doctorStyles.stack}>
        {showPatient ? (
          <Txt style={doctorStyles.muted}>
            {patient?.displayName ?? "ผู้ป่วย"}
          </Txt>
        ) : null}
        <Txt style={doctorStyles.title}>{medication.medicineName}</Txt>
        {medication.strengthValue ? (
          <Txt style={doctorStyles.muted}>
            ขนาดยา {medication.strengthValue} {medication.strengthUnit}
          </Txt>
        ) : null}
        <Txt style={doctorStyles.body}>
          ครั้งละ {medication.amountPerDose} {medication.amountUnit} •{" "}
          {mealLabels[medication.mealInstruction]}
        </Txt>
        <Txt style={doctorStyles.body}>
          {medication.timeSlots.join(" และ ")} น.
        </Txt>
        <Txt style={doctorStyles.muted}>
          เริ่ม {thaiDate(medication.startDate)}
          {medication.endDate
            ? ` ถึง ${thaiDate(medication.endDate)}`
            : " • ไม่ได้กำหนดวันสิ้นสุด"}
        </Txt>
        <Badge
          text={medication.isActive ? "ใช้งานอยู่" : "แพทย์หยุดรายการยาแล้ว"}
          tone={medication.isActive ? "green" : "red"}
        />
        <Txt style={doctorStyles.muted}>
          ฉบับที่ {medication.version} •{" "}
          {medication.weekdays?.length ? "ตามวันที่แพทย์เลือก" : "ทุกวัน"}
        </Txt>
        <Button
          label="ดูรายละเอียด / แก้ไข"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/account/doctor/medication",
              params: { id: medication.id, patientId: medication.patientId },
            })
          }
        />
      </View>
    </Card>
  );
}
