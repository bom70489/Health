import React, { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, Empty, Page, Txt } from "@/src/components/ui";
import {
  AppointmentCard,
  Choice,
  MedicationCard,
  ProfileCard,
  doctorStyles,
} from "@/src/components/doctor/DoctorCommon";
import { useApp } from "@/src/providers/AppProvider";
import { bangkokTime, thaiDate } from "@/src/domain/dateTime";

export default function PatientScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { data, now, loading } = useApp();
  const [tab, setTab] = useState<
    "overview" | "appointments" | "medications" | "history"
  >("overview");
  const patient = data.profiles.find(
    (profile) => profile.id === params.id && profile.role === "patient",
  );
  if (!patient)
    return (
      <Page title="ข้อมูลผู้ป่วย" back>
        <Empty
          text={
            loading
              ? "กำลังโหลดข้อมูล..."
              : "ไม่พบผู้ป่วย หรือคุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้"
          }
        />
      </Page>
    );
  const appointments = data.appointments
    .filter((item) => item.patientId === patient.id)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const upcoming = appointments.filter(
    (item) =>
      item.status === "scheduled" &&
      new Date(item.scheduledAt).getTime() >= now.getTime(),
  );
  const medications = data.medications.filter(
    (item) => item.patientId === patient.id,
  );
  const active = medications.filter((item) => item.isActive);
  const confirmations = data.confirmations
    .filter((item) => item.patientId === patient.id)
    .sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt));
  return (
    <Page title="ข้อมูลผู้ป่วย" subtitle="ข้อมูลจากรายการที่แพทย์บันทึก" back>
      <ProfileCard profile={patient} />
      <Choice
        label="ดูข้อมูล"
        value={tab}
        onChange={setTab}
        options={[
          { value: "overview", label: "ภาพรวม" },
          { value: "appointments", label: "นัดหมาย" },
          { value: "medications", label: "ยา" },
          { value: "history", label: "ประวัติ" },
        ]}
      />
      <View style={doctorStyles.stack}>
        <Button
          label="+ เพิ่มนัดหมาย"
          onPress={() =>
            router.push({
              pathname: "/account/doctor/appointment",
              params: { patientId: patient.id },
            })
          }
          testID="add-appointment"
        />
        <Button
          label="+ เพิ่มรายการยา"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/account/doctor/medication",
              params: { patientId: patient.id },
            })
          }
          testID="add-medication"
        />
      </View>
      {tab === "overview" ? (
        <>
          <Card>
            <View style={doctorStyles.stack}>
              <Txt style={doctorStyles.section}>ข้อมูลทั่วไป</Txt>
              <Txt style={doctorStyles.body}>
                โทรศัพท์: {patient.phone || "ยังไม่ได้ระบุ"}
              </Txt>
              <Txt style={doctorStyles.body}>
                ผู้ติดต่อฉุกเฉิน: {patient.emergencyContact || "ยังไม่ได้ระบุ"}
              </Txt>
              <Txt style={doctorStyles.body}>
                ข้อมูลการแพ้ยา: {patient.allergyNote || "ยังไม่ได้บันทึกข้อมูล"}
              </Txt>
            </View>
          </Card>
          <Txt style={doctorStyles.section}>
            นัดหมายที่จะถึง ({upcoming.length})
          </Txt>
          {upcoming.length ? (
            upcoming
              .slice(0, 2)
              .map((item) => (
                <AppointmentCard key={item.id} appointment={item} />
              ))
          ) : (
            <Empty text="ยังไม่มีนัดหมายที่จะถึง" />
          )}
          <Button
            label="ดูนัดหมายทั้งหมด"
            variant="secondary"
            onPress={() => setTab("appointments")}
          />
          <Txt style={doctorStyles.section}>
            ยาที่ใช้งานอยู่ ({active.length})
          </Txt>
          {active.length ? (
            active
              .slice(0, 2)
              .map((item) => <MedicationCard key={item.id} medication={item} />)
          ) : (
            <Empty text="ยังไม่มีรายการยาที่ใช้งานอยู่" />
          )}
          <Button
            label="ดูรายการยาทั้งหมด"
            variant="secondary"
            onPress={() => setTab("medications")}
          />
        </>
      ) : null}
      {tab === "appointments" ? (
        <>
          <Txt style={doctorStyles.section}>
            นัดหมายทั้งหมด ({appointments.length})
          </Txt>
          {appointments.length ? (
            appointments.map((item) => (
              <AppointmentCard key={item.id} appointment={item} />
            ))
          ) : (
            <Empty text="ยังไม่มีนัดหมาย กดเพิ่มนัดหมายเพื่อบันทึก" />
          )}
        </>
      ) : null}
      {tab === "medications" ? (
        <>
          <Txt style={doctorStyles.section}>
            รายการยาทั้งหมด ({medications.length})
          </Txt>
          {medications.length ? (
            medications.map((item) => (
              <MedicationCard key={item.id} medication={item} />
            ))
          ) : (
            <Empty text="ยังไม่มีรายการยา กดเพิ่มรายการยาเพื่อบันทึก" />
          )}
        </>
      ) : null}
      {tab === "history" ? (
        <>
          <Card>
            <Txt style={doctorStyles.muted}>
              แต่ละรายการแสดงฉบับและวันที่แก้ไขล่าสุด
              คำสั่งเก็บฉบับเดิมไว้เพื่อการตรวจสอบ
              การยืนยันยาคือข้อมูลที่ผู้ป่วยรายงานเอง
            </Txt>
          </Card>
          <Txt style={doctorStyles.section}>รายการสิ้นสุด / ยกเลิก</Txt>
          {appointments
            .filter(
              (item) =>
                item.status !== "scheduled" ||
                new Date(item.scheduledAt).getTime() < now.getTime(),
            )
            .map((item) => (
              <AppointmentCard key={item.id} appointment={item} />
            ))}
          {medications
            .filter((item) => !item.isActive)
            .map((item) => (
              <MedicationCard key={item.id} medication={item} />
            ))}
          <Txt style={doctorStyles.section}>
            ประวัติการยืนยันยา ({confirmations.length})
          </Txt>
          {confirmations.length ? (
            confirmations.slice(0, 30).map((item) => {
              const medicine = medications.find(
                (plan) => plan.id === item.medicationPlanId,
              );
              return (
                <Card key={item.occurrenceKey}>
                  <View style={doctorStyles.stack}>
                    <Txt style={doctorStyles.body}>
                      {medicine?.medicineName ?? "รายการยา"} • ฉบับที่{" "}
                      {item.medicationPlanVersion}
                    </Txt>
                    <Txt style={doctorStyles.muted}>
                      กำหนด {thaiDate(item.scheduledAt)}{" "}
                      {bangkokTime(item.scheduledAt)} น.
                    </Txt>
                    <Txt style={doctorStyles.muted}>
                      ผู้ป่วยยืนยัน {thaiDate(item.confirmedAt)}{" "}
                      {bangkokTime(item.confirmedAt)} น.
                    </Txt>
                    {item.correctedAt ? (
                      <Txt style={doctorStyles.muted}>
                        แก้ไขการยืนยันเมื่อ {thaiDate(item.correctedAt)}{" "}
                        {bangkokTime(item.correctedAt)} น.
                      </Txt>
                    ) : null}
                  </View>
                </Card>
              );
            })
          ) : (
            <Empty text="ยังไม่มีประวัติการยืนยันรับประทานยา" />
          )}
        </>
      ) : null}
    </Page>
  );
}
