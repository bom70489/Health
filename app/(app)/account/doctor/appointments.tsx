import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Empty, Field, Page, Txt } from "@/src/components/ui";
import {
  AppointmentCard,
  Choice,
  doctorStyles,
} from "@/src/components/doctor/DoctorCommon";
import { useApp } from "@/src/providers/AppProvider";

export default function AppointmentsScreen() {
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const { data, now, loading } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"upcoming" | "all" | "cancelled">(
    "upcoming",
  );
  const appointments = data.appointments
    .filter((item) => {
      if (patientId && item.patientId !== patientId) return false;
      if (
        filter === "upcoming" &&
        (item.status !== "scheduled" ||
          new Date(item.scheduledAt).getTime() < now.getTime())
      )
        return false;
      if (filter === "cancelled" && item.status !== "cancelled") return false;
      const patient = data.profiles.find(
        (profile) => profile.id === item.patientId,
      );
      return `${item.title} ${patient?.displayName ?? ""} ${patient?.patientNumber ?? ""}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase());
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return (
    <Page title="จัดการนัดหมาย" subtitle="นัดที่บันทึกให้ผู้ป่วยของคุณ" back>
      <Button
        label="+ เพิ่มนัดหมาย"
        onPress={() =>
          router.push({
            pathname: "/account/doctor/appointment",
            params: patientId ? { patientId } : {},
          })
        }
      />
      <Field
        label="ค้นหานัดหมาย"
        placeholder="ชื่อผู้ป่วย HN หรือประเภทนัด"
        value={query}
        onChangeText={setQuery}
      />
      <Choice
        label="รายการที่แสดง"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "upcoming", label: "นัดที่จะถึง" },
          { value: "all", label: "ทั้งหมด" },
          { value: "cancelled", label: "ยกเลิกแล้ว" },
        ]}
      />
      <Txt style={doctorStyles.muted}>พบ {appointments.length} รายการ</Txt>
      {loading ? (
        <Empty text="กำลังโหลดนัดหมาย..." />
      ) : appointments.length ? (
        appointments.map((item) => (
          <AppointmentCard
            key={item.id}
            appointment={item}
            showPatient={!patientId}
          />
        ))
      ) : (
        <Empty text="ไม่มีนัดหมายในรายการนี้" />
      )}
    </Page>
  );
}
