import React, { useRef, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorText,
  Field,
  Page,
  Txt,
} from "@/src/components/ui";
import {
  ConfirmDialog,
  DateTimeField,
  PatientSelector,
  Toggle,
  doctorStyles,
} from "@/src/components/doctor/DoctorCommon";
import { useApp } from "@/src/providers/AppProvider";
import { Appointment, AppointmentInput } from "@/src/domain/types";
import {
  bangkokDate,
  bangkokTime,
  localToInstant,
  thaiDate,
} from "@/src/domain/dateTime";
import { validateAppointment } from "@/src/domain/validation";

export default function AppointmentScreen() {
  const params = useLocalSearchParams<{ id?: string; patientId?: string }>();
  const { data, loading } = useApp();
  const existing = params.id
    ? data.appointments.find((item) => item.id === params.id)
    : undefined;
  const patientId = existing?.patientId ?? params.patientId;
  if (
    (params.id && !existing) ||
    (patientId &&
      !data.profiles.some(
        (profile) => profile.id === patientId && profile.role === "patient",
      )) ||
    (existing && params.patientId && existing.patientId !== params.patientId)
  )
    return (
      <Page title="นัดหมาย" back>
        <Empty
          text={
            loading
              ? "กำลังโหลดข้อมูล..."
              : "ไม่พบรายการ หรือคุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้"
          }
        />
      </Page>
    );
  return (
    <AppointmentForm
      key={existing?.id ?? `new-${patientId ?? "select"}`}
      existing={existing}
      initialPatientId={patientId ?? ""}
    />
  );
}

function AppointmentForm({
  existing,
  initialPatientId,
}: {
  existing?: Appointment;
  initialPatientId: string;
}) {
  const { user, mutate, busy, now } = useApp();
  const [patientId, setPatientId] = useState(initialPatientId);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [date, setDate] = useState(
    existing ? bangkokDate(existing.scheduledAt) : bangkokDate(now),
  );
  const [time, setTime] = useState(
    existing ? bangkokTime(existing.scheduledAt) : "14:00",
  );
  const [hospitalName, setHospitalName] = useState(
    existing?.hospitalName ?? user?.hospitalName ?? "",
  );
  const [department, setDepartment] = useState(
    existing?.department ?? user?.department ?? "",
  );
  const [locationDetail, setLocationDetail] = useState(
    existing?.locationDetail ?? "",
  );
  const [hospitalAddress, setHospitalAddress] = useState(
    existing?.hospitalAddress ?? "",
  );
  const [hospitalPhone, setHospitalPhone] = useState(
    existing?.hospitalPhone ?? "",
  );
  const [preparationNote, setPreparationNote] = useState(
    existing?.preparationNote ?? "",
  );
  const [remindersEnabled, setRemindersEnabled] = useState(
    existing?.remindersEnabled ?? true,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmation, setConfirmation] = useState<"cancel" | "edit" | null>(
    null,
  );
  const pendingInput = useRef<AppointmentInput | null>(null);
  const submitting = useRef(false);
  const save = async (input: AppointmentInput) => {
    if (submitting.current || saved) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      await mutate((repository) =>
        repository.saveAppointment(input, existing?.id),
      );
      setSaved(true);
      setConfirmation(null);
    } catch (problem) {
      setConfirmation(null);
      setError(
        problem instanceof Error
          ? problem.message
          : "บันทึกนัดหมายไม่สำเร็จ กรุณาลองใหม่",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  const submit = () => {
    if (saving || busy || saved) return;
    try {
      const input: AppointmentInput = {
        patientId,
        title: title.trim(),
        scheduledAt: localToInstant(date, time),
        hospitalName: hospitalName.trim(),
        department: department.trim(),
        locationDetail: locationDetail.trim(),
        hospitalAddress: hospitalAddress.trim(),
        hospitalPhone: hospitalPhone.trim(),
        preparationNote: preparationNote.trim(),
        status: existing?.status ?? "scheduled",
        remindersEnabled,
      };
      const validation = validateAppointment(input);
      if (validation) {
        setError(validation);
        return;
      }
      if (!patientId) {
        setError("กรุณาเลือกผู้ป่วยที่ได้รับมอบหมาย");
        return;
      }
      setError(null);
      if (existing) {
        pendingInput.current = input;
        setConfirmation("edit");
      } else {
        void save(input);
      }
    } catch {
      setError(
        "กรุณาระบุวันที่จริงเป็น YYYY-MM-DD และเวลา 24 ชั่วโมงเป็น HH:mm",
      );
    }
  };
  const cancel = async () => {
    if (!existing || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      await mutate((repository) => repository.cancelAppointment(existing.id));
      setConfirmation(null);
      setSaved(true);
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : "ยกเลิกนัดหมายไม่สำเร็จ",
      );
      setConfirmation(null);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  return (
    <Page
      title={existing ? "แก้ไขนัดหมาย" : "เพิ่มนัดหมาย"}
      subtitle="กรอกข้อมูลด้วยตนเองเพื่อส่งถึงผู้ป่วย"
      back
    >
      <PatientSelector
        value={patientId}
        onChange={setPatientId}
        locked={Boolean(initialPatientId)}
      />
      {existing ? (
        <Card>
          <View style={doctorStyles.stack}>
            <Badge
              text={
                existing.status === "cancelled"
                  ? "นัดหมายถูกยกเลิกแล้ว"
                  : `ฉบับที่ ${existing.version}`
              }
              tone={existing.status === "cancelled" ? "red" : "blue"}
            />
            <Txt style={doctorStyles.muted}>
              ปรับปรุง {thaiDate(existing.updatedAt)}{" "}
              {bangkokTime(existing.updatedAt)} น.
            </Txt>
            <Txt style={doctorStyles.muted}>
              {existing.acknowledgedVersion === existing.version
                ? "ผู้ป่วยรับทราบรายละเอียดฉบับนี้แล้ว"
                : "ผู้ป่วยยังไม่ได้รับทราบรายละเอียดฉบับนี้"}
            </Txt>
            <Txt style={doctorStyles.muted}>
              การเปลี่ยนรายละเอียดจะสร้างฉบับใหม่ และให้ผู้ป่วยรับทราบอีกครั้ง
            </Txt>
          </View>
        </Card>
      ) : null}
      <Card>
        <View style={doctorStyles.stack}>
          <Field
            label="ประเภท / เหตุผลการนัด *"
            value={title}
            onChangeText={setTitle}
            placeholder="เช่น นัดติดตามอาการ"
            testID="appointment-title"
          />
          <Txt style={doctorStyles.body}>
            แพทย์ผู้บันทึก: {user?.displayName}
          </Txt>
          <DateTimeField
            label="วันที่นัด *"
            value={date}
            onChange={setDate}
            mode="date"
          />
          <DateTimeField
            label="เวลานัด * (เวลาไทย)"
            value={time}
            onChange={setTime}
            mode="time"
          />
          <Field
            label="ชื่อโรงพยาบาล *"
            value={hospitalName}
            onChangeText={setHospitalName}
            placeholder="ชื่อโรงพยาบาล"
          />
          <Field
            label="แผนก *"
            value={department}
            onChangeText={setDepartment}
            placeholder="เช่น อายุรกรรม"
          />
          <Field
            label="อาคาร / ชั้น / ห้อง"
            value={locationDetail}
            onChangeText={setLocationDetail}
            placeholder="ตำแหน่งที่ผู้ป่วยควรไป"
          />
          <Field
            label="ที่อยู่โรงพยาบาล"
            value={hospitalAddress}
            onChangeText={setHospitalAddress}
            multiline
          />
          <Field
            label="โทรศัพท์ติดต่อ"
            value={hospitalPhone}
            onChangeText={setHospitalPhone}
            keyboardType="phone-pad"
          />
          <Field
            label="คำแนะนำก่อนนัด"
            value={preparationNote}
            onChangeText={setPreparationNote}
            placeholder="ระบุเฉพาะคำแนะนำของแพทย์ หากไม่มีสามารถเว้นว่าง"
            multiline
          />
          <Toggle
            label="แจ้งเตือนผู้ป่วยก่อนนัด"
            value={remindersEnabled}
            onChange={setRemindersEnabled}
          />
        </View>
      </Card>
      <ErrorText text={error} />
      {saved ? (
        <Card>
          <View style={doctorStyles.stack}>
            <Txt style={doctorStyles.title}>บันทึกเรียบร้อยแล้ว</Txt>
            <Txt style={doctorStyles.body}>
              ข้อมูลล่าสุดจะปรากฏในปฏิทินผู้ป่วยและคำตอบของกรรเมื่อโหลดข้อมูล
            </Txt>
            <Button
              label="กลับไปข้อมูลผู้ป่วย"
              onPress={() =>
                router.replace({
                  pathname: "/account/doctor/patient",
                  params: { id: patientId },
                })
              }
            />
          </View>
        </Card>
      ) : (
        <Button
          label={existing ? "บันทึกการเปลี่ยนแปลง" : "บันทึกนัดหมาย"}
          onPress={submit}
          loading={saving}
          disabled={saving || busy}
          testID="save-appointment"
        />
      )}
      {existing && existing.status === "scheduled" && !saved ? (
        <Button
          label="ยกเลิกนัดหมาย"
          variant="danger"
          disabled={saving || busy}
          onPress={() => setConfirmation("cancel")}
        />
      ) : null}
      <Card>
        <Txt style={doctorStyles.muted}>
          สแกนใบนัด: เตรียมเพิ่มในระยะถัดไป
          ปัจจุบันบันทึกจากการกรอกของแพทย์เท่านั้น
        </Txt>
      </Card>
      <ConfirmDialog
        visible={confirmation !== null}
        title={
          confirmation === "cancel"
            ? "ยืนยันยกเลิกนัดหมาย?"
            : "ยืนยันแก้ไขนัดหมาย?"
        }
        message={
          confirmation === "cancel"
            ? "นัดนี้จะหยุดแสดงเป็นงานถัดไปและหยุดการเตือนหลังผู้ป่วยซิงก์ข้อมูล ประวัตินัดจะยังอยู่"
            : "ผู้ป่วยจะเห็นรายละเอียดฉบับใหม่และต้องรับทราบอีกครั้ง กรุณาตรวจสอบวัน เวลา และคำแนะนำก่อนบันทึก"
        }
        confirmLabel={
          confirmation === "cancel"
            ? "ยืนยันยกเลิกนัด"
            : "ยืนยันบันทึกการเปลี่ยนแปลง"
        }
        busy={saving || busy}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          if (confirmation === "cancel") void cancel();
          else if (pendingInput.current) void save(pendingInput.current);
        }}
      />
    </Page>
  );
}
