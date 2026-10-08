import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Card,
  ErrorText,
  Page,
  Txt,
  colors,
} from "@/src/components/ui";
import {
  ProfileCard,
  doctorStyles,
} from "@/src/components/doctor/DoctorCommon";
import { useApp } from "@/src/providers/AppProvider";

export default function AccountScreen() {
  const { user, mode, busy, logout, data } = useApp();
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;
  const signOut = async () => {
    try {
      setError(null);
      await logout();
      router.replace("/login");
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "ออกจากระบบไม่สำเร็จ กรุณาลองใหม่",
      );
    }
  };
  return (
    <Page
      title="บัญชีของฉัน"
      subtitle={
        user.role === "doctor"
          ? "จัดการผู้ป่วยและข้อมูลการรักษา"
          : "ข้อมูลของคุณและการตั้งค่าการใช้งาน"
      }
    >
      <ProfileCard profile={user} />
      {user.role === "doctor" ? (
        <>
          <Txt style={doctorStyles.section}>งานสำหรับแพทย์</Txt>
          <Card>
            <View style={doctorStyles.stack}>
              <Txt style={doctorStyles.muted}>
                ผู้ป่วยที่ได้รับมอบหมาย{" "}
                {
                  data.profiles.filter((profile) => profile.role === "patient")
                    .length
                }{" "}
                คน
              </Txt>
              <Button
                label="จัดการผู้ป่วย  ›"
                onPress={() => router.push("/account/doctor/patients")}
                testID="manage-patients"
              />
              <Button
                label="จัดการนัดหมาย  ›"
                variant="secondary"
                onPress={() => router.push("/account/doctor/appointments")}
              />
              <Button
                label="จัดการยาและคำสั่งรักษา  ›"
                variant="secondary"
                onPress={() => router.push("/account/doctor/medications")}
              />
            </View>
          </Card>
        </>
      ) : null}
      <Card>
        <View style={doctorStyles.stack}>
          <Button
            label="ข้อมูลส่วนตัวและข้อมูลติดต่อ  ›"
            variant="secondary"
            onPress={() => router.push("/account/profile")}
          />
          <Button
            label="การแจ้งเตือนและขนาดตัวอักษร  ›"
            variant="secondary"
            onPress={() => router.push("/account/preferences")}
          />
          <Txt style={doctorStyles.muted}>ภาษา: ไทย</Txt>
        </View>
      </Card>
      {mode === "demo" ? (
        <Card style={{ backgroundColor: colors.soft }}>
          <View style={doctorStyles.stack}>
            <Txt style={doctorStyles.title}>โหมดสาธิต</Txt>
            <Txt style={doctorStyles.muted}>
              บัญชีและข้อมูลทั้งหมดเป็นข้อมูลสมมติสำหรับทดสอบ
              สามารถสลับแพทย์และผู้ป่วยโดยเก็บข้อมูลที่บันทึกไว้
            </Txt>
            <Button
              label="สลับบัญชีสาธิต / รีเซ็ตข้อมูล  ›"
              variant="secondary"
              onPress={() => router.push("/account/preferences")}
            />
          </View>
        </Card>
      ) : null}
      <ErrorText text={error} />
      <Button
        label="ออกจากระบบ"
        variant="danger"
        loading={busy}
        disabled={busy}
        onPress={signOut}
      />
    </Page>
  );
}
