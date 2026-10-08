import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Empty, Field, Page, Txt } from "@/src/components/ui";
import {
  Choice,
  MedicationCard,
  doctorStyles,
} from "@/src/components/doctor/DoctorCommon";
import { useApp } from "@/src/providers/AppProvider";

export default function MedicationsScreen() {
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const { data, loading } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"active" | "all" | "inactive">("active");
  const medications = data.medications.filter((item) => {
    if (patientId && item.patientId !== patientId) return false;
    if (filter === "active" && !item.isActive) return false;
    if (filter === "inactive" && item.isActive) return false;
    const patient = data.profiles.find(
      (profile) => profile.id === item.patientId,
    );
    return `${item.medicineName} ${patient?.displayName ?? ""} ${patient?.patientNumber ?? ""}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase());
  });
  return (
    <Page title="ยาและคำสั่งรักษา" subtitle="ตารางยาที่กำหนดโดยแพทย์" back>
      <Button
        label="+ เพิ่มรายการยา"
        onPress={() =>
          router.push({
            pathname: "/account/doctor/medication",
            params: patientId ? { patientId } : {},
          })
        }
      />
      <Field
        label="ค้นหารายการยา"
        placeholder="ชื่อยา ชื่อผู้ป่วย หรือ HN"
        value={query}
        onChangeText={setQuery}
      />
      <Choice
        label="รายการที่แสดง"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "active", label: "ใช้งานอยู่" },
          { value: "all", label: "ทั้งหมด" },
          { value: "inactive", label: "หยุดใช้แล้ว" },
        ]}
      />
      <Txt style={doctorStyles.muted}>พบ {medications.length} รายการ</Txt>
      {loading ? (
        <Empty text="กำลังโหลดรายการยา..." />
      ) : medications.length ? (
        medications.map((item) => (
          <MedicationCard
            key={item.id}
            medication={item}
            showPatient={!patientId}
          />
        ))
      ) : (
        <Empty text="ไม่มีรายการยาในหมวดนี้" />
      )}
    </Page>
  );
}
