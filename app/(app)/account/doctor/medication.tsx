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
  Choice,
  ConfirmDialog,
  DateTimeField,
  PatientSelector,
  Toggle,
  doctorStyles,
  mealLabels,
} from "@/src/components/doctor/DoctorCommon";
import { useApp } from "@/src/providers/AppProvider";
import { MedicationInput, MedicationPlan } from "@/src/domain/types";
import { bangkokDate, bangkokTime, thaiDate } from "@/src/domain/dateTime";
import { validateMedication } from "@/src/domain/validation";

export default function MedicationScreen() {
  const params = useLocalSearchParams<{ id?: string; patientId?: string }>();
  const { data, loading } = useApp();
  const existing = params.id
    ? data.medications.find((item) => item.id === params.id)
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
      <Page title="รายการยา" back>
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
    <MedicationForm
      key={existing?.id ?? `new-${patientId ?? "select"}`}
      existing={existing}
      initialPatientId={patientId ?? ""}
    />
  );
}

function MedicationForm({
  existing,
  initialPatientId,
}: {
  existing?: MedicationPlan;
  initialPatientId: string;
}) {
  const { mutate, busy, now, user } = useApp();
  const [patientId, setPatientId] = useState(initialPatientId);
  const [medicineName, setMedicineName] = useState(
    existing?.medicineName ?? "",
  );
  const [strengthValue, setStrengthValue] = useState(
    existing?.strengthValue ?? "",
  );
  const [strengthUnit, setStrengthUnit] = useState(
    existing?.strengthUnit ?? "",
  );
  const [amountPerDose, setAmountPerDose] = useState(
    existing?.amountPerDose ?? "",
  );
  const [amountUnit, setAmountUnit] = useState(existing?.amountUnit ?? "");
  const [instructions, setInstructions] = useState(
    existing?.instructions ?? "",
  );
  const [mealInstruction, setMealInstruction] = useState<
    MedicationPlan["mealInstruction"]
  >(existing?.mealInstruction ?? "per_doctor");
  const [timeSlots, setTimeSlots] = useState<string[]>(
    existing?.timeSlots ?? ["08:00"],
  );
  const [startDate, setStartDate] = useState(
    existing?.startDate ?? bangkokDate(now),
  );
  const [hasEndDate, setHasEndDate] = useState(Boolean(existing?.endDate));
  const [endDate, setEndDate] = useState(existing?.endDate ?? bangkokDate(now));
  const [note, setNote] = useState(existing?.note ?? "");
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [remindersEnabled, setRemindersEnabled] = useState(
    existing?.remindersEnabled ?? true,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmation, setConfirmation] = useState<"stop" | "edit" | null>(
    null,
  );
  const pendingInput = useRef<MedicationInput | null>(null);
  const submitting = useRef(false);
  const save = async (input: MedicationInput) => {
    if (submitting.current || saved) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      await mutate((repository) =>
        repository.saveMedication(input, existing?.id),
      );
      setConfirmation(null);
      setSaved(true);
    } catch (problem) {
      setConfirmation(null);
      setError(
        problem instanceof Error
          ? problem.message
          : "บันทึกรายการยาไม่สำเร็จ กรุณาลองใหม่",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  const submit = () => {
    if (saving || busy || saved) return;
    const input: MedicationInput = {
      patientId,
      medicineName: medicineName.trim(),
      strengthValue: strengthValue.trim(),
      strengthUnit: strengthUnit.trim(),
      amountPerDose: amountPerDose.trim(),
      amountUnit: amountUnit.trim(),
      mealInstruction,
      instructions: instructions.trim(),
      startDate,
      endDate: hasEndDate ? endDate : null,
      timeSlots: timeSlots.map((time) => time.trim()).sort(),
      weekdays: existing?.weekdays ?? null,
      timeZone: "Asia/Bangkok",
      isActive,
      remindersEnabled,
      note: note.trim(),
    };
    const validation = validateMedication(input);
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
  };
  const stop = async () => {
    if (!existing || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      await mutate((repository) =>
        repository.deactivateMedication(existing.id),
      );
      setConfirmation(null);
      setSaved(true);
    } catch (problem) {
      setConfirmation(null);
      setError(
        problem instanceof Error ? problem.message : "หยุดรายการยาไม่สำเร็จ",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  return (
    <Page
      title={existing ? "แก้ไขรายการยา" : "เพิ่มรายการยา"}
      subtitle="คำสั่งและตารางยาที่แพทย์เป็นผู้กำหนด"
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
              text={`ฉบับที่ ${existing.version} • ${existing.isActive ? "ใช้งานอยู่" : "หยุดรายการแล้ว"}`}
              tone={existing.isActive ? "blue" : "red"}
            />
            <Txt style={doctorStyles.muted}>
              ปรับปรุง {thaiDate(existing.updatedAt)}{" "}
              {bangkokTime(existing.updatedAt)} น.
            </Txt>
            <Txt style={doctorStyles.muted}>
              การแก้ไขจะสร้างฉบับใหม่
              การยืนยันฉบับเดิมยังอยู่ในประวัติและไม่ถูกนับเป็นการรับประทานตามฉบับใหม่
            </Txt>
          </View>
        </Card>
      ) : null}
      <Card>
        <View style={doctorStyles.stack}>
          <Txt style={doctorStyles.body}>
            แพทย์ผู้บันทึก: {user?.displayName}
          </Txt>
          <Field
            label="ชื่อยา *"
            value={medicineName}
            onChangeText={setMedicineName}
            placeholder="ชื่อยาตามคำสั่งแพทย์"
            testID="medicine-name"
          />
          <Txt style={doctorStyles.muted}>
            ขนาดยาเป็นความแรงของยา
            ส่วนจำนวนต่อครั้งคือปริมาณที่ให้ผู้ป่วยรับประทาน
          </Txt>
          <Field
            label="ขนาดยา / ความแรง (ถ้าทราบ)"
            value={strengthValue}
            onChangeText={setStrengthValue}
            keyboardType="decimal-pad"
            placeholder="เช่น 5"
          />
          <Field
            label="หน่วยความแรง"
            value={strengthUnit}
            onChangeText={setStrengthUnit}
            placeholder="เช่น mg"
          />
          <Field
            label="จำนวนที่รับประทานต่อครั้ง *"
            value={amountPerDose}
            onChangeText={setAmountPerDose}
            keyboardType="decimal-pad"
            placeholder="เช่น 1 หรือ 0.5"
            testID="dose-amount"
          />
          <Field
            label="หน่วยจำนวนต่อครั้ง *"
            value={amountUnit}
            onChangeText={setAmountUnit}
            placeholder="เช่น เม็ด หรือ mL"
          />
          <Field
            label="วิธีใช้ตามคำสั่งแพทย์"
            value={instructions}
            onChangeText={setInstructions}
            placeholder="กรอกคำสั่งการใช้ยา"
            multiline
          />
          <Choice
            label="ช่วงเวลาอาหาร *"
            value={mealInstruction}
            onChange={setMealInstruction}
            options={(
              Object.entries(mealLabels) as [
                MedicationPlan["mealInstruction"],
                string,
              ][]
            ).map(([value, label]) => ({ value, label }))}
          />
        </View>
      </Card>
      <Card>
        <View style={doctorStyles.stack}>
          <Txt style={doctorStyles.section}>เวลาเตือน (เวลาไทย) *</Txt>
          <Txt style={doctorStyles.muted}>
            {existing?.weekdays?.length
              ? "รายการเดิมใช้วันที่เลือกไว้ คงวันเดิมเมื่อบันทึก"
              : "ความถี่: ทุกวัน"}
          </Txt>
          {timeSlots.map((time, index) => (
            <View key={index} style={doctorStyles.stack}>
              <DateTimeField
                label={`เวลาที่ ${index + 1}`}
                value={time}
                mode="time"
                onChange={(value) =>
                  setTimeSlots((current) =>
                    current.map((slot, slotIndex) =>
                      slotIndex === index ? value : slot,
                    ),
                  )
                }
              />
              {timeSlots.length > 1 ? (
                <Button
                  label={`นำเวลาที่ ${index + 1} ออก`}
                  variant="secondary"
                  onPress={() =>
                    setTimeSlots((current) =>
                      current.filter((_, slotIndex) => slotIndex !== index),
                    )
                  }
                />
              ) : null}
            </View>
          ))}
          <Button
            label="+ เพิ่มเวลาเตือน"
            variant="secondary"
            disabled={timeSlots.length >= 8}
            onPress={() => setTimeSlots((current) => [...current, "20:00"])}
          />
          <DateTimeField
            label="วันที่เริ่ม *"
            value={startDate}
            onChange={setStartDate}
            mode="date"
          />
          <Toggle
            label="กำหนดวันที่สิ้นสุด"
            value={hasEndDate}
            onChange={setHasEndDate}
          />
          {hasEndDate ? (
            <DateTimeField
              label="วันที่สิ้นสุด *"
              value={endDate}
              onChange={setEndDate}
              mode="date"
            />
          ) : null}
          <Field
            label="เหตุผล / คำแนะนำเพิ่มเติม"
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="คำแนะนำที่แพทย์บันทึก"
          />
          <Toggle
            label="เปิดใช้รายการยา"
            value={isActive}
            onChange={setIsActive}
          />
          <Toggle
            label="เปิดการแจ้งเตือน"
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
              ผู้ป่วยจะเห็นคำสั่งล่าสุดในปฏิทินและคำตอบของกรรเมื่อโหลดข้อมูล
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
          label={existing ? "บันทึกการเปลี่ยนแปลง" : "บันทึกรายการยา"}
          onPress={submit}
          loading={saving}
          disabled={saving || busy}
          testID="save-medication"
        />
      )}
      {existing?.isActive && !saved ? (
        <Button
          label="หยุดใช้รายการยาตามคำสั่งแพทย์"
          variant="danger"
          disabled={saving || busy}
          onPress={() => setConfirmation("stop")}
        />
      ) : null}
      <Card>
        <Txt style={doctorStyles.muted}>
          สแกนใบสั่งยา: เตรียมเพิ่มในระยะถัดไป
          ปัจจุบันคำสั่งทั้งหมดมาจากการกรอกของแพทย์
        </Txt>
      </Card>
      <ConfirmDialog
        visible={confirmation !== null}
        title={
          confirmation === "stop"
            ? "ยืนยันหยุดรายการยา?"
            : "ยืนยันแก้ไขคำสั่งยา?"
        }
        message={
          confirmation === "stop"
            ? "เฉพาะแพทย์เป็นผู้สั่งหยุดรายการนี้ ยาจะไม่ปรากฏเป็นงานถัดไปและหยุดการเตือนหลังซิงก์ ประวัติการยืนยันเดิมยังอยู่"
            : "กรุณาตรวจสอบชื่อยา จำนวน หน่วย วิธีใช้ และเวลา การบันทึกจะใช้คำสั่งฉบับใหม่แทนฉบับเดิม"
        }
        confirmLabel={
          confirmation === "stop"
            ? "ยืนยันหยุดรายการยา"
            : "ยืนยันบันทึกคำสั่งยา"
        }
        busy={saving || busy}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          if (confirmation === "stop") void stop();
          else if (pendingInput.current) void save(pendingInput.current);
        }}
      />
    </Page>
  );
}
