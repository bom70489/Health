import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Card,
  Empty,
  Field,
  Page,
  Txt,
  colors,
} from "@/src/components/ui";
import { doctorStyles } from "@/src/components/doctor/DoctorCommon";
import { useApp } from "@/src/providers/AppProvider";

export default function PatientsScreen() {
  const { data, loading, mode, refresh } = useApp();
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase();
  const assigned = data.profiles.filter(
    (profile) => profile.role === "patient",
  );
  const patients = assigned.filter((profile) =>
    `${profile.displayName} ${profile.patientNumber ?? ""}`
      .toLocaleLowerCase()
      .includes(search),
  );
  return (
    <Page
      title="จัดการผู้ป่วย"
      subtitle="เฉพาะผู้ป่วยที่ได้รับมอบหมายให้คุณ"
      back
    >
      <Field
        label="ค้นหาผู้ป่วย"
        placeholder="ค้นหาชื่อผู้ป่วย หรือ HN"
        value={query}
        onChangeText={setQuery}
        testID="patient-search"
      />
      <Txt style={doctorStyles.muted}>
        พบ {patients.length} จาก {assigned.length} คน
      </Txt>
      {loading ? (
        <Empty text="กำลังโหลดผู้ป่วย..." />
      ) : patients.length ? (
        patients.map((patient) => (
          <Pressable
            key={patient.id}
            accessibilityRole="button"
            accessibilityLabel={`จัดการผู้ป่วย ${patient.displayName}`}
            onPress={() =>
              router.push({
                pathname: "/account/doctor/patient",
                params: { id: patient.id },
              })
            }
            testID={`patient-${patient.id}`}
          >
            <Card>
              <View style={doctorStyles.row}>
                <View style={doctorStyles.avatar}>
                  <Txt style={{ color: colors.primary, fontSize: 25 }}>
                    {patient.displayName.slice(0, 1)}
                  </Txt>
                </View>
                <View style={{ flex: 1, minWidth: 100, gap: 4 }}>
                  <Txt style={doctorStyles.title}>{patient.displayName}</Txt>
                  <Txt style={doctorStyles.muted}>
                    HN {patient.patientNumber || "ยังไม่ได้ระบุ"}
                  </Txt>
                  {patient.age ? (
                    <Txt style={doctorStyles.muted}>อายุ {patient.age} ปี</Txt>
                  ) : null}
                </View>
                <Txt style={{ color: colors.primary, fontSize: 24 }}>›</Txt>
              </View>
            </Card>
          </Pressable>
        ))
      ) : (
        <Empty
          text={
            query
              ? "ไม่พบผู้ป่วยที่ตรงกับคำค้น ลองค้นหาชื่อหรือ HN อีกครั้ง"
              : "ยังไม่มีผู้ป่วยที่ได้รับมอบหมาย กรุณาติดต่อผู้ดูแลระบบ"
          }
        />
      )}
      <Card>
        <Txt style={doctorStyles.muted}>
          {mode === "demo"
            ? "ผู้ป่วยในหน้านี้เป็นบัญชีสมมติที่เตรียมไว้สำหรับสาธิต"
            : "การเพิ่มและมอบหมายผู้ป่วยดำเนินการโดยผู้ดูแลระบบ"}{" "}
          การลงทะเบียนผู้ป่วยใหม่จะเพิ่มในระยะถัดไป
        </Txt>
      </Card>
      <Button
        label="โหลดข้อมูลล่าสุด"
        variant="secondary"
        loading={loading}
        onPress={() => {
          void refresh();
        }}
      />
    </Page>
  );
}
