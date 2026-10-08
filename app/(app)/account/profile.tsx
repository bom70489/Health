import React from "react";
import { View } from "react-native";
import { Card, Page, Txt } from "@/src/components/ui";
import {
  ProfileCard,
  doctorStyles,
} from "@/src/components/doctor/DoctorCommon";
import { useApp } from "@/src/providers/AppProvider";

export default function ProfileScreen() {
  const { user } = useApp();
  if (!user) return null;
  return (
    <Page
      title="ข้อมูลส่วนตัว"
      subtitle="ข้อมูลบัญชีที่ได้รับการลงทะเบียน"
      back
    >
      <ProfileCard profile={user} editable />
      <Card>
        <View style={doctorStyles.stack}>
          <Txt style={doctorStyles.section}>ข้อมูลติดต่อ</Txt>
          <Txt style={doctorStyles.body}>
            โทรศัพท์: {user.phone || "ยังไม่ได้ระบุ"}
          </Txt>
          <Txt style={doctorStyles.body}>
            โรงพยาบาล: {user.hospitalName || "ยังไม่ได้ระบุ"}
          </Txt>
          {user.role === "doctor" ? (
            <Txt style={doctorStyles.body}>
              แผนก: {user.department || "ยังไม่ได้ระบุ"}
            </Txt>
          ) : (
            <>
              <Txt style={doctorStyles.body}>
                ผู้ติดต่อฉุกเฉิน: {user.emergencyContact || "ยังไม่ได้ระบุ"}
              </Txt>
              <Txt style={doctorStyles.body}>
                ข้อมูลการแพ้ยาที่บันทึก:{" "}
                {user.allergyNote || "ยังไม่ได้บันทึกข้อมูล"}
              </Txt>
            </>
          )}
        </View>
      </Card>
      <Card>
        <Txt style={doctorStyles.muted}>
          ข้อมูลส่วนนี้แสดงเพื่ออ่าน หากต้องการแก้ไขข้อมูลบัญชี
          กรุณาติดต่อเจ้าหน้าที่ผู้ดูแล ไม่สามารถเปลี่ยนสิทธิ์บัญชีจากหน้านี้ได้
        </Txt>
      </Card>
    </Page>
  );
}
